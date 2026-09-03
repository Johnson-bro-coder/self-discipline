-- ==============================================================================
-- 好友共同自律與公費懲罰系統 - Supabase 初始化腳本 (Cyberpunk 重構版)
-- 架構：UUID 主鍵、可動態修改 Username / Avatar、群組共同目標表、月結帳單與結算排程
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 1. 使用者個人資料表 (UUID 主鍵，支援自訂修改 Username 與 Avatar)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    avatar_url TEXT NOT NULL DEFAULT '',
    total_paid_fine INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 群組共同目標表 (可動態修改目標名稱與金額)
CREATE TABLE IF NOT EXISTS public.group_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    goal_name TEXT NOT NULL DEFAULT '日本古民家買房基金',
    goal_amount INTEGER NOT NULL DEFAULT 15000,
    cover_photo TEXT NOT NULL DEFAULT '/photos/B8EBBDE1-DDEE-4F89-A34C-1922E6CB1875.jpg',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- 3. 常駐每日必做模板表 (隨時可修改，每日跨夜自動保留項目並重置打卡狀態)
CREATE TABLE IF NOT EXISTS public.daily_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 任務表 (Tasks - 包含 daily / weekly / routine，支援隨時修改 title)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE,
    routine_id UUID REFERENCES public.daily_routines(id) ON UPDATE CASCADE ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('daily', 'weekly', 'routine')),
    day_of_week TEXT CHECK (day_of_week IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun') OR day_of_week IS NULL),
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    proof_url TEXT,
    is_skipped BOOLEAN NOT NULL DEFAULT FALSE,
    skip_reason TEXT,
    target_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'failed', 'settled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 月結帳單表 (Monthly Bills)
CREATE TABLE IF NOT EXISTS public.monthly_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE,
    billing_month DATE NOT NULL,
    failed_tasks_count INTEGER NOT NULL DEFAULT 0,
    fine_amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, target_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_routine ON public.tasks(routine_id);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_user ON public.monthly_bills(user_id, billing_month);

-- 6. 啟用 RLS 與存取規則 (允許 anon 角色讀寫)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all group_settings" ON public.group_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all daily_routines" ON public.daily_routines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all monthly_bills" ON public.monthly_bills FOR ALL USING (true) WITH CHECK (true);

-- 6. 初始化預設群組目標
INSERT INTO public.group_settings (id, goal_name, goal_amount, cover_photo)
VALUES (1, '日本古民家買房基金', 15000, '/photos/B8EBBDE1-DDEE-4F89-A34C-1922E6CB1875.jpg')
ON CONFLICT (id) DO NOTHING;

-- 8. 初始化預設三位成員 (罰金全部歸零，乾淨初始化)
INSERT INTO public.profiles (id, username, avatar_url, total_paid_fine)
VALUES 
    ('11111111-1111-4111-8111-111111111111', 'Johnson', '/photos/IMG_0700.JPG', 0),
    ('22222222-2222-4222-8222-222222222222', 'nigga', '/photos/IMG_0774.JPG', 0),
    ('33333333-3333-4333-8333-333333333333', 'shorty', '/photos/IMG_0980.JPG', 0)
ON CONFLICT (id) DO UPDATE 
SET total_paid_fine = EXCLUDED.total_paid_fine;

-- 8. Supabase Storage: task-proofs 儲存桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-proofs', 'task-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Task Proofs" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'task-proofs');

CREATE POLICY "Public Upload Task Proofs" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'task-proofs');

CREATE POLICY "Public Update Task Proofs" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'task-proofs');

-- 9. 自動化月結算函數 (每月 1 號 00:00 執行)
CREATE OR REPLACE FUNCTION public.monthly_settlement_audit()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    u RECORD;
    v_last_month_start DATE;
    v_this_month_start DATE;
    v_failed_cnt INT;
    v_penalty_amount INT;
BEGIN
    -- 以台北時間計算上個月初與本月初
    v_this_month_start := date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'))::DATE;
    v_last_month_start := (v_this_month_start - INTERVAL '1 month')::DATE;

    -- 步驟 1: 掃描上個月 pending 且未完成、未豁免的任務，統一標記為 failed
    UPDATE public.tasks
    SET status = 'failed'
    WHERE target_date >= v_last_month_start
      AND target_date < v_this_month_start
      AND status = 'pending'
      AND is_completed = FALSE
      AND is_skipped = FALSE;

    -- 步驟 2: 計算每位使用者上個月的失敗任務總數，產出月結帳單並累加至 profiles
    FOR u IN SELECT id, username FROM public.profiles LOOP
        SELECT COUNT(*) INTO v_failed_cnt
        FROM public.tasks
        WHERE user_id = u.id
          AND target_date >= v_last_month_start
          AND target_date < v_this_month_start
          AND status = 'failed';

        v_penalty_amount := v_failed_cnt * 100;

        -- 寫入月結帳單 (若無帳單才新增，避免重複結算)
        INSERT INTO public.monthly_bills (
            user_id,
            billing_month,
            failed_tasks_count,
            fine_amount
        )
        VALUES (
            u.id,
            v_last_month_start,
            v_failed_cnt,
            v_penalty_amount
        );

        -- 累加已結算罰金至個人資料庫
        IF v_penalty_amount > 0 THEN
            UPDATE public.profiles
            SET total_paid_fine = total_paid_fine + v_penalty_amount
            WHERE id = u.id;
        END IF;

        -- 步驟 3: 將上個月的所有任務狀態轉為 settled
        UPDATE public.tasks
        SET status = 'settled'
        WHERE user_id = u.id
          AND target_date >= v_last_month_start
          AND target_date < v_this_month_start;
    END LOOP;
END;
$$;

-- 10. pg_cron 排程：每月 1 號台灣時間午夜 00:00 (UTC 前一日 16:00) 執行
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'monthly_settlement_audit';

SELECT cron.schedule(
    'monthly_settlement_audit',
    '0 16 28-31 * *', -- 每月最後一天 UTC 16:00 (即台灣時間次月 1 號 00:00)
    'SELECT public.monthly_settlement_audit();'
);

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
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_bills_user_month ON public.monthly_bills(user_id, billing_month);

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
-- 規則：
-- 1. 當日任務以及常駐每日必做有任一個沒完成（無論幾個）該日均只罰 100 元
-- 2. 明日預排序列未在規定時間內排完 (不足 2 項) 該日亦罰 100 元
-- 3. 具備防重入檢查 (Idempotent)，若該月帳單已歸檔則不會重複扣款
CREATE OR REPLACE FUNCTION public.monthly_settlement_audit()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    u RECORD;
    v_last_month_start DATE;
    v_this_month_start DATE;
    v_curr_date DATE;
    v_daily_failed_days INT;
    v_preplan_failed_days INT;
    v_total_violations INT;
    v_penalty_amount INT;
    v_day_uncompleted_cnt INT;
    v_tomorrow_plan_cnt INT;
    v_already_settled BOOLEAN;
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

    -- 步驟 2: 遍歷每位成員，按「天」結算違規 (當日有任何任務未完成罰 100；預排不足 2 項罰 100)
    FOR u IN SELECT id, username FROM public.profiles LOOP
        -- 防重複檢查：若該使用者上月帳單已歸檔過，則跳過避免重複累加
        SELECT EXISTS(
            SELECT 1 FROM public.monthly_bills
            WHERE user_id = u.id AND billing_month = v_last_month_start
        ) INTO v_already_settled;

        IF NOT v_already_settled THEN
            v_daily_failed_days := 0;
            v_preplan_failed_days := 0;

            v_curr_date := v_last_month_start;
            WHILE v_curr_date < v_this_month_start LOOP
                -- A. 當日任務與常駐必做是否有任一未完成且未豁免 (無論幾個均算 1 次違規)
                SELECT COUNT(*) INTO v_day_uncompleted_cnt
                FROM public.tasks
                WHERE user_id = u.id
                  AND target_date = v_curr_date
                  AND category IN ('daily', 'routine')
                  AND status = 'failed';

                IF v_day_uncompleted_cnt > 0 THEN
                    v_daily_failed_days := v_daily_failed_days + 1;
                END IF;

                -- B. 當日針對隔日之預排是否不足 2 項 (不足 2 項算 1 次違規)
                SELECT COUNT(*) INTO v_tomorrow_plan_cnt
                FROM public.tasks
                WHERE user_id = u.id
                  AND target_date = (v_curr_date + INTERVAL '1 day')::DATE
                  AND category = 'daily';

                IF v_tomorrow_plan_cnt < 2 THEN
                    v_preplan_failed_days := v_preplan_failed_days + 1;
                END IF;

                v_curr_date := v_curr_date + INTERVAL '1 day';
            END LOOP;

            v_total_violations := v_daily_failed_days + v_preplan_failed_days;
            v_penalty_amount := v_total_violations * 100;

            -- 寫入月結帳單
            INSERT INTO public.monthly_bills (
                user_id,
                billing_month,
                failed_tasks_count,
                fine_amount
            )
            VALUES (
                u.id,
                v_last_month_start,
                v_total_violations,
                v_penalty_amount
            )
            ON CONFLICT (user_id, billing_month) DO UPDATE
            SET failed_tasks_count = EXCLUDED.failed_tasks_count,
                fine_amount = EXCLUDED.fine_amount;

            -- 累加已結算罰金至個人歷史紀錄
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
        END IF;
    END LOOP;
END;
$$;

-- 10. 判斷是否為每月 1 號的檢查排程函數
CREATE OR REPLACE FUNCTION public.check_and_run_monthly_settlement()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 判斷台灣時間當日是否為 1 號
    IF EXTRACT(DAY FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei')) = 1 THEN
        PERFORM public.monthly_settlement_audit();
    END IF;
END;
$$;

-- 11. pg_cron 排程：每天台灣時間午夜 00:00 (UTC 16:00) 執行檢查，若為每月 1 號則自動歸檔月結帳單
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'monthly_settlement_audit';
        PERFORM cron.schedule(
            'monthly_settlement_audit',
            '0 16 * * *', -- 每天 UTC 16:00 (台灣時間次日 00:00) 執行檢查，遇 1 號自動歸檔
            'SELECT public.check_and_run_monthly_settlement();'
        );
    END IF;
END $$;

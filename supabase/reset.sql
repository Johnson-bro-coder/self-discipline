-- ==============================================================================
-- 好友共同自律與公費懲罰系統 - 一鍵資料庫初始化腳本
-- 執行後將徹底清空所有任務、每日必做、歷史月結帳單，並將所有成員罰金全數歸零
-- ==============================================================================

-- 1. 清空所有任務 (tasks)
TRUNCATE TABLE public.tasks CASCADE;

-- 2. 清空所有每日必做常駐模板 (daily_routines)
TRUNCATE TABLE public.daily_routines CASCADE;

-- 3. 清空所有歷史月結帳單 (monthly_bills)
TRUNCATE TABLE public.monthly_bills CASCADE;

-- 4. 重置所有成員累計已繳罰金為 0
UPDATE public.profiles
SET total_paid_fine = 0;

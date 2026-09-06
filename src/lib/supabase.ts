import { createClient } from '@supabase/supabase-js';
import { Profile, Task, GroupSettings, MonthlyBill, DailyRoutine } from '../types/database';
import {
  DEFAULT_PROFILES,
  DEFAULT_GROUP_SETTINGS,
  DEFAULT_ROUTINES,
  DEFAULT_MONTHLY_BILLS,
  generateInitialMockTasks,
  getTodayDateStr,
} from './mockData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    !!supabaseUrl &&
    !!supabaseAnonKey &&
    !supabaseUrl.includes('your-project.supabase.co') &&
    supabaseUrl.startsWith('https://')
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// LocalStorage 鍵名 (升級為 v5 以完全重置為 0 罰金與 0 任務乾淨狀態)
const STORAGE_KEY_PROFILES = 'cyber_discipline_profiles_v5';
const STORAGE_KEY_GROUP = 'cyber_discipline_group_settings_v5';
const STORAGE_KEY_ROUTINES = 'cyber_discipline_routines_v5';
const STORAGE_KEY_TASKS = 'cyber_discipline_tasks_v5';
const STORAGE_KEY_BILLS = 'cyber_discipline_monthly_bills_v5';

export const clearLegacyStorage = () => {
  try {
    for (let i = 1; i <= 4; i++) {
      localStorage.removeItem(`cyber_discipline_profiles_v${i}`);
      localStorage.removeItem(`cyber_discipline_group_settings_v${i}`);
      localStorage.removeItem(`cyber_discipline_routines_v${i}`);
      localStorage.removeItem(`cyber_discipline_tasks_v${i}`);
      localStorage.removeItem(`cyber_discipline_monthly_bills_v${i}`);
    }
  } catch (e) {
    // ignore
  }
};

// 載入時自動清理舊版快取
clearLegacyStorage();

// -------------------------------------------------------------
// 1. Profile 存取與修改
// -------------------------------------------------------------
export const getProfiles = async (): Promise<Profile[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at');
      if (error) throw error;
      if (data && data.length > 0) return data as Profile[];
    } catch (err) {
      console.warn('Supabase profiles fetch error, using local fallback', err);
    }
  }

  const cached = localStorage.getItem(STORAGE_KEY_PROFILES);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
  }

  // 嘗試從舊版本保留使用者的 username 與 avatar_url，但將 total_paid_fine 強制初始化為 0
  let initial = DEFAULT_PROFILES;
  const legacyKey =
    localStorage.getItem('cyber_discipline_profiles_v4') ||
    localStorage.getItem('cyber_discipline_profiles_v3');
  if (legacyKey) {
    try {
      const parsed = JSON.parse(legacyKey);
      if (Array.isArray(parsed) && parsed.length > 0) {
        initial = DEFAULT_PROFILES.map((dp) => {
          const matched = parsed.find((p: Profile) => p.id === dp.id);
          return matched
            ? {
                ...dp,
                username: matched.username || dp.username,
                avatar_url: matched.avatar_url || dp.avatar_url,
                total_paid_fine: 0,
              }
            : dp;
        });
      }
    } catch (e) {
      // ignore
    }
  }

  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(initial));
  return initial;
};

export const updateProfile = async (
  userId: string,
  updates: Partial<Pick<Profile, 'username' | 'avatar_url'>>
): Promise<boolean> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase profile update error, saving locally', err);
    }
  }

  const profiles = await getProfiles();
  const updated = profiles.map((p) => (p.id === userId ? { ...p, ...updates } : p));
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updated));
  return true;
};

// -------------------------------------------------------------
// 2. Group Settings 共同目標存取與修改
// -------------------------------------------------------------
export const getGroupSettings = async (): Promise<GroupSettings> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('group_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      if (data) return data as GroupSettings;
    } catch (err) {
      console.warn('Supabase group_settings fetch error, using local fallback', err);
    }
  }

  const cached = localStorage.getItem(STORAGE_KEY_GROUP);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
  }
  localStorage.setItem(STORAGE_KEY_GROUP, JSON.stringify(DEFAULT_GROUP_SETTINGS));
  return DEFAULT_GROUP_SETTINGS;
};

export const updateGroupSettings = async (
  updates: Partial<Pick<GroupSettings, 'goal_name' | 'goal_amount' | 'cover_photo'>>
): Promise<boolean> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from('group_settings').update(updates).eq('id', 1);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase group_settings update error, saving locally', err);
    }
  }

  const current = await getGroupSettings();
  const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY_GROUP, JSON.stringify(updated));
  return true;
};

// -------------------------------------------------------------
// 2.5 Daily Routines 常駐每日必做序列 (隨時可修改，每日只刷新打卡完成狀態)
// -------------------------------------------------------------
export const getDailyRoutines = async (userId?: string): Promise<DailyRoutine[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from('daily_routines').select('*').order('created_at', { ascending: true });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length > 0) return data as DailyRoutine[];
    } catch (err) {
      console.warn('Supabase routines fetch error, using local fallback', err);
    }
  }

  const cached = localStorage.getItem(STORAGE_KEY_ROUTINES);
  let list: DailyRoutine[] = [];
  if (cached) {
    try {
      list = JSON.parse(cached);
    } catch (e) {
      // ignore
    }
  } else {
    list = DEFAULT_ROUTINES;
    localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(list));
  }

  if (userId) {
    return list.filter((r) => r.user_id === userId);
  }
  return list;
};

export const createDailyRoutine = async (userId: string, title: string): Promise<DailyRoutine> => {
  const newRoutine: DailyRoutine = {
    id: 'routine_' + Math.random().toString(36).substring(2, 9),
    user_id: userId,
    title,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('daily_routines').insert([{
        user_id: userId,
        title,
      }]).select().single();
      if (error) throw error;
      if (data) {
        newRoutine.id = data.id;
      }
    } catch (err) {
      console.warn('Supabase insert routine error, saving locally', err);
    }
  }

  // 存入本機常駐清單
  const routines = await getDailyRoutines();
  const updated = [...routines, newRoutine];
  localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(updated));

  // 同步在今日產生對應的打卡任務
  const today = getTodayDateStr();
  await createTask({
    user_id: userId,
    routine_id: newRoutine.id,
    title,
    category: 'routine',
    is_completed: false,
    is_skipped: false,
    target_date: today,
    status: 'pending',
  });

  return newRoutine;
};

export const updateDailyRoutine = async (routineId: string, newTitle: string): Promise<boolean> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('daily_routines').update({ title: newTitle }).eq('id', routineId);
      // 同步更新未完成的任務名稱
      await supabase.from('tasks').update({ title: newTitle }).eq('routine_id', routineId);
    } catch (err) {
      console.warn('Supabase update routine error, saving locally', err);
    }
  }

  const routines = await getDailyRoutines();
  const updatedRoutines = routines.map((r) => (r.id === routineId ? { ...r, title: newTitle } : r));
  localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(updatedRoutines));

  // 同步更新今日 tasks 中的 title
  const tasks = await getTasks();
  const updatedTasks = tasks.map((t) => (t.routine_id === routineId ? { ...t, title: newTitle } : t));
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updatedTasks));

  return true;
};

export const removeDailyRoutine = async (routineId: string): Promise<boolean> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('daily_routines').delete().eq('id', routineId);
      await supabase.from('tasks').delete().eq('routine_id', routineId);
    } catch (err) {
      console.warn('Supabase delete routine error, deleting locally', err);
    }
  }

  const routines = await getDailyRoutines();
  const filteredRoutines = routines.filter((r) => r.id !== routineId);
  localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(filteredRoutines));

  // 同步刪除今日尚未打卡的 task
  const tasks = await getTasks();
  const filteredTasks = tasks.filter((t) => t.routine_id !== routineId);
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(filteredTasks));

  return true;
};

/**
 * 每日刷新機制：
 * 保留常駐每日必做清單的所有項目，只刷新當日打卡完成狀態 (is_completed = false, proof_url = null)
 */
export const ensureDailyRoutinesForDate = async (userId: string, targetDateStr: string): Promise<void> => {
  const userRoutines = await getDailyRoutines(userId);
  const currentTasks = await getTasks();

  const missingRoutines = userRoutines.filter((routine) => {
    return !currentTasks.some(
      (t) => t.user_id === userId && t.routine_id === routine.id && t.target_date === targetDateStr
    );
  });

  if (missingRoutines.length > 0) {
    for (const r of missingRoutines) {
      await createTask({
        user_id: userId,
        routine_id: r.id,
        title: r.title,
        category: 'routine',
        is_completed: false,
        is_skipped: false,
        target_date: targetDateStr,
        status: 'pending',
      });
    }
  }
};

// -------------------------------------------------------------
// 3. Tasks 任務存取、修改、打卡、豁免
// -------------------------------------------------------------
export const getTasks = async (): Promise<Task[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      if (data) return data as Task[];
    } catch (err) {
      console.warn('Supabase tasks fetch error, using local fallback', err);
    }
  }

  const cached = localStorage.getItem(STORAGE_KEY_TASKS);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
  }
  const initial = generateInitialMockTasks();
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(initial));
  return initial;
};

export const createTask = async (task: Omit<Task, 'id' | 'created_at'>): Promise<Task> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('tasks').insert([task]).select().single();
      if (error) throw error;
      if (data) return data as Task;
    } catch (err) {
      console.warn('Supabase task insert error, saving locally', err);
    }
  }

  const newTask: Task = {
    ...task,
    id: 'task_' + Math.random().toString(36).substring(2, 9),
    created_at: new Date().toISOString(),
  };
  const current = await getTasks();
  const updated = [...current, newTask];
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
  return newTask;
};

export const updateTaskTitle = async (taskId: string, newTitle: string): Promise<boolean> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from('tasks').update({ title: newTitle }).eq('id', taskId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase task title update error, saving locally', err);
    }
  }

  const current = await getTasks();
  const updated = current.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t));
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
  return true;
};

export const removeTask = async (taskId: string): Promise<boolean> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase task delete error, deleting locally', err);
    }
  }

  const current = await getTasks();
  const filtered = current.filter((t) => t.id !== taskId);
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(filtered));
  return true;
};

export const completeTaskWithProof = async (taskId: string, proofUrl: string): Promise<boolean> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_completed: true,
          proof_url: proofUrl,
          is_skipped: false,
        })
        .eq('id', taskId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase task completion error, updating locally', err);
    }
  }

  const current = await getTasks();
  const updated = current.map((t) =>
    t.id === taskId ? { ...t, is_completed: true, proof_url: proofUrl, is_skipped: false } : t
  );
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
  return true;
};

export const skipTaskWithReason = async (taskId: string, reason: string): Promise<boolean> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_skipped: true,
          skip_reason: reason,
          is_completed: false,
        })
        .eq('id', taskId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase task skip error, updating locally', err);
    }
  }

  const current = await getTasks();
  const updated = current.map((t) =>
    t.id === taskId ? { ...t, is_skipped: true, skip_reason: reason, is_completed: false } : t
  );
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
  return true;
};

export const uploadProofToStorage = async (file: File): Promise<string> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `proofs/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('task-proofs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('task-proofs').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.warn('Supabase upload error, using DataURL fallback', err);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// -------------------------------------------------------------
// 4. Monthly Bills 月結帳單存取與結算
// -------------------------------------------------------------
export const getMonthlyBills = async (): Promise<MonthlyBill[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('monthly_bills').select('*').order('billing_month', { ascending: false });
      if (error) throw error;
      if (data) return data as MonthlyBill[];
    } catch (err) {
      console.warn('Supabase monthly_bills fetch error, using local fallback', err);
    }
  }

  const cached = localStorage.getItem(STORAGE_KEY_BILLS);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
  }
  localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(DEFAULT_MONTHLY_BILLS));
  return DEFAULT_MONTHLY_BILLS;
};

/**
 * 執行每月 1 號月結算：
 * 統整上月未打卡且未豁免的違規任務，產出月結帳單，累加至 profiles.total_paid_fine
 * 具備防重入檢查 (Idempotent)，若該月已結算且未帶 force 標記則不會重複扣款
 */
export const runMonthlySettlementRpc = async (
  force: boolean = false
): Promise<{ success: boolean; message: string }> => {
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const billingMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

  // 1. 優先嘗試執行 Supabase PostgreSQL RPC (由資料庫交易保證原子性)
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.rpc('monthly_settlement_audit');
      if (!error) {
        return {
          success: true,
          message: `Supabase 伺服器排程成功歸檔 ${billingMonthStr.slice(0, 7)} 月結帳單！`,
        };
      }
      console.warn('Supabase monthly_settlement_audit RPC returned error, using fallback logic', error);
    } catch (err) {
      console.warn('Supabase monthly_settlement_audit RPC error, running direct table fallback', err);
    }
  }

  // 2. 本地 / 直接資料表排程回退機制
  const profiles = await getProfiles();
  const tasks = await getTasks();
  const bills = await getMonthlyBills();

  if (tasks.length === 0) {
    return {
      success: true,
      message: '目前系統尚無任何任務記錄，無需結算。',
    };
  }

  // 檢查該月是否已歸檔過
  const alreadySettled = bills.some((b) => b.billing_month.startsWith(billingMonthStr.slice(0, 7)));
  if (alreadySettled && !force) {
    return {
      success: true,
      message: `${billingMonthStr.slice(0, 7)} 月結帳單先前已完成歸檔，未重複扣款。`,
    };
  }

  const newBills: MonthlyBill[] = [];
  let totalNewFine = 0;

  const updatedProfiles = profiles.map((p) => {
    // 找出上個月所有任務
    const userTasks = tasks.filter(
      (t) => t.user_id === p.id && t.target_date.startsWith(billingMonthStr.slice(0, 7))
    );
    
    // 取得所有任務的日期集合
    const targetDates = Array.from(new Set(userTasks.map((t) => t.target_date)));
    
    let dailyFailedDays = 0;
    let preplanFailedDays = 0;

    targetDates.forEach((dateStr) => {
      // 1. 檢查該日任務與常駐必做是否有任一未完成且未豁免 (無論幾個均算 1 次違規)
      const dayTasks = userTasks.filter(
        (t) => t.target_date === dateStr && (t.category === 'daily' || t.category === 'routine')
      );
      if (dayTasks.length > 0) {
        const hasUnfinished = dayTasks.some((t) => !t.is_completed && !t.is_skipped);
        if (hasUnfinished) {
          dailyFailedDays += 1;
        }
      }

      // 2. 檢查該日針對隔日的預排是否不足 2 項 (不足 2 項算 1 次違規)
      const [y, m, d] = dateStr.split('-').map(Number);
      const nextDate = new Date(y, m - 1, d + 1);
      const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      const nextDayPlans = tasks.filter(
        (t) => t.user_id === p.id && t.target_date === nextDateStr && t.category === 'daily'
      );
      if (nextDayPlans.length < 2) {
        preplanFailedDays += 1;
      }
    });

    const totalViolations = dailyFailedDays + preplanFailedDays;
    const fine = totalViolations * 100;
    totalNewFine += fine;

    newBills.push({
      id: 'bill_' + Math.random().toString(36).substring(2, 9),
      user_id: p.id,
      billing_month: billingMonthStr,
      failed_tasks_count: totalViolations,
      fine_amount: fine,
      created_at: new Date().toISOString(),
    });

    return {
      ...p,
      total_paid_fine: (p.total_paid_fine || 0) + fine,
    };
  });

  // 3. 若有連接 Supabase，將資料寫入雲端 tables
  if (isSupabaseConfigured() && supabase) {
    try {
      // 寫入 monthly_bills
      for (const bill of newBills) {
        await supabase.from('monthly_bills').insert({
          user_id: bill.user_id,
          billing_month: bill.billing_month,
          failed_tasks_count: bill.failed_tasks_count,
          fine_amount: bill.fine_amount,
        });
      }

      // 更新 profiles 罰金
      for (const p of updatedProfiles) {
        await supabase
          .from('profiles')
          .update({ total_paid_fine: p.total_paid_fine })
          .eq('id', p.id);
      }

      // 更新上月任務為 settled
      await supabase
        .from('tasks')
        .update({ status: 'settled' })
        .gte('target_date', billingMonthStr)
        .lt('target_date', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
    } catch (err) {
      console.warn('Error syncing monthly bills fallback to Supabase table:', err);
    }
  }

  // 4. 更新任務狀態為 settled
  const updatedTasks = tasks.map((t) => {
    if (t.target_date.startsWith(billingMonthStr.slice(0, 7))) {
      return {
        ...t,
        status: (t.is_completed || t.is_skipped ? 'settled' : 'failed') as Task['status'],
      };
    }
    return t;
  });

  const mergedBills = [...newBills, ...bills.filter((b) => !b.billing_month.startsWith(billingMonthStr.slice(0, 7)))];
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updatedProfiles));
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updatedTasks));
  localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(mergedBills));

  return {
    success: true,
    message: `月結算完成！已自動歸檔 ${billingMonthStr.slice(0, 7)} 月結帳單，共累計新增 $${totalNewFine} 元罰金至公費總池。`,
  };
};

/**
 * 自動檢查並歸檔歷史月結帳單：
 * 當今天日期在每月 1 號 (或歷史月份有未歸檔的資料) 時，自動執行結算歸檔
 */
export const checkAndAutoArchiveMonthlyBills = async (): Promise<{
  archived: boolean;
  message?: string;
}> => {
  try {
    const bills = await getMonthlyBills();
    const tasks = await getTasks();

    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // 檢查上個月是否已有歸檔帳單
    const isArchived = bills.some((b) => b.billing_month.startsWith(lastMonthPrefix));

    // 檢查上個月是否有任何相關任務
    const hasLastMonthTasks = tasks.some((t) => t.target_date.startsWith(lastMonthPrefix));

    // 如果上個月未歸檔，且今天為 1 號 (或者上個月有任務需要結算歸檔)
    if (!isArchived && (now.getDate() === 1 || hasLastMonthTasks)) {
      console.log(`[Auto-Archive] 檢測到 ${lastMonthPrefix} 帳單尚未歸檔，自動執行 1 號結算排程...`);
      const res = await runMonthlySettlementRpc(false);
      return { archived: res.success, message: res.message };
    }
  } catch (err) {
    console.warn('[Auto-Archive] 自動月結歸檔檢查異常:', err);
  }
  return { archived: false };
};

/**
 * 全部初始化所有任務、常駐必做、歷史帳單與罰款
 */
export const resetAllTasksAndFines = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. 若有 Supabase 連線，清空雲端資料庫
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('daily_routines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('monthly_bills').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('profiles').update({ total_paid_fine: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (cloudErr) {
        console.warn('Supabase cloud reset warning:', cloudErr);
      }
    }

    // 2. 本地 LocalStorage 清空與歸零
    const currentProfiles = await getProfiles();
    const cleanProfiles = currentProfiles.map((p) => ({
      ...p,
      total_paid_fine: 0,
    }));

    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(cleanProfiles));
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify([]));

    clearLegacyStorage();

    return { success: true, message: '所有任務、必做項目與罰金已全數初始化歸零！' };
  } catch (err: any) {
    console.error('Reset error:', err);
    return { success: false, message: err?.message || '初始化失敗' };
  }
};


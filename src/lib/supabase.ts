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

// LocalStorage 鍵名 (升級為 v4 以完全重置為 0 罰金與 0 任務乾淨狀態)
const STORAGE_KEY_PROFILES = 'cyber_discipline_profiles_v4';
const STORAGE_KEY_GROUP = 'cyber_discipline_group_settings_v4';
const STORAGE_KEY_ROUTINES = 'cyber_discipline_routines_v4';
const STORAGE_KEY_TASKS = 'cyber_discipline_tasks_v4';
const STORAGE_KEY_BILLS = 'cyber_discipline_monthly_bills_v4';

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
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(DEFAULT_PROFILES));
  return DEFAULT_PROFILES;
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
 */
export const runMonthlySettlementRpc = async (): Promise<{ success: boolean; message: string }> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.rpc('monthly_settlement_audit');
      if (!error) return { success: true, message: 'Supabase 月結算排程執行成功！' };
    } catch (err) {
      console.warn('Supabase monthly_settlement_audit RPC error, running local fallback', err);
    }
  }

  // 本地模擬月結算
  const profiles = await getProfiles();
  const tasks = await getTasks();
  const bills = await getMonthlyBills();

  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const billingMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

  const newBills: MonthlyBill[] = [];
  let totalNewFine = 0;

  const updatedProfiles = profiles.map((p) => {
    // 找出上個月所有任務
    const userTasks = tasks.filter((t) => t.user_id === p.id);
    
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
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      const nextDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const nextDayPlans = userTasks.filter((t) => t.target_date === nextDateStr && t.category === 'daily');
      if (nextDayPlans.length < 2) {
        preplanFailedDays += 1;
      }
    });

    const totalViolations = dailyFailedDays + preplanFailedDays;
    const fine = totalViolations * 100;
    totalNewFine += fine;

    if (totalViolations > 0) {
      newBills.push({
        id: 'bill_' + Math.random().toString(36).substring(2, 9),
        user_id: p.id,
        billing_month: billingMonthStr,
        failed_tasks_count: totalViolations,
        fine_amount: fine,
        created_at: new Date().toISOString(),
      });
    }

    return {
      ...p,
      total_paid_fine: p.total_paid_fine + fine,
    };
  });

  // 更新任務狀態為 settled
  const updatedTasks = tasks.map((t) => ({
    ...t,
    status: t.is_completed || t.is_skipped ? ('settled' as const) : ('failed' as const),
  }));

  const mergedBills = [...newBills, ...bills];
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updatedProfiles));
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updatedTasks));
  localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(mergedBills));

  return {
    success: true,
    message: `月結算完成！產出 ${newBills.length} 筆帳單，共累計新增 $${totalNewFine} 元罰金至公費總池。`,
  };
};

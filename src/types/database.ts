export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type TaskStatus = 'pending' | 'failed' | 'settled';

export interface Profile {
  id: string; // UUID
  username: string; // 可隨時修改
  avatar_url: string;
  total_paid_fine: number; // 已月結累計罰金
  created_at?: string;
}

export interface GroupSettings {
  id: number;
  goal_name: string;
  goal_amount: number;
  cover_photo: string;
  updated_at?: string;
}

export interface DailyRoutine {
  id: string; // UUID
  user_id: string; // references Profile.id
  title: string; // 隨時可修改
  created_at?: string;
}

export interface Task {
  id: string; // UUID
  user_id: string; // references Profile.id
  routine_id?: string | null; // 若來自常駐序列則關聯 routine.id
  title: string; // 可自由修改
  category: 'daily' | 'weekly' | 'routine';
  day_of_week?: DayOfWeek | null;
  is_completed: boolean;
  proof_url?: string | null;
  is_skipped: boolean;
  skip_reason?: string | null;
  target_date: string; // YYYY-MM-DD
  status: TaskStatus;
  created_at?: string;
}

export interface MonthlyBill {
  id: string;
  user_id: string;
  billing_month: string; // YYYY-MM-01
  failed_tasks_count: number;
  fine_amount: number;
  created_at: string;
}

export type NavTab = 'home' | 'weekly' | 'treasury' | 'settings';

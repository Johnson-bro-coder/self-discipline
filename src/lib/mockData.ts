import { Profile, Task, GroupSettings, MonthlyBill, DailyRoutine } from '../types/database';

export const USER_JOHNSON_ID = '11111111-1111-4111-8111-111111111111';
export const USER_NIGGA_ID = '22222222-2222-4222-8222-222222222222';
export const USER_SHORTY_ID = '33333333-3333-4333-8333-333333333333';

// 初始化乾淨資料：所有成員罰金皆為 0
export const DEFAULT_PROFILES: Profile[] = [
  {
    id: USER_JOHNSON_ID,
    username: 'Johnson',
    avatar_url: '/photos/IMG_0700.JPG',
    total_paid_fine: 0,
  },
  {
    id: USER_NIGGA_ID,
    username: 'nigga',
    avatar_url: '/photos/IMG_0774.JPG',
    total_paid_fine: 0,
  },
  {
    id: USER_SHORTY_ID,
    username: 'shorty',
    avatar_url: '/photos/IMG_0980.JPG',
    total_paid_fine: 0,
  },
];

export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  id: 1,
  goal_name: '日本京都古民家買房基金',
  goal_amount: 15000,
  cover_photo: '/photos/B8EBBDE1-DDEE-4F89-A34C-1922E6CB1875.jpg',
};

// 初始化：尚未排定任何常駐必做
export const DEFAULT_ROUTINES: DailyRoutine[] = [];

// 初始化：尚未產生任何歷史月結帳單
export const DEFAULT_MONTHLY_BILLS: MonthlyBill[] = [];

export const getTodayDateStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTomorrowDateStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 初始化：尚未排定任何任務
export const generateInitialMockTasks = (): Task[] => {
  return [];
};

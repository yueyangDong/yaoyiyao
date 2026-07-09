import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

// ========== 类型定义 ==========

export interface StoredUser {
  id: string;
  name: string;
  gender: '男' | '女';
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  birthplace: {
    province: string;
    city: string;
    district: string;
    longitude: number;
  };
  birthCalendar: 'solar' | 'lunar';
  isLeapMonth: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QueryHistory {
  userId: string;
  module: string;
  timestamp: string;
  queryParams: Record<string, any>;
  resultSummary: string;
}

// 兼容旧版 profile
export interface UserProfile {
  gender: 'male' | 'female' | null;
  birthYear: number | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthHour: number | null;
  birthMinute: number | null;
  birthplace: string | null;
  birthplaceLng: number | null;
}

interface UserContextType {
  // 兼容旧版 API
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;
  clearProfile: () => void;
  hasProfile: boolean;

  // 新版多用户 API
  currentUser: StoredUser | null;
  users: StoredUser[];
  addUser: (user: Omit<StoredUser, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateUser: (id: string, data: Partial<StoredUser>) => void;
  deleteUser: (id: string) => void;
  switchUser: (id: string) => void;

  // 查询历史
  history: QueryHistory[];
  addHistory: (entry: Omit<QueryHistory, 'timestamp'>) => void;
  clearHistory: (module?: string) => void;

  // 派生数据
  age: number | null;
  zodiacAnimal: string | null;
  zodiacSign: string | null;
}

// ========== 常量 ==========

const USERS_KEY = 'fortune_app_users';
const CURRENT_USER_KEY = 'fortune_app_current_user';
const HISTORY_KEY = 'fortune_app_history';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ========== 生肖计算 ==========
const ZODIAC_ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

function getZodiacAnimal(year: number): string {
  return ZODIAC_ANIMALS[(year - 4) % 12];
}

// ========== 星座计算 ==========
const ZODIAC_SIGNS = [
  { name: '摩羯座', start: [1, 1], end: [1, 19] },
  { name: '水瓶座', start: [1, 20], end: [2, 18] },
  { name: '双鱼座', start: [2, 19], end: [3, 20] },
  { name: '白羊座', start: [3, 21], end: [4, 19] },
  { name: '金牛座', start: [4, 20], end: [5, 20] },
  { name: '双子座', start: [5, 21], end: [6, 21] },
  { name: '巨蟹座', start: [6, 22], end: [7, 22] },
  { name: '狮子座', start: [7, 23], end: [8, 22] },
  { name: '处女座', start: [8, 23], end: [9, 22] },
  { name: '天秤座', start: [9, 23], end: [10, 23] },
  { name: '天蝎座', start: [10, 24], end: [11, 22] },
  { name: '射手座', start: [11, 23], end: [12, 21] },
  { name: '摩羯座', start: [12, 22], end: [12, 31] },
];

function getZodiacSign(month: number, day: number): string | null {
  if (!month || !day) return null;
  for (const sign of ZODIAC_SIGNS) {
    const [sM, sD] = sign.start;
    const [eM, eD] = sign.end;
    if (
      (month === sM && day >= sD) ||
      (month === eM && day <= eD)
    ) {
      return sign.name;
    }
  }
  return null;
}

// ========== Helpers ==========

function storedUserToProfile(u: StoredUser | null): UserProfile {
  if (!u) return {
    gender: null, birthYear: null, birthMonth: null, birthDay: null,
    birthHour: null, birthMinute: null, birthplace: null, birthplaceLng: null,
  };
  return {
    gender: u.gender === '男' ? 'male' : 'female',
    birthYear: u.birthYear,
    birthMonth: u.birthMonth,
    birthDay: u.birthDay,
    birthHour: u.birthHour,
    birthMinute: u.birthMinute,
    birthplace: `${u.birthplace.province},${u.birthplace.city},${u.birthplace.district}`,
    birthplaceLng: u.birthplace.longitude,
  };
}

// ========== localStorage 工具 ==========

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadCurrentUserId(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY);
}

function saveCurrentUserId(id: string | null) {
  if (id) localStorage.setItem(CURRENT_USER_KEY, id);
  else localStorage.removeItem(CURRENT_USER_KEY);
}

function loadHistory(): QueryHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(history: QueryHistory[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ========== Context ==========

const DEFAULT_PROFILE: UserProfile = {
  gender: null, birthYear: null, birthMonth: null, birthDay: null,
  birthHour: null, birthMinute: null, birthplace: null, birthplaceLng: null,
};

const UserContext = createContext<UserContextType>({
  profile: DEFAULT_PROFILE, setProfile: () => {}, clearProfile: () => {}, hasProfile: false,
  currentUser: null, users: [], addUser: () => {}, updateUser: () => {}, deleteUser: () => {}, switchUser: () => {},
  history: [], addHistory: () => {}, clearHistory: () => {},
  age: null, zodiacAnimal: null, zodiacSign: null,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<StoredUser[]>(loadUsers);
  const [currentUserId, setCurrentUserId] = useState<string | null>(loadCurrentUserId);
  const [history, setHistory] = useState<QueryHistory[]>(loadHistory);
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_PROFILE);

  // 初始化：从 localStorage 恢复用户
  useEffect(() => {
    const savedUsers = loadUsers();
    const savedId = loadCurrentUserId();
    setUsers(savedUsers);
    setCurrentUserId(savedId);
    setHistory(loadHistory());
  }, []);

  const currentUser = useMemo(() => {
    if (!currentUserId) return null;
    return users.find(u => u.id === currentUserId) || null;
  }, [users, currentUserId]);

  // 同步 profile 到 currentUser
  useEffect(() => {
    setProfileState(storedUserToProfile(currentUser));
  }, [currentUser]);

  const addUser = useCallback((data: Omit<StoredUser, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newUser: StoredUser = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    const updated = [...users, newUser];
    setUsers(updated);
    saveUsers(updated);
    setCurrentUserId(newUser.id);
    saveCurrentUserId(newUser.id);
  }, [users]);

  const updateUser = useCallback((id: string, data: Partial<StoredUser>) => {
    const updated = users.map(u =>
      u.id === id ? { ...u, ...data, updatedAt: new Date().toISOString() } : u
    );
    setUsers(updated);
    saveUsers(updated);
  }, [users]);

  const deleteUser = useCallback((id: string) => {
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    saveUsers(updated);
    if (currentUserId === id) {
      const nextId = updated.length > 0 ? updated[0].id : null;
      setCurrentUserId(nextId);
      saveCurrentUserId(nextId);
    }
  }, [users, currentUserId]);

  const switchUser = useCallback((id: string) => {
    if (users.find(u => u.id === id)) {
      setCurrentUserId(id);
      saveCurrentUserId(id);
    }
  }, [users]);

  const addHistory = useCallback((entry: Omit<QueryHistory, 'timestamp'>) => {
    const newEntry: QueryHistory = { ...entry, timestamp: new Date().toISOString() };
    const updated = [newEntry, ...history].slice(0, 200); // 最多保留200条
    setHistory(updated);
    saveHistory(updated);
  }, [history]);

  const clearHistory = useCallback((module?: string) => {
    if (module) {
      const updated = history.filter(h => h.module !== module);
      setHistory(updated);
      saveHistory(updated);
    } else {
      setHistory([]);
      saveHistory([]);
    }
  }, [history]);

  // 兼容旧版 setProfile（直接更新 currentUser）
  const setProfile = useCallback((p: Partial<UserProfile>) => {
    if (!currentUser) {
      setProfileState(prev => ({ ...prev, ...p }));
      return;
    }
    const updates: Partial<StoredUser> = {};
    if (p.gender) updates.gender = p.gender === 'male' ? '男' : '女';
    if (p.birthYear !== undefined) updates.birthYear = p.birthYear as number;
    if (p.birthMonth !== undefined) updates.birthMonth = p.birthMonth as number;
    if (p.birthDay !== undefined) updates.birthDay = p.birthDay as number;
    if (p.birthHour !== undefined) updates.birthHour = p.birthHour as number;
    if (p.birthMinute !== undefined) updates.birthMinute = p.birthMinute as number;
    if (p.birthplace) {
      const parts = p.birthplace.split(',');
      updates.birthplace = {
        province: parts[0] || '',
        city: parts[1] || '',
        district: parts[2] || '',
        longitude: p.birthplaceLng || currentUser.birthplace.longitude,
      };
    }
    if (p.birthplaceLng !== undefined && p.birthplaceLng !== null) {
      updates.birthplace = { ...currentUser.birthplace, longitude: p.birthplaceLng };
    }
    updateUser(currentUser.id, updates);
  }, [currentUser, updateUser]);

  const clearProfile = useCallback(() => {
    setProfileState(DEFAULT_PROFILE);
  }, []);

  const hasProfile = !!(currentUser || (profile.gender && profile.birthYear));

  // 派生数据
  const age = useMemo(() => {
    const u = currentUser;
    if (!u) return null;
    const today = new Date();
    let age = today.getFullYear() - u.birthYear;
    const m = today.getMonth() + 1;
    if (m < u.birthMonth || (m === u.birthMonth && today.getDate() < u.birthDay)) {
      age--;
    }
    return age;
  }, [currentUser]);

  const zodiacAnimal = useMemo(() => {
    return currentUser ? getZodiacAnimal(currentUser.birthYear) : null;
  }, [currentUser]);

  const zodiacSign = useMemo(() => {
    return currentUser ? getZodiacSign(currentUser.birthMonth, currentUser.birthDay) : null;
  }, [currentUser]);

  return (
    <UserContext.Provider value={{
      profile, setProfile, clearProfile, hasProfile,
      currentUser, users, addUser, updateUser, deleteUser, switchUser,
      history, addHistory, clearHistory,
      age, zodiacAnimal, zodiacSign,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

// ========== 城市经度映射 ==========
export const CITY_LNG_MAP: Record<string, number> = {
  '北京市,市辖区': 116.4, '上海市,市辖区': 121.5, '天津市,市辖区': 117.2, '重庆市,市辖区': 106.5,
  '广东省,广州市': 113.3, '广东省,深圳市': 114.1, '广东省,珠海市': 113.6, '广东省,东莞市': 113.8, '广东省,佛山市': 113.1,
  '浙江省,杭州市': 120.2, '浙江省,宁波市': 121.5, '浙江省,温州市': 120.7,
  '江苏省,南京市': 118.8, '江苏省,苏州市': 120.6, '江苏省,无锡市': 120.3,
  '山东省,济南市': 117.0, '山东省,青岛市': 120.4,
  '福建省,福州市': 119.3, '福建省,厦门市': 118.1,
  '四川省,成都市': 104.1, '湖北省,武汉市': 114.3, '湖南省,长沙市': 113.0,
  '河南省,郑州市': 113.7, '河北省,石家庄市': 114.5,
  '陕西省,西安市': 108.9, '辽宁省,沈阳市': 123.4, '辽宁省,大连市': 121.6,
  '吉林省,长春市': 125.3, '黑龙江省,哈尔滨市': 126.6,
  '安徽省,合肥市': 117.3, '江西省,南昌市': 115.9,
  '广西壮族自治区,南宁市': 108.4, '云南省,昆明市': 102.7, '贵州省,贵阳市': 106.7,
  '海南省,海口市': 110.3, '甘肃省,兰州市': 103.8,
  '山西省,太原市': 112.5, '内蒙古自治区,呼和浩特市': 111.7,
  '新疆维吾尔自治区,乌鲁木齐市': 87.6, '西藏自治区,拉萨市': 91.1,
  '宁夏回族自治区,银川市': 106.3, '青海省,西宁市': 101.8,
};

export function getCityLng(province: string, city: string): number {
  const key = `${province},${city}`;
  if (CITY_LNG_MAP[key]) return CITY_LNG_MAP[key];
  for (const [k, v] of Object.entries(CITY_LNG_MAP)) {
    if (k.includes(province) && k.includes(city)) return v;
  }
  return 120;
}

export function getTrueSolarHour(hour: number, minute: number, lng: number): { hour: number; minute: number } {
  const offsetMinutes = Math.round((lng - 120) * 4);
  let totalMinutes = hour * 60 + minute + offsetMinutes;
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;
  return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
}

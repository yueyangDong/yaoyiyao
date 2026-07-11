import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;
  clearProfile: () => void;
  hasProfile: boolean;

  currentUser: StoredUser | null;
  users: StoredUser[];
  addUser: (user: Omit<StoredUser, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateUser: (id: string, data: Partial<StoredUser>) => void;
  deleteUser: (id: string) => void;
  switchUser: (id: string) => void;

  history: QueryHistory[];
  addHistory: (entry: Omit<QueryHistory, 'timestamp'>) => void;
  clearHistory: (module?: string) => void;

  age: number | null;
  zodiacAnimal: string | null;
  zodiacSign: string | null;

  syncing: boolean;
  synced: boolean;
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
    if ((month === sM && day >= sD) || (month === eM && day <= eD)) return sign.name;
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
    birthYear: u.birthYear, birthMonth: u.birthMonth, birthDay: u.birthDay,
    birthHour: u.birthHour, birthMinute: u.birthMinute,
    birthplace: `${u.birthplace.province},${u.birthplace.city},${u.birthplace.district}`,
    birthplaceLng: u.birthplace.longitude,
  };
}

function profileToStoredUser(userId: string, data: any): StoredUser {
  return {
    id: userId,
    name: data.name || '',
    gender: data.gender || '男',
    birthYear: data.birth_year || 1990,
    birthMonth: data.birth_month || 1,
    birthDay: data.birth_day || 1,
    birthHour: data.birth_hour || 0,
    birthMinute: data.birth_minute || 0,
    birthplace: {
      province: data.birthplace_province || '',
      city: data.birthplace_city || '',
      district: data.birthplace_district || '',
      longitude: data.birthplace_longitude || 120,
    },
    birthCalendar: data.birth_calendar || 'solar',
    isLeapMonth: data.is_leap_month || false,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
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

function saveHistoryLocal(history: QueryHistory[]) {
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
  syncing: false, synced: false,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<StoredUser[]>(loadUsers);
  const [currentUserId, setCurrentUserId] = useState<string | null>(loadCurrentUserId);
  const [history, setHistory] = useState<QueryHistory[]>(loadHistory);
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_PROFILE);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  // 登录后从 Supabase 拉取档案
  useEffect(() => {
    if (!authUser) { setSynced(false); return; }
    let cancelled = false;
    (async () => {
      setSyncing(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!cancelled && !error) {
        if (data) {
          const profile = profileToStoredUser(authUser.id, data);
          const uid = authUser.id;
          setUsers(prev => {
            const updated = [profile, ...prev.filter(u => u.id !== uid)];
            saveUsers(updated);
            return updated;
          });
          setCurrentUserId(uid);
          saveCurrentUserId(uid);

          // 拉取云历史
          const { data: cloudHistory } = await supabase
            .from('query_history')
            .select('*')
            .eq('user_id', authUser.id)
            .order('created_at', { ascending: false })
            .limit(200);

          if (cloudHistory) {
            const merged: QueryHistory[] = cloudHistory.map((h: any) => ({
              userId: h.user_id,
              module: h.module,
              timestamp: h.created_at,
              queryParams: h.query_params || {},
              resultSummary: h.result_summary || '',
            }));
            setHistory(merged);
            saveHistoryLocal(merged);
          }
        }
        // data 为 null（新用户无档案）= 正常，不同步本地记录
      }
      if (!cancelled) { setSyncing(false); setSynced(true); }
    })();
    return () => { cancelled = true; };
  }, [authUser?.id]);

  const currentUser = useMemo(() => {
    if (!currentUserId) return null;
    return users.find(u => u.id === currentUserId) || null;
  }, [users, currentUserId]);

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

    // 同步到 Supabase
    if (authUser && id === authUser.id) {
      const u = updated.find(x => x.id === id);
      if (u) {
        supabase.from('profiles').upsert({
          id: authUser.id,
          name: u.name,
          gender: u.gender,
          birth_year: u.birthYear,
          birth_month: u.birthMonth,
          birth_day: u.birthDay,
          birth_hour: u.birthHour,
          birth_minute: u.birthMinute,
          birthplace_province: u.birthplace.province,
          birthplace_city: u.birthplace.city,
          birthplace_district: u.birthplace.district,
          birthplace_longitude: u.birthplace.longitude,
          birth_calendar: u.birthCalendar,
          is_leap_month: u.isLeapMonth,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.error('sync profile error:', error);
        });
      }
    }
  }, [users, authUser]);

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
    const updated = [newEntry, ...history].slice(0, 200);
    setHistory(updated);
    saveHistoryLocal(updated);

    // 同步到 Supabase
    if (authUser) {
      supabase.from('query_history').insert({
        user_id: authUser.id,
        module: entry.module,
        query_params: entry.queryParams || {},
        result_summary: entry.resultSummary || '',
      }).then(({ error }) => {
        if (error) console.error('sync history error:', error);
      });
    }
  }, [history, authUser]);

  const clearHistory = useCallback((module?: string) => {
    if (module) {
      const updated = history.filter(h => h.module !== module);
      setHistory(updated);
      saveHistoryLocal(updated);
    } else {
      setHistory([]);
      saveHistoryLocal([]);
    }
  }, [history]);

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
        province: parts[0] || '', city: parts[1] || '', district: parts[2] || '',
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

  const age = useMemo(() => {
    const u = currentUser;
    if (!u) return null;
    const today = new Date();
    let age = today.getFullYear() - u.birthYear;
    const m = today.getMonth() + 1;
    if (m < u.birthMonth || (m === u.birthMonth && today.getDate() < u.birthDay)) age--;
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
      syncing, synced,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

// ========== 城市经度映射 ==========
import { CITY_LNG_MAP } from '../data/cityLng';
export { CITY_LNG_MAP };

export function getCityLng(province: string, city: string, district?: string): number {
  // 1) 精确3级匹配：省,市,区
  if (district) {
    const key3 = `${province},${city},${district}`;
    if (CITY_LNG_MAP[key3] !== undefined) return CITY_LNG_MAP[key3];
  }
  // 2) 2级匹配：省,市
  const key2 = `${province},${city}`;
  if (CITY_LNG_MAP[key2] !== undefined) return CITY_LNG_MAP[key2];
  // 3) 模糊匹配：key包含市名
  for (const [k, v] of Object.entries(CITY_LNG_MAP)) {
    if (k.includes(city)) return v;
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

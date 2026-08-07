import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthState>({
  user: null, session: null, loading: true,
  signUp: async () => ({}), signIn: async () => ({}), signOut: async () => {},
  resetPassword: async () => ({}),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      // 云同步未配置：直接进入本地模式
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: '云同步未配置，当前为本地模式' };
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      return {};
    } catch (e: any) {
      return { error: e.message || '注册失败，请检查网络连接' };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: '云同步未配置，当前为本地模式' };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    } catch (e: any) {
      return { error: e.message || '登录失败，请检查网络连接' };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: '云同步未配置，当前为本地模式' };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth',
      });
      if (error) return { error: error.message };
      return {};
    } catch (e: any) {
      return { error: e.message || '发送失败，请重试' };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

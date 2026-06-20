import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

interface AuthResult {
  error?: string;
  needsConfirmation?: boolean;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  /** False when Supabase isn't configured — the app runs in open "demo mode". */
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'not-configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'not-configured' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // When email confirmation is on, there's no active session yet.
    return { needsConfirmation: !data.session };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const updatePassword = async (password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'not-configured' };
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { error: error.message } : {};
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'not-configured' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/app`,
    });
    return error ? { error: error.message } : {};
  };

  return (
    <AuthContext.Provider value={{ session, loading, isConfigured: isSupabaseConfigured, signIn, signUp, signOut, updatePassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

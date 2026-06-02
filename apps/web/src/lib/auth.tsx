import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  is_admin: boolean;
}

interface AuthState {
  /** Supabase user, null only while loading */
  user: User | null;
  /** Profile row from public.profiles */
  profile: Profile | null;
  /** True while the initial session check is in flight */
  loading: boolean;
  /** True when the current session is an anonymous guest */
  isGuest: boolean;
  /** Sign in anonymously — gets a Guest_XXXX username */
  signInAsGuest: () => Promise<void>;
  /** Sign in with Google OAuth */
  signInWithGoogle: () => Promise<void>;
  /** Sign in with email magic link */
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Refresh the profile from DB (e.g. after username change) */
  refreshProfile: () => Promise<void>;
  /** Update username — validates format, returns error string or null */
  updateUsername: (username: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const isGuest = !!(user?.is_anonymous);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_admin")
      .eq("id", uid)
      .single();
    setProfile(data as Profile | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSession(session: Session | null) {
    const u = session?.user ?? null;
    setUser(u);
    if (u) {
      fetchProfile(u.id);
    } else {
      setProfile(null);
    }
  }

  const signInAsGuest = useCallback(async () => {
    await supabase.auth.signInAnonymously();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const updateUsername = useCallback(async (username: string) => {
    if (!user) return { error: "Not signed in" };
    const clean = username.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(clean)) {
      return { error: "Username must be 3–20 characters: letters, numbers, underscore only." };
    }
    const { error } = await supabase
      .from("profiles")
      .update({ username: clean })
      .eq("id", user.id);
    if (!error) await fetchProfile(user.id);
    return { error: error?.message ?? null };
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isGuest,
        signInAsGuest,
        signInWithGoogle,
        signInWithEmail,
        signOut,
        refreshProfile,
        updateUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

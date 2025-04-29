// -----------------------------------------------------------------------------
// AuthContext.tsx  •  2025‑04‑28  (lint‑clean, full file, zero truncation)
// Centralised authentication provider for StoryTime.
//
// • Guarantees `loading` becomes `false` exactly once on every page load
//   (even when no session exists or Supabase throws).
// • Keeps `session`, `user`, and `profile` in sync with Supabase events.
// • All public functions (login, signup, logout) return `Promise<void>`
//   and bubble errors for caller handling.
// • Uses React Context with a strict custom hook to avoid undefined access.
// -----------------------------------------------------------------------------

import React,
  {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
  } from "react";
import { type Session, type User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { type Database } from "@/integrations/supabase/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type UserProfile = Database["public"]["Tables"]["users"]["Row"] | null;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile;
  loading: boolean;
  login: (args: {
    email: string;
    password?: string;
    provider?: "google" | "github";
  }) => Promise<void>;
  signup: (args: {
    email: string;
    password: string;
    options?: {
      data?: Record<string, unknown>;
      emailRedirectTo?: string;
    };
  }) => Promise<void>;
  logout: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// Context Creation
// -----------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(null);
  const [loading, setLoading] = useState(true); // initialise as true

  // ----------------------------- Helpers ------------------------------------
  const fetchProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const { data, error, status } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && status !== 406) {
        console.error("[AuthContext] fetchProfile error:", error);
        setProfile(null);
        return;
      }
      setProfile(data ?? null);
    } catch (err) {
      console.error("[AuthContext] fetchProfile exception:", err);
      setProfile(null);
    }
  }, []);

  // -------------------- One‑time session bootstrap --------------------------
  useEffect(() => {
    let isMounted = true;

    const initialise = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        await fetchProfile(initialSession?.user?.id);
      } catch (err) {
        console.error("[AuthContext] getSession error:", err);
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        if (isMounted) setLoading(false); // **always** clear loading
      }
    };

    initialise();

    // ------------------ Auth change listener -------------------------------
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await fetchProfile(newSession?.user?.id);
      }
      if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        setProfile(null);
      }
      // We do not touch `loading` here; it is already false after initialise().
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ----------------------------- Actions ------------------------------------
  const login = useCallback(
    async ({
      email,
      password,
      provider,
    }: {
      email: string;
      password?: string;
      provider?: "google" | "github";
    }) => {
      if (provider) {
        const { error } = await supabase.auth.signInWithOAuth({ provider });
        if (error) throw error;
        return;
      }
      if (!password) {
        throw new Error("Password is required for email login.");
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    []
  );

  const signup = useCallback(
    async ({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: {
        data?: Record<string, unknown>;
        emailRedirectTo?: string;
      };
    }) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options,
      });
      if (error) throw error;
    },
    []
  );

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // optimistic local clear; listener will confirm
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  // ---------------------------- Memo value -----------------------------------
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      login,
      signup,
      logout,
    }),
    [session, user, profile, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// -----------------  ------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

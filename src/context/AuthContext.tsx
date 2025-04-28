// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type UserProfile = Database['public']['Tables']['users']['Row'] | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile;
  loading: boolean; // Represents initial auth check completion
  login: (credentials: { email: string; password?: string; provider?: 'google' | 'github' }) => Promise<any>;
  signup: (credentials: { email: string; password?: string; options?: { data?: { name?: string; [key: string]: any }; emailRedirectTo?: string } }) => Promise<any>;
  logout: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Start true

  // --- Added Debug Log Function ---
  const logAuthState = (message: string) => {
    console.log(`[AuthContext] ${message} | Loading: ${isAuthLoading}, Session: ${!!session}, User: ${!!user?.id}`);
  }
  // ---

  const fetchProfile = useCallback(async (userId: string | undefined) => {
    console.log("[AuthContext] fetchProfile called with userId:", userId); // Added log
    if (!userId) {
      console.log("[AuthContext] fetchProfile: No user ID, setting profile to null.");
      setProfile(null);
      return;
    }
    try {
      const { data: userProfile, error, status } = await supabase
        .from('users') // Ensure this table name is correct
        .select('*') // Fetch all columns, including subscription details
        .eq('id', userId)
        .single();

      if (error && status !== 406) { // 406 means no rows found, which is okay
        console.error('[AuthContext] fetchProfile: Error fetching profile:', error);
        setProfile(null);
      } else if (userProfile) {
        console.log("[AuthContext] fetchProfile: Profile fetched:", userProfile);
        setProfile(userProfile);
      } else {
        console.log("[AuthContext] fetchProfile: No profile found for user.");
        setProfile(null);
      }
    } catch(err) {
      console.error("[AuthContext] fetchProfile: Exception fetching profile:", err);
      setProfile(null);
      // Re-throw or handle as needed - might prevent loading state change if not caught in caller
      // throw err; // Potentially problematic if it stops loading=false
    }
    console.log("[AuthContext] fetchProfile finished."); // Added log
  }, []); // No dependencies needed if it only uses supabase client

  useEffect(() => {
    console.log("[AuthContext] AuthProvider Mount: Setting up auth listener and initial check.");
    setIsAuthLoading(true); // Start loading true on mount/setup

    let isMounted = true;

    // --- Initial Session Check ---
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      console.log("[AuthContext] getSession .then() entered. Session:", !!initialSession); // <-- ADDED LOG

      setSession(initialSession);
      const initialUser = initialSession?.user ?? null;
      setUser(initialUser);

      console.log("[AuthContext] Calling initial fetchProfile..."); // <-- ADDED LOG
      try {
          await fetchProfile(initialUser?.id); // Fetch profile
          console.log("[AuthContext] Initial fetchProfile completed."); // <-- ADDED LOG
      } catch (profileError) {
          console.error("[AuthContext] Error during initial fetchProfile:", profileError); // <-- ADDED LOG
          // Decide if you still want to set loading false even if profile fails
          // For now, we'll proceed to set loading false anyway for debugging visibility
      }

      console.log("[AuthContext] *** About to call setIsAuthLoading(false) in .then() ***"); // <-- ADDED LOG
      if (isMounted) { // Double check mount status before setting state
        setIsAuthLoading(false);
        console.log("[AuthContext] Initial auth check finished, isAuthLoading is now false."); // Existing log modified
        logAuthState("State after initial check (success path)"); // Log current state
      }

    }).catch(err => {
      if (!isMounted) return;
      console.error("[AuthContext] getSession() FAILED with error:", err); // <-- Enhanced Log
      console.log("[AuthContext] *** About to call setIsAuthLoading(false) in .catch() ***"); // <-- ADDED LOG
      if (isMounted) { // Double check mount status
        setIsAuthLoading(false);
        console.log("[AuthContext] Initial auth check FAILED, isAuthLoading is now false.");
        logAuthState("State after initial check (error path)"); // Log current state
      }
    });

    // --- Auth State Change Listener ---
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;
        console.log(`[AuthContext] Auth state changed: ${event}`, "New session exists:", !!newSession);

        const currentUser = newSession?.user ?? null;
        const previousUserId = user?.id; // Get user state *before* setting it

        setSession(newSession);
        setUser(currentUser);

        if (currentUser?.id !== previousUserId) {
           console.log("[AuthContext] User changed, fetching profile...");
           await fetchProfile(currentUser?.id);
           logAuthState(`State after ${event}`); // Log state after change
        } else {
            console.log("[AuthContext] Auth state changed but user ID is the same, profile fetch skipped.");
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      console.log("[AuthContext] AuthProvider Unmount: Cleaning up listener.");
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfile]); // fetchProfile is memoized

  // --- Auth Actions ---
  const login = async (credentials: { email: string; password?: string; provider?: 'google' | 'github' }) => {
    console.log("[AuthContext] Attempting login...");
    let error = null;
    if (credentials.provider) {
        ({ error } = await supabase.auth.signInWithOAuth({ provider: credentials.provider }));
    } else if (credentials.password) {
        ({ error } = await supabase.auth.signInWithPassword({ email: credentials.email, password: credentials.password }));
    } else {
        throw new Error("Password or provider required for login.");
    }
    if (error) {
        console.error("[AuthContext] Login error:", error);
        throw error;
    }
      console.log("[AuthContext] Login initiated/successful (listener will update state).");
    };

    const signup = async (credentials: { email: string; password?: string; options?: { data?: { name?: string; [key: string]: any }; emailRedirectTo?: string } }) => {
      console.log("[AuthContext] Attempting signup...");
      const userData = credentials.options?.data ?? {};
      const { error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: { ...credentials.options, data: userData }
      });
      if (error) {
        console.error("[AuthContext] Signup error:", error);
        throw error;
      }
      console.log("[AuthContext] Signup initiated/successful (listener will update state).");
    };

    const logout = async () => {
      console.log("[AuthContext] Attempting logout...");
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AuthContext] Logout error:", error);
        throw error;
      }
      // Manually clear profile on logout
      setProfile(null);
      console.log("[AuthContext] Logout successful (listener will update state).");
    };

  const value = {
    session,
    user,
    profile,
    loading: isAuthLoading, // Provide the correct state here
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook remains the same
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
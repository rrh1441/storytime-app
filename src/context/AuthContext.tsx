// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
// Log after import to ensure client is available here
console.log("[AuthContext] Imported Supabase client instance:", supabase ? 'Exists' : 'MISSING/FAILED IMPORT');
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
  // Log when the component renders
  console.log("[AuthContext] AuthProvider component RENDERED.");

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Start true

  // Define fetchProfile even though it's not used in the simplified useEffect,
  // so the rest of the component doesn't break.
  const fetchProfile = useCallback(async (userId: string | undefined) => {
    console.log("[AuthContext] fetchProfile called with userId (but might be unused in simplified test):", userId);
    if (!userId) {
      // console.log("[AuthContext] fetchProfile: No user ID, setting profile to null.");
      setProfile(null);
      return;
    }
    try {
      const { data: userProfile, error, status } = await supabase
        .from('users') // Ensure this table name is correct
        .select('*')
        .eq('id', userId)
        .single();

      if (error && status !== 406) {
        console.error('[AuthContext] fetchProfile: Error fetching profile:', error);
        setProfile(null);
      } else if (userProfile) {
        // console.log("[AuthContext] fetchProfile: Profile fetched:", userProfile);
        setProfile(userProfile);
      } else {
        // console.log("[AuthContext] fetchProfile: No profile found for user.");
        setProfile(null);
      }
    } catch(err) {
      console.error("[AuthContext] fetchProfile: Exception fetching profile:", err);
      setProfile(null);
    }
    // console.log("[AuthContext] fetchProfile finished.");
  }, []);

  // --- Simplified useEffect for Debugging ---
  useEffect(() => {
    console.log("[AuthContext] Simplified useEffect - Mounting.");
    // Ensure loading starts true conceptually
    setIsAuthLoading(true);
    let isMounted = true;

    console.log("[AuthContext] Simplified useEffect - Calling getSession()...");
    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!isMounted) {
            console.log("[AuthContext] Simplified useEffect - getSession resolved BUT component unmounted.");
            return;
        };
        // Even if session is null, the call succeeded.
        console.log("[AuthContext] Simplified useEffect - getSession RESOLVED. Session:", !!initialSession);
        setSession(initialSession); // Still set session
        setUser(initialSession?.user ?? null); // Still set user

        console.log("[AuthContext] Simplified useEffect - *** Calling setIsAuthLoading(false) in .then() ***");
        setIsAuthLoading(false);
        console.log("[AuthContext] Simplified useEffect - state updated, loading is now false.");
      })
      .catch((err) => {
        if (!isMounted) {
            console.log("[AuthContext] Simplified useEffect - getSession rejected BUT component unmounted.");
            return;
        };
        console.error("[AuthContext] Simplified useEffect - getSession REJECTED:", err);

        console.log("[AuthContext] Simplified useEffect - *** Calling setIsAuthLoading(false) in .catch() ***");
        setIsAuthLoading(false); // Also set loading false on error
         console.log("[AuthContext] Simplified useEffect - error path finished, loading is now false.");
      });

    // Listener is commented out for this test
    // const { data: authListener } = supabase.auth.onAuthStateChange(...);

    return () => {
      console.log("[AuthContext] Simplified useEffect - Unmounting.");
      isMounted = false;
      // authListener?.subscription.unsubscribe(); // Keep commented out
    };
  }, []); // Use empty dependency array for this simplified test
  // --- End Simplified useEffect ---


  // --- Auth Actions (Keep them defined) ---
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
      setProfile(null); // Manually clear profile
      console.log("[AuthContext] Logout successful (listener will update state).");
    };

  // Provide state and actions
  const value = {
    session,
    user,
    profile,
    loading: isAuthLoading,
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
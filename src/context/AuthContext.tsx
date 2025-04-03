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
  loading: boolean; // This will represent the initial auth check completion
  login: (credentials: { email: string; password?: string; provider?: 'google' | 'github' }) => Promise<any>;
  signup: (credentials: { email: string; password?: string; options?: { data?: { name?: string; [key: string]: any }; emailRedirectTo?: string } }) => Promise<any>;
  logout: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(null);
  // Rename 'loading' to 'isAuthLoading' for clarity, start true
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      console.log("fetchProfile: No user ID, setting profile to null.");
      setProfile(null);
      return;
    }
    console.log("fetchProfile: Fetching profile for user:", userId);
    try {
      // Make sure you select all needed columns, including subscription ones
      const { data: userProfile, error, status } = await supabase
        .from('users')
        .select('*') // Adjust if you added more columns like subscription status etc.
        .eq('id', userId)
        .single();

      if (error && status !== 406) {
        console.error('fetchProfile: Error fetching profile:', error);
        setProfile(null);
      } else if (userProfile) {
        console.log("fetchProfile: Profile fetched:", userProfile);
        setProfile(userProfile);
      } else {
        console.log("fetchProfile: No profile found for user.");
        setProfile(null);
      }
    } catch(err) {
      console.error("fetchProfile: Exception fetching profile:", err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    console.log("Auth Provider Mount: Setting up auth listener and initial check.");
    setIsAuthLoading(true); // Start loading true on mount/setup

    let isMounted = true; // Flag to prevent state updates after unmount

    // --- Initial Session Check ---
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return; // Don't proceed if unmounted
      console.log("Initial session check completed. Session exists:", !!initialSession);

       // Update state immediately based on initial check
      setSession(initialSession);
      const initialUser = initialSession?.user ?? null;
      setUser(initialUser);
      await fetchProfile(initialUser?.id); // Fetch profile for initial user

      // Important: Set loading false *after* the initial check and profile fetch completes
      setIsAuthLoading(false);
       console.log("Initial auth check finished, isAuthLoading set to false.");

    }).catch(err => {
      if (!isMounted) return;
      console.error("Error getting initial session:", err);
      setIsAuthLoading(false); // Stop loading even on error
    });

    // --- Auth State Change Listener ---
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return; // Don't process if unmounted
        console.log(`Auth state changed: ${event}`, "New session exists:", !!newSession);

        // No need to set loading true/false here unless the change takes significant time
        // The initial load handles the main loading state. Subsequent changes should be quick.

        const currentUser = newSession?.user ?? null;
        const previousUserId = user?.id; // Get user state *before* setting it

        setSession(newSession);
        setUser(currentUser);

        // Fetch profile only if the user ID has actually changed or if there's a user now and wasn't before
        if (currentUser?.id !== previousUserId) {
           console.log("User changed, fetching profile...");
           await fetchProfile(currentUser?.id);
        } else {
            console.log("Auth state changed but user ID is the same, profile fetch skipped.");
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      console.log("Auth Provider Unmount: Cleaning up listener.");
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfile]); // fetchProfile is memoized, safe dependency

  // --- Auth Actions (Add logging, keep implementation simple) ---
  const login = async (credentials: { email: string; password?: string; provider?: 'google' | 'github' }) => {
    console.log("AuthContext: Attempting login...");
    // No need to manage loading state here; onAuthStateChange will handle UI updates
    let error = null;
    if (credentials.provider) {
       ({ error } = await supabase.auth.signInWithOAuth({ provider: credentials.provider }));
    } else if (credentials.password) {
       ({ error } = await supabase.auth.signInWithPassword({ email: credentials.email, password: credentials.password }));
    } else {
       throw new Error("Password or provider required for login.");
    }
    if (error) {
       console.error("AuthContext: Login error:", error);
       throw error; // Let the UI handle the error display
    }
     console.log("AuthContext: Login initiated/successful (listener will update state).");
   };

   const signup = async (credentials: { email: string; password?: string; options?: { data?: { name?: string; [key: string]: any }; emailRedirectTo?: string } }) => {
     console.log("AuthContext: Attempting signup...");
     const userData = credentials.options?.data ?? {};
     const { error } = await supabase.auth.signUp({
       email: credentials.email,
       password: credentials.password,
       options: { ...credentials.options, data: userData }
     });
     if (error) {
       console.error("AuthContext: Signup error:", error);
       throw error;
     }
     console.log("AuthContext: Signup initiated/successful (listener will update state).");
   };

   const logout = async () => {
     console.log("AuthContext: Attempting logout...");
     const { error } = await supabase.auth.signOut();
     if (error) {
       console.error("AuthContext: Logout error:", error);
       throw error;
     }
      // Manually clear profile on logout for immediate UI update if needed,
      // although onAuthStateChange should handle it.
      setProfile(null);
      console.log("AuthContext: Logout successful (listener will update state).");
    };

  // Provide the renamed 'loading' state
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
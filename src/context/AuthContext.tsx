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
  login: (credentials: { email: string; password?: string; provider?: 'google' | 'github' }) => Promise<void>; // Return type void is fine
  signup: (credentials: { email: string; password?: string; options?: { data?: { name?: string; [key: string]: any }; emailRedirectTo?: string } }) => Promise<void>; // Return type void is fine
  logout: () => Promise<void>; // Return type void is fine
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Log when the component renders
  console.log("[AuthContext] AuthProvider component RENDERED.");

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Start true

  const fetchProfile = useCallback(async (userId: string | undefined) => {
    console.log("[AuthContext] fetchProfile called with userId:", userId);
    if (!userId) {
      console.log("[AuthContext] fetchProfile: No user ID, setting profile to null.");
      setProfile(null);
      return;
    }
    try {
      // Ensure 'users' table name is correct for your project
      const { data: userProfile, error, status } = await supabase
        .from('users')
        .select('*') // Select all columns needed, including subscription status etc.
        .eq('id', userId)
        .single();

      if (error && status !== 406) { // 406 (Not Found) is acceptable if profile doesn't exist yet
        console.error('[AuthContext] fetchProfile: Error fetching profile:', error);
        setProfile(null);
      } else if (userProfile) {
        console.log("[AuthContext] fetchProfile: Profile fetched successfully.");
        setProfile(userProfile);
      } else {
        console.log("[AuthContext] fetchProfile: No profile found for user.");
        setProfile(null);
      }
    } catch(err) {
      console.error("[AuthContext] fetchProfile: Exception fetching profile:", err);
      setProfile(null);
    }
    console.log("[AuthContext] fetchProfile finished.");
  }, []); // useCallback depends only on supabase instance which is stable

  // --- Full useEffect with Listener and Logging ---
  useEffect(() => {
    console.log("[AuthContext] FULL useEffect - Mounting.");
    setIsAuthLoading(true);
    let isMounted = true;

    // Initial Check
    console.log("[AuthContext] FULL useEffect - Calling initial getSession()...");
    supabase.auth.getSession()
      .then(async ({ data: { session: initialSession } }) => {
        if (!isMounted) {
            console.log("[AuthContext] FULL useEffect - Initial getSession resolved BUT component unmounted.");
            return;
        }
        console.log("[AuthContext] FULL useEffect - Initial getSession RESOLVED. Session:", !!initialSession);
        setSession(initialSession);
        const initialUser = initialSession?.user ?? null;
        setUser(initialUser);
        // Fetch profile only if there's an initial user
        if (initialUser) {
            console.log("[AuthContext] FULL useEffect - Fetching initial profile for user:", initialUser.id);
            await fetchProfile(initialUser.id);
        } else {
            console.log("[AuthContext] FULL useEffect - No initial session/user, setting profile null.");
            setProfile(null); // Ensure profile is null if no initial session
        }
        console.log("[AuthContext] FULL useEffect - *** Calling setIsAuthLoading(false) after initial check ***");
        setIsAuthLoading(false);
        console.log("[AuthContext] FULL useEffect - Initial check finished, loading is now false.");
      })
      .catch((err) => {
        if (!isMounted) {
            console.log("[AuthContext] FULL useEffect - Initial getSession rejected BUT component unmounted.");
            return;
        }
        console.error("[AuthContext] FULL useEffect - Initial getSession REJECTED:", err);
        setProfile(null); // Clear profile on error too
        console.log("[AuthContext] FULL useEffect - *** Calling setIsAuthLoading(false) after initial error ***");
        setIsAuthLoading(false);
         console.log("[AuthContext] FULL useEffect - Initial check ERROR, loading is now false.");
      });

    // Attach the Listener
    console.log("[AuthContext] FULL useEffect - Attaching onAuthStateChange listener...");
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Log added here to see if the callback fires AT ALL
        console.log(`[AuthContext] ***** onAuthStateChange FIRED! Event: ${event}, Session: ${!!newSession} *****`);

        if (!isMounted) {
            console.log("[AuthContext] onAuthStateChange: unmounted, ignoring.");
            return;
        }

        const currentUser = newSession?.user ?? null;
        // Read previous user state *before* setting new state
        // NOTE: Using a direct state read here might capture the stale value if updates are batched.
        // It's generally safer to compare currentUser.id to the previous value if needed.
        const previousUserId = user?.id; // Using the 'user' state variable closure

        console.log(`[AuthContext] onAuthStateChange: Event: ${event}. Previous User ID: ${previousUserId}, New User ID: ${currentUser?.id}`);
        console.log("[AuthContext] onAuthStateChange: About to set session/user state...");
        setSession(newSession);
        setUser(currentUser); // Update user state
        console.log(`[AuthContext] onAuthStateChange: Session/user state SET. Current user state ID is now: ${currentUser?.id}`);

        // Fetch profile on SIGNED_IN or if user ID genuinely changes
        if (event === 'SIGNED_IN' || (currentUser && currentUser.id !== previousUserId)) {
           console.log(`[AuthContext] ${event} event or user changed, fetching profile for user: ${currentUser?.id}...`);
           await fetchProfile(currentUser?.id); // Fetch the profile for the new user
           console.log(`[AuthContext] onAuthStateChange: Profile fetch potentially done after ${event}.`);
        // Explicitly handle SIGNED_OUT and TOKEN_REFRESHED (if session exists but user didn't change)
        } else if (event === 'SIGNED_OUT') {
            console.log("[AuthContext] SIGNED_OUT event, clearing profile.");
            setProfile(null); // Clear profile on logout
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
            // Optional: Re-fetch profile on token refresh if needed, although user ID likely hasn't changed
            // console.log("[AuthContext] TOKEN_REFRESHED event, re-fetching profile for user:", currentUser?.id);
            // await fetchProfile(currentUser?.id);
            console.log("[AuthContext] TOKEN_REFRESHED event, profile fetch skipped (can be enabled if needed).");
        } else if (!currentUser && previousUserId) {
            // Catch other cases resulting in no user (like USER_DELETED)
            console.log(`[AuthContext] User logged out or deleted (${event}), clearing profile.`);
            setProfile(null);
        } else {
            console.log(`[AuthContext] Auth state changed (${event}), session: ${!!newSession}, no relevant user change detected, profile fetch skipped.`);
        }
      }
    );

    // Log listener attachment status
    console.log("[AuthContext] FULL useEffect - onAuthStateChange listener attached. Subscription:", authListener?.subscription ? 'Exists' : 'FAILED TO ATTACH');

    return () => {
      console.log("[AuthContext] FULL useEffect - Unmounting. Unsubscribing listener.");
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  // Ensure dependency array correctly reflects state used *within* the effect for comparisons
  }, [fetchProfile, user]); // Include 'user' because its previous value is used in the listener condition


  // --- Auth Actions ---
  const login = async (credentials: { email: string; password?: string; provider?: 'google' | 'github' }) => {
    console.log("[AuthContext] Attempting login...");
    let error = null;
    if (credentials.provider) {
        // signInWithOAuth doesn't return user/session directly, listener handles it
        ({ error } = await supabase.auth.signInWithOAuth({ provider: credentials.provider }));
    } else if (credentials.password) {
        // signInWithPassword also relies on the listener for state updates
        ({ error } = await supabase.auth.signInWithPassword({ email: credentials.email, password: credentials.password }));
    } else {
        console.error("[AuthContext] Login attempt failed: Password or provider required.");
        throw new Error("Password or provider required for login.");
    }
    // Only log/throw if there was an immediate error initiating the process
    if (error) {
        console.error("[AuthContext] Login initiation error:", error);
        throw error;
    }
    console.log("[AuthContext] Login initiated successfully (listener will update state).");
  };

  const signup = async (credentials: { email: string; password?: string; options?: { data?: { name?: string; [key: string]: any }; emailRedirectTo?: string } }) => {
      console.log("[AuthContext] Attempting signup...");
      const userData = credentials.options?.data ?? {};
      // Ensure password is provided for email signup
      if (!credentials.password) {
           console.error("[AuthContext] Signup attempt failed: Password is required for email signup.");
           throw new Error("Password is required for email signup.");
      }
      const { data, error } = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: { ...credentials.options, data: userData }
      });
      if (error) {
          console.error("[AuthContext] Signup error:", error);
          throw error;
      }
      // Handle cases where user might exist but confirmation is needed, or if user is returned directly
       if (data.user && data.session) {
          console.log("[AuthContext] Signup successful and session created immediately.");
          // Manually update state here IF the listener doesn't fire fast enough (usually not needed)
          // setSession(data.session);
          // setUser(data.user);
          // await fetchProfile(data.user.id);
      } else if (data.user && !data.session) {
           console.log("[AuthContext] Signup successful, user created but requires confirmation (no session).");
           // User needs to confirm email, listener won't fire SIGNED_IN yet
      } else {
           console.log("[AuthContext] Signup response did not contain user or session (may require confirmation).");
      }
      console.log("[AuthContext] Signup process completed.");
  };

  const logout = async () => {
      console.log("[AuthContext] Attempting logout...");
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error("[AuthContext] Logout error:", error);
          throw error;
      }
      // Clear state manually immediately for faster UI update, listener will confirm
      setSession(null);
      setUser(null);
      setProfile(null);
      console.log("[AuthContext] Logout successful (client-side state cleared, listener should confirm).");
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

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
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

  // Define fetchProfile using useCallback to ensure stable reference
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
        .select('*') // Select all columns needed
        .eq('id', userId)
        .single();

      if (error && status !== 406) { // 406 (Not Found) is acceptable
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
  }, []); // Empty dependency array as fetchProfile only relies on stable supabase client

  // --- Full useEffect with Corrected Dependency Array ---
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
        const initialUser = initialSession?.user ?? null;
        // Set state *before* potential async profile fetch
        setSession(initialSession);
        setUser(initialUser);

        if (initialUser) {
            console.log("[AuthContext] FULL useEffect - Fetching initial profile for user:", initialUser.id);
            await fetchProfile(initialUser.id); // Fetch profile if user exists
        } else {
            console.log("[AuthContext] FULL useEffect - No initial session/user, setting profile null.");
            setProfile(null); // Ensure profile is null if no initial session
        }
        // Set loading false after all initial setup is done
        console.log("[AuthContext] FULL useEffect - *** Calling setIsAuthLoading(false) after initial check ***");
        if (isMounted) setIsAuthLoading(false);
        console.log("[AuthContext] FULL useEffect - Initial check finished, loading is now false.");
      })
      .catch((err) => {
        if (!isMounted) {
            console.log("[AuthContext] FULL useEffect - Initial getSession rejected BUT component unmounted.");
            return;
        }
        console.error("[AuthContext] FULL useEffect - Initial getSession REJECTED:", err);
        setSession(null); // Clear session state on error
        setUser(null);    // Clear user state on error
        setProfile(null); // Clear profile on error too
        console.log("[AuthContext] FULL useEffect - *** Calling setIsAuthLoading(false) after initial error ***");
         if (isMounted) setIsAuthLoading(false);
        console.log("[AuthContext] FULL useEffect - Initial check ERROR, loading is now false.");
      });

    // Attach the Listener
    console.log("[AuthContext] FULL useEffect - Attaching onAuthStateChange listener...");
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`[AuthContext] ***** onAuthStateChange FIRED! Event: ${event}, Session: ${!!newSession} *****`);

        if (!isMounted) {
            console.log("[AuthContext] onAuthStateChange: unmounted, ignoring.");
            return;
        }

        const currentUser = newSession?.user ?? null;
        // It's generally safer to compare IDs than object references for change detection
        const previousUserId = user?.id; // Read previous ID from state closure

        console.log(`[AuthContext] onAuthStateChange: Event: ${event}. Previous User ID: ${previousUserId}, New User ID: ${currentUser?.id}`);
        console.log("[AuthContext] onAuthStateChange: About to set session/user state...");
        setSession(newSession);
        setUser(currentUser); // Update user state first
        console.log(`[AuthContext] onAuthStateChange: Session/user state SET. Current user state ID is now: ${currentUser?.id}`);

        // Fetch profile on SIGNED_IN or if user ID genuinely changes
        if (event === 'SIGNED_IN' || (currentUser && currentUser.id !== previousUserId)) {
           console.log(`[AuthContext] ${event} event or user changed, fetching profile for user: ${currentUser?.id}...`);
           await fetchProfile(currentUser?.id); // Pass the CURRENT user's ID
           console.log(`[AuthContext] onAuthStateChange: Profile fetch potentially done after ${event}.`);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            console.log(`[AuthContext] User logged out or deleted (${event}), clearing profile.`);
            setProfile(null); // Clear profile
        } else if (event === 'TOKEN_REFRESHED') {
             console.log(`[AuthContext] TOKEN_REFRESHED event. Current user: ${currentUser?.id}.`);
             // Optionally re-fetch profile here if needed, but often unnecessary if only token changed
             // await fetchProfile(currentUser?.id);
        } else if (event === 'INITIAL_SESSION' && currentUser && !profile) {
             // Handle case where listener fires INITIAL_SESSION after getSession resolved but before profile was fetched
             console.log("[AuthContext] INITIAL_SESSION event with user but no profile, fetching profile...");
             await fetchProfile(currentUser.id);
        } else {
            console.log(`[AuthContext] Auth state changed (${event}), session: ${!!newSession}, no relevant user change or action needed for profile fetch.`);
        }
      }
    );

    console.log("[AuthContext] FULL useEffect - onAuthStateChange listener attached. Subscription:", authListener?.subscription ? 'Exists' : 'FAILED TO ATTACH');

    return () => {
      console.log("[AuthContext] FULL useEffect - Unmounting. Unsubscribing listener.");
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  // ---> CORRECTED Dependency Array <---
  }, [fetchProfile]); // Only include fetchProfile (memoized)
  // --- End Corrected Dependency Array ---


  // --- Auth Actions ---
  const login = async (credentials: { email: string; password?: string; provider?: 'google' | 'github' }) => {
    console.log("[AuthContext] Attempting login...");
    let error = null;
    if (credentials.provider) {
        ({ error } = await supabase.auth.signInWithOAuth({ provider: credentials.provider }));
    } else if (credentials.password) {
        ({ error } = await supabase.auth.signInWithPassword({ email: credentials.email, password: credentials.password }));
    } else {
        console.error("[AuthContext] Login attempt failed: Password or provider required.");
        throw new Error("Password or provider required for login.");
    }
    if (error) {
        console.error("[AuthContext] Login initiation error:", error);
        throw error; // Re-throw the error so the calling component knows it failed
    }
    console.log("[AuthContext] Login initiated successfully (listener should update state).");
  };

  const signup = async (credentials: { email: string; password?: string; options?: { data?: { name?: string; [key: string]: any }; emailRedirectTo?: string } }) => {
      console.log("[AuthContext] Attempting signup...");
      const userData = credentials.options?.data ?? {};
      if (!credentials.password) {
           console.error("[AuthContext] Signup attempt failed: Password is required for email signup.");
           throw new Error("Password is required for email signup.");
      }
      // Use object destructuring for the response
      const { data, error } = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: { ...credentials.options, data: userData }
      });
      if (error) {
          console.error("[AuthContext] Signup error:", error);
          throw error; // Re-throw
      }
      // Check response data structure based on Supabase docs v2+
      if (data.user && data.session) {
          console.log("[AuthContext] Signup successful and session created immediately.");
          // Listener should handle state updates, usually no manual update needed here
      } else if (data.user && !data.session) {
           console.log("[AuthContext] Signup successful, user created but requires confirmation (no session).");
           // UI should inform user to check email
      } else {
           console.log("[AuthContext] Signup response did not contain user or session (may require confirmation or be an unexpected state).");
      }
      console.log("[AuthContext] Signup process completed (check email if confirmation required).");
  };

  const logout = async () => {
      console.log("[AuthContext] Attempting logout...");
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error("[AuthContext] Logout error:", error);
          throw error; // Re-throw
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
    loading: isAuthLoading, // Use the correct loading state variable
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
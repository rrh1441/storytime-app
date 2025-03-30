// Update to src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
// Make sure your types file is generated and path is correct
import { Database } from '@/integrations/supabase/types';

// Define the shape of your user profile based on the 'users' table
type UserProfile = Database['public']['Tables']['users']['Row'] | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile;
  loading: boolean;
  login: (credentials: { email: string; password?: string; provider?: 'google' | 'github' /* add others if needed */ }) => Promise<any>;
  signup: (credentials: { email: string; password?: string; options?: { data?: { name?: string; [key: string]: any }; emailRedirectTo?: string } }) => Promise<any>; // Allow passing name in options.data
  logout: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(null);
  const [loading, setLoading] = useState(true); // Start loading true
  const navigate = useNavigate();
  const location = useLocation();

  // Function to fetch profile data
  const fetchProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
        setProfile(null);
        return;
    }
    console.log("Fetching profile for user:", userId);
    try {
        const { data: userProfile, error, status } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && status !== 406) { // 406 means 'Not Acceptable', usually indicates no row found which is fine initially
            console.error('Error fetching profile:', error);
            setProfile(null);
        } else if (userProfile) {
            console.log("Profile fetched:", userProfile);
            setProfile(userProfile);
        } else {
            console.log("No profile found for user, might be created by trigger.");
            setProfile(null); // Reset if no profile found
        }
    } catch(err) {
        console.error("Exception fetching profile:", err);
        setProfile(null);
    }
  }, []);

  // Listener for auth changes
  useEffect(() => {
    console.log("Setting up auth listener...");
    setLoading(true); // Set loading true when listener might change state

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log("Initial session fetched:", !!initialSession);
      setSession(initialSession);
      const currentUser = initialSession?.user ?? null;
      setUser(currentUser);
      fetchProfile(currentUser?.id).finally(() => setLoading(false)); // Fetch profile after getting initial session
    }).catch(err => {
        console.error("Error getting initial session:", err);
        setLoading(false);
    });


    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log("Auth state changed:", _event, !!newSession);
        setLoading(true); // Set loading true during state change
        setSession(newSession);
        const currentUser = newSession?.user ?? null;
        setUser(currentUser);
        await fetchProfile(currentUser?.id); // Fetch profile when auth state changes
        setLoading(false); // Set loading false after processing change
        
        // Handle redirect after login/signup based on returnToTab state or default to dashboard
        if (_event === 'SIGNED_IN') {
          // Check if we have a specific place to return to
          const state = location.state;
          if (state && state.from) {
            if (state.returnToTab) {
              // Return to the specific tab in StoryCreator
              navigate(state.from.pathname, { 
                state: { returnToTab: state.returnToTab },
                replace: true 
              });
            } else {
              // Just return to the previous location
              navigate(state.from, { replace: true });
            }
          } else {
            // Default redirect to dashboard if no specific return location
            navigate('/dashboard');
          }
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      console.log("Unsubscribing auth listener.");
      authListener?.subscription.unsubscribe();
    };
  }, [fetchProfile, navigate, location]); // Include navigate and location in dependencies

  // --- Auth Actions ---
  const login = async (credentials: { email: string; password?: string; provider?: 'google' | 'github' }) => {
     console.log("Attempting login...");
     setLoading(true);
     let error = null;
     if (credentials.provider) {
         ({ error } = await supabase.auth.signInWithOAuth({
             provider: credentials.provider,
             // options: { redirectTo: window.location.origin } // Example redirect
         }));
     } else if (credentials.password) {
         ({ error } = await supabase.auth.signInWithPassword({
             email: credentials.email,
             password: credentials.password,
         }));
     } else {
         setLoading(false); // Stop loading if invalid args
         throw new Error("Password or provider required for login.");
     }
     if (error) {
         console.error("Login error:", error);
         setLoading(false); // Stop loading on error
         throw error;
     }
     // Loading state will be reset by the onAuthStateChange listener
     console.log("Login initiated/successful (listener will update state).");
  };

  const signup = async (credentials: { email: string; password?: string; options?: { data?: { name?: string; [key: string]: any }; emailRedirectTo?: string } }) => {
    console.log("Attempting signup...");
    setLoading(true);
    // Ensure options and data exist before trying to access name
    const userData = credentials.options?.data ?? {};
    const { error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
          ...credentials.options,
          data: userData // Pass user metadata (like name) here
      }
    });
    if (error) {
        console.error("Signup error:", error);
        setLoading(false); // Stop loading on error
        throw error;
    }
    // Loading state will be reset by the onAuthStateChange listener
    // The handle_new_user trigger should populate the public.users table
    console.log("Signup initiated/successful (listener will update state).");
  };

  const logout = async () => {
    console.log("Attempting logout...");
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Logout error:", error);
        setLoading(false); // Stop loading on error
        throw error;
    }
    // Clear profile manually on logout for immediate UI update
    setProfile(null);
    // Loading state will be reset by the onAuthStateChange listener
    console.log("Logout initiated/successful (listener will update state).");
  };

  const value = {
    session,
    user,
    profile,
    loading,
    login,
    signup,
    logout,
  };

  // Render children only when initial loading is complete
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
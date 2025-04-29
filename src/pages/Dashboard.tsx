// src/pages/Dashboard.tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Settings, AlertCircle, CreditCard, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Tables } from '@/integrations/supabase/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

console.log("[MARKER] Dashboard.tsx mounted");

// Types
type StoryRow = Tables<'stories'>;

const SubscriptionCTA: React.FC<{ profile: ReturnType<typeof useAuth>['profile'] }> = ({ profile }) => {
  const hasActiveSubscription = profile?.active_plan_price_id && profile.subscription_status === 'active';
  if (hasActiveSubscription) return null;

  return (
    <Alert className="mb-8 bg-gradient-to-r from-storytime-blue/10 to-storytime-purple/10 border-storytime-purple/30">
      <Sparkles className="h-4 w-4 !text-storytime-purple" />
      <AlertTitle className="font-bold text-storytime-purple">Unlock More Magic!</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
        Subscribe to generate more stories, access premium features, and support StoryTime!
        <Link to="/pricing">
          <Button size="sm" className="bg-storytime-purple hover:bg-storytime-purple/90 text-white mt-2 sm:mt-0 shrink-0">
            View Plans
            <CreditCard className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
};

const Dashboard: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  console.log("[Dashboard] useAuth result:", { user, profile, authLoading });

  const userId = user?.id;

  const {
    data: userStories,
    isLoading: isLoadingStories,
    isError: isStoriesError,
    error: storiesError,
    refetch,
    isFetching,
    status,
  } = useQuery<StoryRow[], Error>({
    queryKey: ['userStories', userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID not available during query");
      console.log("[Dashboard] Fetching stories for user ID:", userId);
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error("[Dashboard] Supabase fetch error:", error);
        throw new Error(error.message);
      }
      console.log("[Dashboard] Stories fetched:", data?.length);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (userId) {
      console.log("[Dashboard] Triggering refetch for user ID:", userId);
      refetch();
    } else {
      console.warn("[Dashboard] No user.id available to trigger story fetch.");
    }
  }, [userId, refetch]);

  useEffect(() => {
    console.log("[Dashboard] Query status:", {
      status,
      isLoadingStories,
      isFetching,
      enabled: !!userId,
      userId,
    });
  }, [status, isLoadingStories, isFetching, userId]);

  const isLoading = authLoading || isLoadingStories || !userId;

  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        {(!userId && !authLoading) && (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded p-4 mb-6">
            <p className="font-semibold">AuthContext is hydrated but user.id is still undefined.</p>
            <p className="text-sm">This is likely a propagation delay or session parsing issue. Check AuthContext and Supabase session handling.</p>
          </div>
        )}

        <div className="mb-8">
          {isLoading ? (
            <>
              <Skeleton className="h-9 w-3/4 mb-2" />
              <Skeleton className="h-5 w-1/2" />
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {profile?.name || user?.email || 'Storyteller'}!
              </h1>
              <p className="text-gray-600">Create and manage your personalized children's stories.</p>
            </>
          )}
        </div>

        <Button variant="outline" onClick={() => {
          console.log("[Dashboard] Manual refetch button clicked");
          refetch();
        }} className="mb-6">
          Force Refetch
        </Button>

        {!authLoading && <SubscriptionCTA profile={profile} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link to="/create-story" className="block group">
            <div className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4 group-hover:shadow-lg transition-shadow cursor-pointer h-full border border-transparent group-hover:border-storytime-blue">
              <div className="w-12 h-12 rounded-full bg-storytime-lightBlue flex items-center justify-center shrink-0 transition-colors group-hover:bg-storytime-blue">
                <Plus className="h-6 w-6 text-storytime-purple group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg group-hover:text-storytime-blue">Create New Story</h3>
                <p className="text-sm text-gray-500">Generate a custom story</p>
              </div>
            </div>
          </Link>
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4 h-full border border-gray-200 cursor-not-allowed opacity-70">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <Settings className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-500">Voice Profiles</h3>
              <p className="text-sm text-gray-400">Record your own voice (coming soon!)</p>
            </div>
          </div>
        </div>

        {/* ... stories and recent activity section remain unchanged ... */}

      </div>
    </div>
  );
};

export default Dashboard;
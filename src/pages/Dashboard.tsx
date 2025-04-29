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

  const {
    data: userStories,
    isLoading: isLoadingStories,
    isError: isStoriesError,
    error: storiesError,
    refetch,
    isFetching,
  } = useQuery<StoryRow[], Error>({
    queryKey: ['userStories', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User ID not available during query");
      console.log("[Dashboard] Fetching stories for user ID:", user.id);
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error("[Dashboard] Supabase fetch error:", error);
        throw new Error(error.message);
      }
      console.log("[Dashboard] Stories fetched:", data?.length);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (user?.id) {
      console.log("[Dashboard] Triggering refetch for user ID:", user.id);
      refetch();
    } else {
      console.warn("[Dashboard] No user.id available to trigger story fetch.");
    }
  }, [user?.id, refetch]);

  const isLoading = authLoading || isLoadingStories || !user?.id;

  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
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

        <div className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">My Stories</h2>
          </div>

          {isLoadingStories && (
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          )}

          {!isLoadingStories && isStoriesError && (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-red-200">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-red-700">Could not load stories</h3>
              <p className="text-gray-600 mb-6">{storiesError?.message || "An unexpected error occurred."}</p>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {!isLoadingStories && userStories?.length === 0 && (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-dashed border-gray-300">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No stories yet</h3>
              <p className="text-gray-500 mb-6">Ready to create your first magical tale?</p>
              <Link to="/create-story">
                <Button className="bg-storytime-purple hover:bg-storytime-purple/90 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Create Your First Story
                </Button>
              </Link>
            </div>
          )}

          {!isLoadingStories && userStories && userStories.length > 0 && (
            <div className="bg-white rounded-lg shadow-md">
              <ul className="divide-y divide-gray-200">
                {userStories.map((story) => (
                  <li key={story.id}>
                    <Link to={`/story/${story.id}/play`} className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-md font-medium text-storytime-purple truncate">
                            {story.title || "Untitled Story"}
                          </p>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              Created {new Date(story.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
            No recent activity to display.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

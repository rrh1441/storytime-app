// src/pages/Dashboard.tsx
import React from 'react'; // Added React import
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Settings, Loader2, AlertCircle } from 'lucide-react';
// REMOVED: StoryCard import
// ADDED: Supabase/Auth/Query/Skeleton imports
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Tables } from '@/integrations/supabase/types'; // Type for story row

// Define type for fetched stories explicitly
type StoryRow = Tables<'stories'>;

const Dashboard: React.FC = () => { // Added React.FC type
  // Get user and profile from Auth context
  const { user, profile, loading: authLoading } = useAuth();

  // Fetch user's stories using React Query
  const { data: userStories, isLoading: isLoadingStories, isError: isStoriesError, error: storiesError } = useQuery<StoryRow[], Error>({
    // Query key includes user ID to refetch if user changes
    queryKey: ['userStories', user?.id],
    queryFn: async () => {
      if (!user?.id) return []; // Don't fetch if no user ID

      const { data, error } = await supabase
        .from('stories')
        .select('*') // Select specific columns if needed: 'id, title, created_at'
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); // Order by newest first

      if (error) {
        console.error("Error fetching user stories:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    // Only run the query if the user ID is available
    enabled: !!user?.id,
  });

  // Determine overall loading state
  const isLoading = authLoading || isLoadingStories;

  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        {/* Welcome Header */}
        <div className="mb-12">
          {authLoading ? (
            <Skeleton className="h-9 w-3/4 mb-2" />
          ) : (
            <h1 className="text-3xl font-bold mb-2">Welcome back, {profile?.name || user?.email || 'Storyteller'}!</h1>
          )}
           {authLoading ? (
            <Skeleton className="h-5 w-1/2" />
          ) : (
           <p className="text-gray-600">Create and manage your personalized children's stories.</p>
          )}
        </div>

        {/* Quick Actions - MODIFIED */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"> {/* Adjusted to 2 cols */}
          <Link to="/create-story">
            <div className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="w-12 h-12 rounded-full bg-storytime-lightBlue flex items-center justify-center shrink-0">
                <Plus className="h-6 w-6 text-storytime-purple" />
              </div>
              <div>
                <h3 className="font-semibold">Create New Story</h3>
                <p className="text-sm text-gray-500">Generate a custom story</p>
              </div>
            </div>
          </Link>

          {/* Voice Profiles Placeholder - MODIFIED */}
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4 h-full">
             <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <Settings className="h-6 w-6 text-gray-400" />
              </div>
            <div>
              <h3 className="font-semibold text-gray-500">Voice Profiles</h3>
              <p className="text-sm text-gray-400">Record with your own voice coming soon!</p>
            </div>
          </div>

          {/* Favorites Section REMOVED */}
        </div>

        {/* My Stories Section - MODIFIED */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">My Stories</h2>
            {/* Optional: Link to a dedicated library page if needed */}
            {/* <Link to="/stories"><Button variant="ghost">View all</Button></Link> */}
          </div>

          {/* Loading State */}
          {isLoading && (
             <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-3/4" />
             </div>
          )}

          {/* Error State */}
          {!isLoading && isStoriesError && (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-red-200">
               <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
               <h3 className="text-xl font-semibold mb-2 text-red-700">Could not load stories</h3>
               <p className="text-gray-600 mb-6">{storiesError?.message || "An unexpected error occurred."}</p>
               <Button variant="outline" onClick={() => queryClient.refetchQueries({ queryKey: ['userStories', user?.id] })}>
                    Retry
               </Button>
            </div>
          )}

           {/* Empty State */}
           {!isLoading && !isStoriesError && userStories && userStories.length === 0 && (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No stories yet</h3>
              <p className="text-gray-500 mb-6">Create your first story to get started!</p>
              <Link to="/create-story">
                <Button className="bg-storytime-purple hover:bg-storytime-purple/90 text-white">
                  Create New Story
                </Button>
              </Link>
            </div>
          )}

           {/* Story List */}
           {!isLoading && !isStoriesError && userStories && userStories.length > 0 && (
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
                                        <div className="ml-2 flex-shrink-0 flex">
                                            {/* Add badges or icons here if needed later */}
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:flex sm:justify-between">
                                        <div className="sm:flex">
                                            <p className="flex items-center text-sm text-gray-500">
                                                {/* Optional: Add creation date or other info */}
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

        {/* Recent Activity Section - MODIFIED */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
            {/* Placeholder for future implementation */}
            No recent activity to display.
            {/*
            // Example structure for when data is available:
            <ul className="divide-y">
              <li className="py-3 flex items-center">
                 <div className="w-10 h-10 rounded-full bg-storytime-lightBlue flex items-center justify-center mr-4 shrink-0">
                     <BookOpen className="h-5 w-5 text-storytime-blue" />
                 </div>
                 <div>
                     <p className="font-medium text-sm text-left">You created a new story: "Example Title"</p>
                     <p className="text-xs text-gray-500 text-left">2 days ago</p>
                 </div>
              </li>
              // ... more items
            </ul>
            */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
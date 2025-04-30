// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client'; // Using direct import as per provided code
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom'; // *** ADDED: Import Link for navigation ***
import { PlusCircle } from 'lucide-react'; // *** ADDED: Icon for the button ***

const Dashboard: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.id) {
      setReady(true);
    }
  }, [authLoading, user?.id]);

  const { data: stories, isLoading, refetch } = useQuery({
    queryKey: ['stories', user?.id],
    queryFn: async () => {
      // Ensure user is defined before accessing user.id
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, created_at, audio_url')
        .eq('user_id', user.id) // Use user.id safely here
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: ready, // ready already ensures user.id exists and authLoading is false
    staleTime: 5 * 60 * 1000,
  });

  const minutesUsed = profile?.minutes_used_this_period ?? 0;
  const minutesLimit = profile?.monthly_minutes_limit ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-6">
        {authLoading || !ready ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4">
              Welcome, {profile?.name || user?.email || 'Storyteller'}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Usage: {minutesUsed} / {minutesLimit} minutes
            </p>

            {/* *** ADDED: Button section *** */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Stories</h2>
              <Button asChild className="bg-storytime-blue hover:bg-storytime-blue/90">
                <Link to="/stories/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Story
                </Link>
              </Button>
            </div>
            {/* *** END ADDED SECTION *** */}

            {/* Story list rendering logic */}
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ) : stories && stories.length > 0 ? (
              <ul className="space-y-2">
                {stories.map((story: any) => ( // Consider defining a stricter type for story
                  <li key={story.id} className="bg-white p-4 rounded shadow">
                    <p className="font-medium">{story.title || 'Untitled Story'}</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Created {new Date(story.created_at).toLocaleDateString()}
                    </p>
                    {story.audio_url ? (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => window.open(story.audio_url, '_blank')}>Play</Button>
                        <Button variant="outline" onClick={() => navigator.clipboard.writeText(story.audio_url)}>Copy Link</Button>
                        <Button variant="outline" onClick={() => {
                          const a = document.createElement('a');
                          a.href = story.audio_url!; // Add non-null assertion if confident
                          a.download = `${story.title || 'story'}.mp3`;
                          document.body.appendChild(a); // Append before click
                          a.click();
                          document.body.removeChild(a); // Clean up element
                        }}>Download</Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No audio available</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">You haven’t created any stories yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
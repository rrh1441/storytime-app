// src/pages/Dashboard.tsx • Delay-safe version with audio support shell

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const Dashboard: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const userId = user?.id;

  const minutesUsed = profile?.minutes_used_this_period ?? 0;
  const minutesLimit = profile?.monthly_minutes_limit ?? 0;

  const {
    data: stories,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['stories', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, created_at, audio_url')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-6">
        {authLoading ? (
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
            <h2 className="text-xl font-semibold mb-2">Your Stories</h2>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ) : stories && stories.length > 0 ? (
              <ul className="space-y-2">
                {stories.map((story: any) => (
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
                          a.href = story.audio_url;
                          a.download = `${story.title || 'story'}.mp3`;
                          a.click();
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

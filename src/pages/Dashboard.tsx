// src/pages/Dashboard.tsx • Rebuilt minimalist version

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const userId = user?.id;

  const { data: stories, isLoading: isLoadingStories } = useQuery({
    queryKey: ['stories', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const minutesUsed = profile?.minutes_used_this_period ?? 0;
  const minutesLimit = profile?.monthly_minutes_limit ?? 0;

  const isLoading = authLoading || isLoadingStories;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-6">
        <h1 className="text-2xl font-bold mb-4">
          Welcome, {profile?.name || user?.email || 'Storyteller'}
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          Usage: {minutesUsed} / {minutesLimit} minutes
        </p>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-2">Your Stories</h2>
            {stories && stories.length > 0 ? (
              <ul className="space-y-2">
                {stories.map((story: any) => (
                  <li key={story.id} className="bg-white p-4 rounded shadow">
                    <p className="font-medium">{story.title || 'Untitled Story'}</p>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(story.created_at).toLocaleDateString()}
                    </p>
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

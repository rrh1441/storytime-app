// src/pages/StoryCreator.tsx
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// MODIFIED: Import useQuery
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Sparkles, BookOpen, Edit, Headphones, RotateCw, Save, Play, PenTool, Loader2, AlertCircle, LogIn, Download, Share2, MicVocal, ServerCrash // Added ServerCrash for fetch error
} from 'lucide-react';
import { Database, TablesInsert } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';

// --- NEW: Define type for fetched voice data ---
interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
  // Add other properties from the API response if needed
}
// --- End Type Definition ---

// Zod Schema remains the same
const storyParamsSchema = z.object({
  storyTitle: z.string().max(150, "Title too long").optional().nullable(),
  ageRange: z.string().min(1, "Age range is required."),
  storyLength: z.string().min(1, "Story length is required."),
  theme: z.string().min(1, "Theme is required."),
  mainCharacter: z.string().max(50).optional().nullable(),
  educationalFocus: z.string().optional().nullable(),
  additionalInstructions: z.string().max(500).optional().nullable(),
});

type StoryParamsFormValues = z.infer<typeof storyParamsSchema>;
type StoryInsertData = TablesInsert<'stories'>;

const FREE_GEN_KEY = 'storyTimeFreeGenUsed';

const StoryCreator: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [storyContent, setStoryContent] = useState<string>('');
  const [generatedStoryId, setGeneratedStoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("parameters");
  const [freeGenUsed, setFreeGenUsed] = useState<boolean>(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    const storedValue = localStorage.getItem(FREE_GEN_KEY);
    setFreeGenUsed(storedValue === 'true');
  }, []);

  const form = useForm<StoryParamsFormValues>({
    resolver: zodResolver(storyParamsSchema),
    defaultValues: { /* ... */ },
  });

  // --- NEW: Fetch ElevenLabs Voices with React Query ---
  const { data: voiceData, isLoading: isLoadingVoices, isError: isVoiceError, error: voiceError } = useQuery<{ voices: ElevenLabsVoice[] }, Error>({
      queryKey: ['elevenlabs-voices'],
      queryFn: async () => {
          console.log("Fetching ElevenLabs voices via Edge Function...");
          const { data, error } = await supabase.functions.invoke('get-elevenlabs-voices');
          if (error) {
              console.error("Edge function invocation error:", error);
              throw new Error(`Failed to fetch voices: ${error.message}`);
          }
          if (data.error) { // Check for error payload from function itself
             console.error("Edge function returned error:", data.error);
             throw new Error(`Failed to fetch voices: ${data.error}`);
          }
          if (!data || !Array.isArray(data.voices)) {
              console.error("Invalid voice data format received:", data);
              throw new Error("Received invalid data format for voices.");
          }
          console.log(`Received ${data.voices.length} voices.`);
          return data; // Structure is { voices: [...] }
      },
      staleTime: 1000 * 60 * 60, // Cache for 1 hour
      refetchOnWindowFocus: false, // Don't refetch just on focus
  });
  // --- End Fetch Voices ---

  // --- Story Generation Mutation ---
  // (Keep existing mutation logic)
  const generateStoryMutation = useMutation({ /* ... */ });

  // --- Audio Generation Mutation ---
  // (Keep existing mutation logic)
  const generateAudioMutation = useMutation({ /* ... */ });

  // --- Save Mutation ---
  // (Keep existing mutation logic)
  const saveStoryMutation = useMutation({ /* ... */ });

  // --- Generate Submit Handler ---
  // (Keep existing handler logic)
  const onGenerateSubmit: SubmitHandler<StoryParamsFormValues> = (formData) => { /* ... */ };

  // --- Save Handler ---
  // (Keep existing handler logic)
  const handleSaveStory = () => { /* ... */ };

  // --- Handle Narration Generation ---
  // (Keep existing handler logic)
  const handleGenerateNarration = () => { /* ... */ };

  // --- Render ---
  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-bold mb-4 font-display text-gray-700">Story Creator Studio</h1>

        {/* Free Gen Alert (unchanged) */}
        {/* ... */}

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                {/* TabsTriggers (unchanged) */}
                {/* ... */}
              </TabsList>

              {/* Parameters Tab Content (unchanged) */}
              <TabsContent value="parameters" className="mt-0">
                  {/* ... */}
              </TabsContent>

              {/* Edit Tab Content (unchanged) */}
              <TabsContent value="edit">
                  {/* ... */}
              </TabsContent>

              {/* Voice & Audio Tab Content (MODIFIED) */}
              <TabsContent value="voice">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Narration</CardTitle>
                    <CardDescription>Select a voice and generate the audio for your story.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Voice Selection */}
                    <div className='space-y-2'>
                       <Label htmlFor="voice-select">Choose a Voice</Label>
                       {/* Handle Loading State */}
                       {isLoadingVoices && (
                           <div className="flex items-center space-x-2 text-muted-foreground">
                               <Loader2 className="h-4 w-4 animate-spin" />
                               <span>Loading voices...</span>
                           </div>
                       )}
                       {/* Handle Error State */}
                       {isVoiceError && (
                            <Alert variant="destructive" className="flex items-center">
                                <ServerCrash className="h-4 w-4 mr-2"/>
                                <AlertDescription>
                                    Could not load voices: {voiceError?.message || 'Unknown error'}
                                </AlertDescription>
                           </Alert>
                       )}
                       {/* Render Select when data is available */}
                       {!isLoadingVoices && !isVoiceError && voiceData?.voices && (
                           <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                               <SelectTrigger id="voice-select">
                                   <SelectValue placeholder="Select a voice..." />
                               </SelectTrigger>
                               <SelectContent>
                                   {/* Map over fetched voices */}
                                   {voiceData.voices.map(voice => (
                                       <SelectItem key={voice.voice_id} value={voice.voice_id}>
                                           {voice.name} {voice.labels?.accent ? `(${voice.labels.accent})` : ''} {voice.category === 'professional' ? '(Pro)' : ''}
                                       </SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                       )}
                       {/* Optional: Show description of selected voice */}
                       {selectedVoiceId && voiceData?.voices?.find(v => v.voice_id === selectedVoiceId) && (
                           <p className='text-sm text-muted-foreground pt-1'>
                               {voiceData.voices.find(v => v.voice_id === selectedVoiceId)?.description || 'No description available.'}
                           </p>
                       )}
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerateNarration}
                        disabled={!storyContent || !selectedVoiceId || generateAudioMutation.isPending || isLoadingVoices || isVoiceError}
                        className='w-full bg-storytime-blue hover:bg-storytime-blue/90 text-white'
                    >
                        {generateAudioMutation.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Audio...</>
                        ) : (
                            <><MicVocal className="mr-2 h-4 w-4" /> Generate Narration</>
                        )}
                    </Button>

                    {/* Audio Generation Error Display */}
                    {generateAudioMutation.isError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Audio Generation Error</AlertTitle>
                            <AlertDescription>{generateAudioMutation.error.message}</AlertDescription>
                        </Alert>
                    )}

                    {/* Audio Player & Download */}
                    {generatedAudioUrl && !generateAudioMutation.isPending && (
                        <div className="space-y-4 pt-4 border-t">
                            <h4 className='font-medium'>Generated Audio:</h4>
                            <audio controls src={generatedAudioUrl} className="w-full">
                                Your browser does not support the audio element.
                            </audio>
                            <div className="flex gap-2">
                                <a
                                    href={generatedAudioUrl}
                                    download={`${form.getValues('storyTitle')?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storytime_audio'}.mp3`} // Create safer filename
                                    className="flex-1"
                                >
                                    <Button variant="outline" className="w-full">
                                        <Download className="mr-2 h-4 w-4" /> Download MP3
                                    </Button>
                                </a>
                                {/* Basic Share (Copy Link) */}
                                <Button variant="outline" size="icon" title="Copy Audio Link" onClick={() => navigator.clipboard.writeText(generatedAudioUrl).then(() => toast({ title: "Audio Link Copied!"}))}>
                                    <Share2 className="h-4 w-4" />
                                    <span className="sr-only">Copy Audio Link</span>
                                </Button>
                            </div>
                        </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Publish Tab Content (Simplified - No Login checks here) */}
              <TabsContent value="publish">
                 <Card>
                   <CardHeader><CardTitle>Publish & Share</CardTitle></CardHeader>
                   <CardContent>
                     <p className='text-center p-8 text-gray-500'>
                        {/* Simplified Placeholder */}
                        Publishing options will appear here once the story is saved by a logged-in user.
                     </p>
                      {/* Login/Save handled elsewhere */}
                   </CardContent>
                 </Card>
              </TabsContent>

            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default StoryCreator;
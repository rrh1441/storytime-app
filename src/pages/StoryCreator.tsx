import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Sparkles, BookOpen, Edit, Headphones, RotateCw, Save, Play, Pause, // Added Pause
  PenTool, Loader2, AlertCircle, LogIn, Download, Share2, MicVocal, ServerCrash, Volume2 // Added Volume2
} from 'lucide-react';
import { Database, TablesInsert } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';

// MODIFIED: Added preview_url
interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
  preview_url?: string | null; // Make sure this matches API response structure
}

// Zod Schema (unchanged)
const storyParamsSchema = z.object({ /* ... */ });
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

  // --- NEW State/Ref for Preview ---
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  // --- End NEW State/Ref ---

  useEffect(() => {
    const storedValue = localStorage.getItem(FREE_GEN_KEY);
    setFreeGenUsed(storedValue === 'true');

    // --- NEW: Cleanup audio on unmount ---
    return () => {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
    };
    // --- End NEW Cleanup ---
  }, []);

  const form = useForm<StoryParamsFormValues>({
    resolver: zodResolver(storyParamsSchema),
    defaultValues: { /* ... */ },
  });

  // Fetch ElevenLabs Voices (unchanged)
  const { data: voiceData, isLoading: isLoadingVoices, isError: isVoiceError, error: voiceError } = useQuery<{ voices: ElevenLabsVoice[] }, Error>({ /* ... */ });

  // Story Generation Mutation (unchanged)
  const generateStoryMutation = useMutation({ /* ... */ });

  // Audio Generation Mutation (unchanged)
  const generateAudioMutation = useMutation({ /* ... */ });

  // Save Mutation (unchanged)
  const saveStoryMutation = useMutation({ /* ... */ });

  // Generate Submit Handler (unchanged)
  const onGenerateSubmit: SubmitHandler<StoryParamsFormValues> = (formData) => { /* ... */ };

  // Save Handler (unchanged)
  const handleSaveStory = () => { /* ... */ };

  // Handle Narration Generation (unchanged)
  const handleGenerateNarration = () => { /* ... */ };

  // --- NEW: Handle Voice Preview ---
  const handlePreviewVoice = () => {
    if (!selectedVoiceId || !voiceData?.voices) return;

    const selectedVoice = voiceData.voices.find(v => v.voice_id === selectedVoiceId);
    const previewUrl = selectedVoice?.preview_url;

    if (!previewUrl) {
      toast({ title: "Preview Unavailable", description: "No preview audio found for this voice.", variant: "destructive" });
      return;
    }

    // If currently playing, stop and reset state
    if (previewAudioRef.current && isPreviewPlaying) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0; // Rewind
      setIsPreviewPlaying(false);
      // Clean up previous listeners if any were attached outside ref
      return; // Toggle behavior: clicking again stops it
    }

    // Stop any potentially lingering preview from another voice
    previewAudioRef.current?.pause();

    console.log("Playing preview:", previewUrl);
    const audio = new Audio(previewUrl);
    previewAudioRef.current = audio;

    const onEnded = () => {
      console.log("Preview ended");
      setIsPreviewPlaying(false);
      if(previewAudioRef.current) {
           previewAudioRef.current.removeEventListener('ended', onEnded);
           previewAudioRef.current.removeEventListener('pause', onPause); // Also remove pause listener
      }
    };
     const onPause = () => {
         console.log("Preview paused");
         // Don't set isPreviewPlaying false here if pause was triggered manually by stopping
         // Let the stop action itself handle the state
         if(previewAudioRef.current) {
             previewAudioRef.current.removeEventListener('ended', onEnded);
             previewAudioRef.current.removeEventListener('pause', onPause);
         }
     };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause); // Add pause listener too for robustness

    audio.play().then(() => {
        console.log("Preview started playing");
        setIsPreviewPlaying(true);
    }).catch(err => {
        console.error("Error playing preview:", err);
        toast({ title: "Preview Error", description: "Could not play preview audio.", variant: "destructive" });
        setIsPreviewPlaying(false);
        previewAudioRef.current = null; // Clear ref on error
    });
  };
  // --- End NEW Preview Handler ---


  // --- Render ---
  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-bold mb-4 font-display text-gray-700">Story Creator Studio</h1>
        {/* Alert (unchanged) */}
        {/* ... */}
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                 {/* TabsTriggers (unchanged) */}
                 <TabsTrigger value="parameters" className="flex items-center gap-2"><PenTool className="h-4 w-4" /><span>Parameters</span></TabsTrigger>
                 <TabsTrigger value="edit" disabled={!storyContent} className="flex items-center gap-2"><Edit className="h-4 w-4" /><span>Edit / Preview</span></TabsTrigger>
                 <TabsTrigger value="voice" disabled={!storyContent} className="flex items-center gap-2"><Headphones className="h-4 w-4" /><span>Voice & Audio</span></TabsTrigger>
                 <TabsTrigger value="publish" disabled={!storyContent} className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>Publish</span></TabsTrigger>
              </TabsList>

              {/* Parameters Tab Content (unchanged) */}
              <TabsContent value="parameters" className="mt-0">
                  {/* ... Card with Form Fields ... */}
              </TabsContent>

              {/* Edit Tab Content (unchanged) */}
               <TabsContent value="edit">
                   {/* ... Card with Edit UI ... */}
               </TabsContent>

              {/* Voice & Audio Tab Content (MODIFIED) */}
              <TabsContent value="voice">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Narration</CardTitle>
                    <CardDescription>Select a voice, preview it (optional), and generate the audio.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Voice Selection */}
                    <div className='space-y-2'>
                      <Label htmlFor="voice-select">Choose a Voice</Label>
                      <div className="flex items-center gap-2"> {/* Flex container for select and preview button */}
                        <div className="flex-grow"> {/* Select takes remaining space */}
                          {isLoadingVoices && ( <div className="flex items-center space-x-2 text-muted-foreground h-10 px-3"><Loader2 className="h-4 w-4 animate-spin" /><span>Loading voices...</span></div> )}
                          {isVoiceError && ( <Alert variant="destructive" className="flex items-center h-10"><ServerCrash className="h-4 w-4 mr-2"/><AlertDescription>Could not load voices.</AlertDescription></Alert> )}
                          {!isLoadingVoices && !isVoiceError && voiceData?.voices && (
                            <Select value={selectedVoiceId} onValueChange={(value) => {
                                // Stop preview if selection changes
                                previewAudioRef.current?.pause();
                                setIsPreviewPlaying(false);
                                setSelectedVoiceId(value);
                                setGeneratedAudioUrl(null); // Clear generated audio when voice changes
                            }}>
                              <SelectTrigger id="voice-select">
                                <SelectValue placeholder="Select a voice..." />
                              </SelectTrigger>
                              <SelectContent>
                                {voiceData.voices.map(voice => (
                                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                                    {voice.name} {voice.labels?.accent ? `(${voice.labels.accent})` : ''} {voice.category === 'professional' ? '(Pro)' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        {/* Preview Button */}
                        <Button
                          variant="outline"
                          size="icon"
                          title="Preview Selected Voice"
                          onClick={handlePreviewVoice}
                          disabled={!selectedVoiceId || isLoadingVoices || isVoiceError || !voiceData?.voices?.find(v => v.voice_id === selectedVoiceId)?.preview_url}
                        >
                          {/* Change icon based on playing state */}
                          {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          <span className="sr-only">Preview Voice</span>
                        </Button>
                      </div>
                      {/* Voice Description */}
                       {selectedVoiceId && voiceData?.voices?.find(v => v.voice_id === selectedVoiceId) && ( <p className='text-sm text-muted-foreground pt-1'>{voiceData.voices.find(v => v.voice_id === selectedVoiceId)?.description || 'No description available.'}</p> )}
                       {selectedVoiceId && !isLoadingVoices && !isVoiceError && !voiceData?.voices?.find(v => v.voice_id === selectedVoiceId)?.preview_url && (<p className='text-xs text-destructive pt-1'>Preview not available for this voice.</p>)}
                    </div>

                    {/* Generate Button */}
                    <Button onClick={handleGenerateNarration} disabled={!storyContent || !selectedVoiceId || generateAudioMutation.isPending || isLoadingVoices || isVoiceError} className='w-full bg-storytime-blue hover:bg-storytime-blue/90 text-white'>
                      {generateAudioMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Audio...</>) : (<><MicVocal className="mr-2 h-4 w-4" /> Generate Narration</>)}
                    </Button>

                    {/* Audio Generation Error Display */}
                    {generateAudioMutation.isError && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Audio Generation Error</AlertTitle><AlertDescription>{generateAudioMutation.error.message}</AlertDescription></Alert>)}

                    {/* Audio Player & Download */}
                    {generatedAudioUrl && !generateAudioMutation.isPending && (
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className='font-medium'>Generated Narration:</h4>
                        <audio controls src={generatedAudioUrl} className="w-full">Your browser does not support the audio element.</audio>
                        <div className="flex gap-2">
                          <a href={generatedAudioUrl} download={`${form.getValues('storyTitle')?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storytime_audio'}.mp3`} className="flex-1">
                            <Button variant="outline" className="w-full"><Download className="mr-2 h-4 w-4" /> Download MP3</Button>
                          </a>
                          <Button variant="outline" size="icon" title="Copy Audio Link" onClick={() => navigator.clipboard.writeText(generatedAudioUrl).then(() => toast({ title: "Audio Link Copied!"}))}><Share2 className="h-4 w-4" /><span className="sr-only">Copy Audio Link</span></Button>
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
                        {!storyContent ? 'Generate a story first.' : !user ? 'Login or Sign Up to save and publish stories.' : !generatedStoryId ? 'Please save your story before publishing.' : 'Publishing options coming soon.'}
                     </p>
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
// src/pages/StoryCreator.tsx
import React, { useState, useEffect, useRef } from 'react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sparkles, BookOpen, Edit, Headphones, RotateCw, Save, Play, Pause,
  PenTool, Loader2, AlertCircle, LogIn, Download, Share2, MicVocal, ServerCrash, Volume2
} from 'lucide-react';
import { Database, TablesInsert } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';

// Interface for fetched voice data
interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
  preview_url?: string | null;
}

// Zod Schema (title optional)
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

// --- Helper function to capitalize first letter ---
function capitalizeFirstLetter(string: string | null | undefined) {
  if (!string) return '';
  // Convert common abbreviations to full words or just capitalize first letter
  if (string.toLowerCase() === 'us') return 'US'; // Keep US uppercase
  if (string.toLowerCase() === 'uk') return 'UK'; // Keep UK uppercase
  // Otherwise, just capitalize the first letter
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}
// --- End Helper ---


const StoryCreator: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [storyContent, setStoryContent] = useState<string>('');
  const [generatedStoryId, setGeneratedStoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("parameters"); // Keep 'parameters' as ID for now, label is changed
  const [freeGenUsed, setFreeGenUsed] = useState<boolean>(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false); // Add download state
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const storedValue = localStorage.getItem(FREE_GEN_KEY);
    setFreeGenUsed(storedValue === 'true');
    // Cleanup audio on unmount
    return () => {
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current = null;
        }
    };
  }, []);

  const form = useForm<StoryParamsFormValues>({
    resolver: zodResolver(storyParamsSchema),
    defaultValues: {
      storyTitle: "",
      ageRange: "4-8",
      storyLength: "medium",
      theme: "adventure",
      mainCharacter: "",
      educationalFocus: null,
      additionalInstructions: "",
    },
  });

  // Fetch ElevenLabs Voices
  const { data: voiceData, isLoading: isLoadingVoices, isError: isVoiceError, error: voiceError } = useQuery<{ voices: ElevenLabsVoice[] }, Error>({
      queryKey: ['elevenlabs-voices'],
      queryFn: async () => {
          console.log("Fetching ElevenLabs voices via Edge Function...");
          const { data, error } = await supabase.functions.invoke('get-elevenlabs-voices');
          if (error) throw new Error(`Failed to fetch voices: ${error.message}`);
          if (data.error) throw new Error(`Failed to fetch voices: ${data.error}`);
          if (!data || !Array.isArray(data.voices)) throw new Error("Received invalid data format for voices.");
          console.log(`Received ${data.voices.length} voices.`);
          return data;
      },
      staleTime: 1000 * 60 * 60, // Cache for 1 hour
      refetchOnWindowFocus: false,
  });

    // Story Generation Mutation
    const generateStoryMutation = useMutation({
      mutationFn: async (params: { formData: StoryParamsFormValues, isAnonymous: boolean }): Promise<{ story: string, title: string, isAnonymous: boolean }> => {
        const { data, error } = await supabase.functions.invoke('anthropic-generate-story', { body: params.formData });
        if (error) throw new Error(`Edge Function Error: ${error.message}`);
        if (data.error) throw new Error(`Generation Error: ${data.error}`);
        if (!data.story || typeof data.title === 'undefined') throw new Error("Invalid response received from generation function (missing story or title).");
        return { story: data.story as string, title: data.title as string, isAnonymous: params.isAnonymous };
      },
      onSuccess: ({ story, title: returnedTitle, isAnonymous }) => {
        setStoryContent(story);
        setGeneratedStoryId(null); // Reset saved ID when generating new content
        setGeneratedAudioUrl(null); // Reset audio URL
        setSelectedVoiceId(undefined); // Reset selected voice
        const currentFormTitle = form.getValues('storyTitle');
        // Update title in form only if AI generated one and user didn't provide one
        if (returnedTitle && (!currentFormTitle || currentFormTitle.trim() === '')) {
          form.setValue('storyTitle', returnedTitle, { shouldValidate: true });
          toast({ title: "Story & Title Generated!", description: "Review your story draft and the generated title below." });
        } else {
          toast({ title: "Story Generated!", description: "Review your story draft below." });
        }
        setActiveTab("edit"); // Switch to edit tab
        // Limit check currently disabled for testing
        // if (isAnonymous) { localStorage.setItem(FREE_GEN_KEY, 'true'); setFreeGenUsed(true); }
      },
      onError: (error: Error) => {
        toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
      },
    });

    // Audio Generation Mutation
    const generateAudioMutation = useMutation({
        mutationFn: async ({ text, voiceId }: { text: string, voiceId: string }): Promise<{ audioUrl: string }> => {
            if (!text || !voiceId) throw new Error("Story text and Voice ID are required for narration.");
            const { data, error } = await supabase.functions.invoke('elevenlabs-tts', { body: { text, voiceId } });
            if (error) throw new Error(`Edge Function Error: ${error.message}`);
            if (data.error) throw new Error(`Audio Generation Error: ${data.error}`);
            if (!data.audioUrl) throw new Error("No audio URL received from function.");
            return { audioUrl: data.audioUrl as string };
        },
        onSuccess: ({ audioUrl }) => {
            setGeneratedAudioUrl(audioUrl);
            toast({ title: "Narration Generated!", description: "You can now play or download the audio." });
        },
        onError: (error: Error) => {
            console.error("Audio generation failed:", error);
            toast({ title: "Audio Generation Failed", description: error.message, variant: "destructive" });
            setGeneratedAudioUrl(null); // Reset URL on error
        },
    });

    // Save Mutation
    const saveStoryMutation = useMutation({
      mutationFn: async (storyData: StoryInsertData) => {
        if (!user?.id) throw new Error("User not logged in.");
        // Map educationalFocus from form to educational_elements array in DB
        const educationalElements = storyData.educationalFocus ? [storyData.educationalFocus] : null;
        // Prepare data, ensuring user_id, content, and title are set
        const dataToSave: StoryInsertData = {
            ...storyData,
            user_id: user.id,
            content: storyContent,
            title: storyData.title || "Untitled Story", // Fallback title
            educational_elements: educationalElements
        };
        // Remove the temporary educationalFocus field before saving
        delete (dataToSave as any).educationalFocus;
        // Use upsert to either insert or update based on the ID
        const { data, error } = await supabase
            .from('stories')
            .upsert(dataToSave)
            .select()
            .single(); // Expect a single record back

        if (error) throw error;
        return data;
      },
      onSuccess: (data) => {
        setGeneratedStoryId(data.id); // Update state with the saved/updated story ID
        toast({ title: "Story Saved!", description: "Your story has been saved to your library." });
        queryClient.invalidateQueries({ queryKey: ['stories', user?.id] }); // Invalidate queries to refetch story list
      },
      onError: (error: Error) => {
        toast({ title: "Save Failed", description: error.message, variant: "destructive" });
      },
    });

    // Generate Submit Handler
    const onGenerateSubmit: SubmitHandler<StoryParamsFormValues> = (formData) => {
      const isAnonymous = !user;
      // Limit check currently disabled
      // if (isAnonymous && freeGenUsed) { /* ... */ return; }
      generateStoryMutation.mutate({ formData, isAnonymous });
    };

    // Save Handler
    const handleSaveStory = () => {
      // Internal check for user still present for safety
      if (!user) {
          toast({ title: "Login Required", description: "Please log in or sign up to save stories.", variant: "destructive"});
          return;
      }
      if (!storyContent) {
          toast({ title: "Cannot Save", description: "No story content to save.", variant: "destructive"});
          return;
      }
      const currentFormValues = form.getValues();
      // Create the object to save, including the temporary educationalFocus field
      const storyDataToSave: Partial<StoryInsertData> & { educationalFocus?: string | null } = {
        id: generatedStoryId || undefined, // Use existing ID if available (for updates)
        user_id: user.id, // This will be overridden in mutationFn but good practice
        title: currentFormValues.storyTitle,
        content: storyContent, // Use the state variable for content
        age_range: currentFormValues.ageRange,
        themes: currentFormValues.theme ? [currentFormValues.theme] : null,
        // Include educationalFocus temporarily; it will be mapped in mutationFn
        educationalFocus: currentFormValues.educationalFocus || null,
        // If you add other fields like cover_image, characters to the form, map them here too
        // characters: currentFormValues.characters ? JSON.parse(currentFormValues.characters) : null, // Example
      };
      saveStoryMutation.mutate(storyDataToSave as StoryInsertData); // Pass the data to the mutation
    };

    // Handle Narration Generation
    const handleGenerateNarration = () => {
        if (!storyContent || !selectedVoiceId) {
            toast({title: "Missing Input", description:"Ensure story text exists and a voice is selected.", variant: "destructive"});
            return;
        }
        setGeneratedAudioUrl(null); // Clear previous audio before generating new one
        generateAudioMutation.mutate({ text: storyContent, voiceId: selectedVoiceId });
    };

    // Handle Voice Preview
     const handlePreviewVoice = () => {
       if (!selectedVoiceId || !voiceData?.voices) return;
       const selectedVoice = voiceData.voices.find(v => v.voice_id === selectedVoiceId);
       const previewUrl = selectedVoice?.preview_url;
       if (!previewUrl) { toast({ title: "Preview Unavailable", variant: "destructive" }); return; }

       // If the same preview is already playing, pause it
       if (previewAudioRef.current && previewAudioRef.current.src === previewUrl && isPreviewPlaying) {
         previewAudioRef.current.pause();
         // onPause listener will set isPreviewPlaying to false
         return;
       }

       // Pause any currently playing audio (even if different)
       previewAudioRef.current?.pause();

       // Create and play the new audio
       const audio = new Audio(previewUrl);
       previewAudioRef.current = audio;

       const onEnded = () => { setIsPreviewPlaying(false); cleanupListeners(); };
       const onPause = () => { setIsPreviewPlaying(false); cleanupListeners(); }; // Also reset on pause/stop
       const cleanupListeners = () => {
           if(previewAudioRef.current){
               previewAudioRef.current.removeEventListener('ended', onEnded);
               previewAudioRef.current.removeEventListener('pause', onPause);
           }
       };

       audio.addEventListener('ended', onEnded);
       audio.addEventListener('pause', onPause);

       audio.play().then(() => setIsPreviewPlaying(true)).catch(err => {
           console.error("Error playing preview:", err);
           toast({ title: "Preview Error", variant: "destructive" });
           setIsPreviewPlaying(false);
           previewAudioRef.current = null;
       });
     };

    // Handle Download using Blob
    const handleDownloadAudio = async () => {
        if (!generatedAudioUrl) { /* Error handling */ return; }
        setIsDownloading(true);
        toast({ title: "Starting Download...", description: "Please wait."});
        try {
            const response = await fetch(generatedAudioUrl);
            if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            // Create a safe filename
            const safeTitle = form.getValues('storyTitle')?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storytime_audio';
            const fileName = `${safeTitle}.mp3`;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl); // Clean up the object URL
            toast({ title: "Download Started", description: `Saved as ${fileName}` });
        } catch (error: any) {
            console.error("Download failed:", error);
            toast({ title: "Download Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsDownloading(false);
        }
    };

    // Helper to get selected voice details
    const selectedVoiceDetails = selectedVoiceId ? voiceData?.voices?.find(v => v.voice_id === selectedVoiceId) : null;


  // --- Render ---
  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-bold mb-4 font-display text-gray-700">Story Creator Studio</h1>
        {/* Free generation limit warning */}
        {!user && freeGenUsed && (
          <Alert variant="destructive" className="mb-6 animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Free Generation Used</AlertTitle>
            <AlertDescription>
              You've used your free story generation. Please <Link to="/login" className="underline font-medium">Login</Link> or <Link to="/signup" className="underline font-medium">Sign Up</Link> to create more.
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          {/* Use a form element even if we handle submit via button click */}
          <form onSubmit={(e) => e.preventDefault()}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="parameters" className="flex items-center gap-2"><PenTool className="h-4 w-4" /><span>Story Outline</span></TabsTrigger>
                <TabsTrigger value="edit" disabled={!storyContent} className="flex items-center gap-2"><Edit className="h-4 w-4" /><span>Edit / Preview</span></TabsTrigger>
                <TabsTrigger value="voice" disabled={!storyContent} className="flex items-center gap-2"><Headphones className="h-4 w-4" /><span>Voice & Audio</span></TabsTrigger>
                <TabsTrigger value="publish" disabled={!storyContent} className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><span>Publish</span></TabsTrigger>
              </TabsList>

              {/* Story Outline Tab Content */}
              <TabsContent value="parameters" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Story Outline</CardTitle>
                    <CardDescription>Provide the details for the story you want to create.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {/* Title (Optional) */}
                    <FormField control={form.control} name="storyTitle" render={({ field }) => (<FormItem><FormLabel>Story Title <span className="text-xs text-gray-500">(Optional - we can make one for you!)</span></FormLabel><FormControl><Input placeholder="Enter a title (or leave blank for AI)" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    {/* Age Range & Length */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="ageRange" render={({ field }) => (<FormItem><FormLabel>Age Range</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select age" /></SelectTrigger></FormControl><SelectContent><SelectItem value="0-3">0-3</SelectItem><SelectItem value="4-6">4-6</SelectItem><SelectItem value="4-8">4-8</SelectItem><SelectItem value="9-12">9-12</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="storyLength" render={({ field }) => (<FormItem><FormLabel>Length</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select length" /></SelectTrigger></FormControl><SelectContent><SelectItem value="short">Short</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="long">Long</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                    {/* Theme */}
                    <FormField control={form.control} name="theme" render={({ field }) => (<FormItem><FormLabel>Theme</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select theme" /></SelectTrigger></FormControl><SelectContent><SelectItem value="adventure">Adventure</SelectItem><SelectItem value="fantasy">Fantasy</SelectItem><SelectItem value="animals">Animals</SelectItem><SelectItem value="friendship">Friendship</SelectItem><SelectItem value="space">Space</SelectItem><SelectItem value="ocean">Ocean</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    {/* Main Character (Optional) */}
                    <FormField control={form.control} name="mainCharacter" render={({ field }) => (<FormItem><FormLabel>Main Character Name <span className="text-xs text-gray-500">(Optional)</span></FormLabel><FormControl><Input placeholder="E.g., Luna, Finn" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    {/* Educational Focus (Optional) */}
                    <FormField control={form.control} name="educationalFocus" render={({ field }) => (<FormItem><FormLabel>Educational Focus <span className="text-xs text-gray-500">(Optional)</span></FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select focus (optional)" /></SelectTrigger></FormControl><SelectContent><SelectItem value="kindness">Kindness</SelectItem><SelectItem value="courage">Courage</SelectItem><SelectItem value="curiosity">Curiosity</SelectItem><SelectItem value="perseverance">Perseverance</SelectItem><SelectItem value="teamwork">Teamwork</SelectItem><SelectItem value="patience">Patience</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    {/* Additional Instructions (Optional) */}
                    <FormField control={form.control} name="additionalInstructions" render={({ field }) => (<FormItem><FormLabel>Additional Instructions <span className="text-xs text-gray-500">(Optional)</span></FormLabel><FormControl><Textarea placeholder="E.g., Include a talking squirrel..." {...field} value={field.value ?? ""} /></FormControl><FormDescription className="text-xs">Max 500 characters.</FormDescription><FormMessage /></FormItem>)} />
                  </CardContent>
                  <CardFooter>
                    {/* Use type="button" to prevent accidental form submission */}
                    <Button type="button" onClick={form.handleSubmit(onGenerateSubmit)} disabled={generateStoryMutation.isPending} className="w-full bg-storytime-purple hover:bg-storytime-purple/90 text-white rounded-full h-11">
                      {generateStoryMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating... (est. 15-30s)</>) : (<><Sparkles className="mr-2 h-4 w-4" /> Generate Story {!user ? '(Free)' : ''}</>)}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Edit / Preview Tab Content */}
              <TabsContent value="edit">
                <Card>
                  <CardHeader>
                    <CardTitle>Edit / Preview Story</CardTitle>
                    <CardDescription>Review and edit the generated story text and title.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {/* Title Input - Connected to the form */}
                    <FormField
                      control={form.control}
                      name="storyTitle" // Links to the form state
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Story Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Story Title"
                              {...field} // Use field props from controller
                              value={field.value ?? ""} // Handle null/undefined value
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Story Content Textarea - Connected to component state */}
                    <div className="space-y-2">
                      <Label htmlFor="story-content-editor">Story Text</Label>
                      <Textarea
                        id="story-content-editor"
                        placeholder="Generated story text will appear here..."
                        value={storyContent} // Bind value to state
                        onChange={(e) => setStoryContent(e.target.value)} // Update state on change
                        rows={15} // Suggest a starting size
                        className="min-h-[300px] text-base leading-relaxed" // Basic styling
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                     <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab('parameters')} // Go back
                      >
                        <RotateCw className="mr-2 h-4 w-4" />
                        Re-generate
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setActiveTab('voice')}
                        disabled={!storyContent} // Can only proceed if there's content
                         className="bg-storytime-blue hover:bg-storytime-blue/90 text-white"
                      >
                        Next: Add Voice <Headphones className="ml-2 h-4 w-4" />
                      </Button>
                  </CardFooter>
                </Card>
              </TabsContent>


              {/* Voice & Audio Tab Content */}
              <TabsContent value="voice">
                <Card>
                  <CardHeader><CardTitle>Add Narration</CardTitle><CardDescription>Select a voice, preview it (optional), and generate the audio.</CardDescription></CardHeader>
                  <CardContent className="space-y-6">
                    {/* Voice Selection */}
                    <div className='space-y-2'>
                      <Label htmlFor="voice-select">Choose a Voice</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-grow">
                          {/* Loading/Error/Select states for voice dropdown */}
                          {isLoadingVoices && ( <div className="flex items-center space-x-2 text-muted-foreground h-10 px-3"><Loader2 className="h-4 w-4 animate-spin" /><span>Loading voices...</span></div> )}
                          {isVoiceError && ( <Alert variant="destructive" className="flex items-center h-10"><ServerCrash className="h-4 w-4 mr-2"/><AlertDescription>Could not load voices.</AlertDescription></Alert> )}
                          {!isLoadingVoices && !isVoiceError && voiceData?.voices && (
                            <Select value={selectedVoiceId} onValueChange={(value) => { previewAudioRef.current?.pause(); setIsPreviewPlaying(false); setSelectedVoiceId(value); setGeneratedAudioUrl(null); }}>
                              <SelectTrigger id="voice-select"><SelectValue placeholder="Select a voice..." /></SelectTrigger>
                              <SelectContent>
                                {voiceData.voices.map(voice => (
                                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                                    {voice.name} {voice.labels?.accent ? `(${capitalizeFirstLetter(voice.labels.accent)})` : ''} {voice.category === 'professional' ? '(Pro)' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        {/* Preview Button */}
                        <Button variant="outline" size="icon" title="Preview Selected Voice" onClick={handlePreviewVoice} disabled={!selectedVoiceId || isLoadingVoices || isVoiceError || !selectedVoiceDetails?.preview_url}>
                          {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}<span className="sr-only">Preview Voice</span>
                        </Button>
                      </div>
                      {/* Voice Description and Preview unavailable message */}
                      {selectedVoiceDetails?.description && (
                        <p className='text-sm text-muted-foreground pt-1'>{selectedVoiceDetails.description}</p>
                      )}
                      {selectedVoiceId && !isLoadingVoices && !isVoiceError && !selectedVoiceDetails?.preview_url && (<p className='text-xs text-destructive pt-1'>Preview not available for this voice.</p>)}
                    </div>

                    {/* Generate Narration Button */}
                    <Button type="button" onClick={handleGenerateNarration} disabled={!storyContent || !selectedVoiceId || generateAudioMutation.isPending || isLoadingVoices || isVoiceError} className='w-full bg-storytime-blue hover:bg-storytime-blue/90 text-white'>
                      {generateAudioMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Audio...</>) : (<><MicVocal className="mr-2 h-4 w-4" /> Generate Narration</>)}
                    </Button>

                    {/* Audio Generation Error Display */}
                    {generateAudioMutation.isError && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Audio Generation Error</AlertTitle><AlertDescription>{generateAudioMutation.error.message}</AlertDescription></Alert>)}

                    {/* Audio Player & Action Buttons (Show only when URL exists) */}
                    {generatedAudioUrl && !generateAudioMutation.isPending && (
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className='font-medium'>Listen, Share, or Save:</h4>
                        <audio controls src={generatedAudioUrl} className="w-full">Your browser does not support the audio element.</audio>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Share Button */}
                          <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(generatedAudioUrl).then(() => toast({ title: "Audio Link Copied!"}))}>
                            <Share2 className="mr-2 h-4 w-4" /> Share Your Story
                          </Button>
                          {/* Download Button */}
                          <Button type="button" variant="outline" onClick={handleDownloadAudio} disabled={isDownloading}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            {isDownloading ? 'Preparing...' : 'Download Your Story'}
                          </Button>
                          {/* Save to Library Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {/* Wrap button in span for tooltip when disabled */}
                              <span className="w-full" tabIndex={!user ? 0 : undefined}>
                                <Button
                                  type="button"
                                  onClick={handleSaveStory}
                                  // Disable if not logged in OR save is pending
                                  disabled={!user || saveStoryMutation.isPending}
                                  className="w-full bg-storytime-green hover:bg-storytime-green/90"
                                >
                                  {saveStoryMutation.isPending ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}
                                  Save to Library
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {/* Tooltip content only shows if user is not logged in */}
                            {!user && (
                              <TooltipContent>
                                <p>Please <Link to="/login" className="underline">Login</Link> or <Link to="/signup" className="underline">Sign Up</Link> to save.</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end">
                       <Button
                          type="button"
                          onClick={() => setActiveTab('publish')}
                          disabled={!storyContent || !generatedAudioUrl} // Require content and generated audio
                          className="bg-storytime-orange hover:bg-storytime-orange/90 text-white"
                      >
                          Next: Publish <BookOpen className="ml-2 h-4 w-4" />
                      </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Publish Tab Content */}
              <TabsContent value="publish">
                <Card>
                  <CardHeader>
                    <CardTitle>Publish Your Story</CardTitle>
                    <CardDescription>Make your story available in your library or share it.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6 text-center">
                     {/* Display message based on save status */}
                     {generatedStoryId && generatedAudioUrl ? (
                         <div className='space-y-3'>
                             <p className='text-green-600 font-medium'>Story saved and audio generated!</p>
                             {/* Link to reading room only if story ID exists */}
                             {generatedStoryId && (
                                <Link to={`/story/${generatedStoryId}/play`}>
                                    <Button className="bg-storytime-green hover:bg-storytime-green/90">
                                        Go to Reading Room
                                    </Button>
                                </Link>
                             )}
                         </div>
                     ) : (
                          <p className='text-muted-foreground italic'>
                            Save your story and generate audio first (on the 'Voice & Audio' tab).
                          </p>
                     )}
                  </CardContent>
                 <CardFooter className='flex justify-center'>
                     {/* Placeholder for future sharing options */}
                     {/* <p className='text-sm text-muted-foreground'>More sharing options coming soon!</p> */}
                 </CardFooter>
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
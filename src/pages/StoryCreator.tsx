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
  PenTool, Loader2, AlertCircle, LogIn, Download, Share2, MicVocal, ServerCrash, Volume2, Copy, CheckCircle
} from 'lucide-react';
import { Database, TablesInsert } from '@/integrations/supabase/types';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Interface for fetched voice data
interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
  preview_url?: string | null;
}

// --- UPDATED Zod Schema (ageRange REMOVED) ---
const storyParamsSchema = z.object({
  storyTitle: z.string().max(150, "Title too long").optional().nullable(),
  // ageRange: z.string().min(1, "Age range is required."), // REMOVED
  theme: z.string().min(1, "Theme is required."),
  mainCharacter: z.string().max(50).optional().nullable(),
  educationalFocus: z.string().optional().nullable(),
  additionalInstructions: z.string().max(500).optional().nullable(),
});
// --- END UPDATED Schema ---

type StoryParamsFormValues = z.infer<typeof storyParamsSchema>;
type StoryInsertData = TablesInsert<'stories'>;

const FREE_GEN_KEY = 'storyTimeFreeGenUsed';

// Helper function
function capitalizeFirstLetter(string: string | null | undefined) {
  if (!string) return '';
  if (string.toLowerCase() === 'us') return 'US';
  if (string.toLowerCase() === 'uk') return 'UK';
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

const StoryCreator: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [storyContent, setStoryContent] = useState<string>('');
  const [generatedStoryId, setGeneratedStoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("parameters");
  const [freeGenUsed, setFreeGenUsed] = useState<boolean>(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- ADDED: Scroll to top on initial component mount ---
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []); // Empty dependency array means this runs only once on mount
  // --- END ADDED ---

  // --- ADDED: Scroll to top when the active tab changes ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Use smooth scroll for tab changes
  }, [activeTab]); // Run this effect whenever activeTab changes
  // --- END ADDED ---

  // Existing effect for free gen check & audio cleanup
  useEffect(() => {
    const storedValue = localStorage.getItem(FREE_GEN_KEY);
    setFreeGenUsed(storedValue === 'true');
    return () => {
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current = null;
        }
    };
  }, []);

  const form = useForm<StoryParamsFormValues>({
    resolver: zodResolver(storyParamsSchema),
    // --- UPDATED defaultValues (ageRange REMOVED) ---
    defaultValues: {
      storyTitle: "",
      // ageRange: "4-8", // REMOVED
      theme: "adventure",
      mainCharacter: "",
      educationalFocus: null,
      additionalInstructions: "",
    },
    // --- END UPDATED defaultValues ---
  });

  // Fetch ElevenLabs Voices
  const { data: voiceData, isLoading: isLoadingVoices, isError: isVoiceError } = useQuery<{ voices: ElevenLabsVoice[] }, Error>({
      queryKey: ['elevenlabs-voices'],
      queryFn: async () => {
          console.log("Fetching ElevenLabs voices via Edge Function...");
          const { data, error } = await supabase.functions.invoke('get-elevenlabs-voices');
          if (error) throw new Error(`Failed to fetch voices: ${error.message}`);
          if (data?.error) throw new Error(`Failed to fetch voices: ${data.error}`);
          if (!data || !Array.isArray(data.voices)) throw new Error("Received invalid data format for voices.");
          console.log(`Received ${data.voices.length} voices.`);
          return data;
       },
      staleTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
  });

    // Story Generation Mutation
    const generateStoryMutation = useMutation({
      mutationFn: async (params: { formData: StoryParamsFormValues, isAnonymous: boolean }): Promise<{ story: string, title: string, isAnonymous: boolean }> => {
        const { data, error } = await supabase.functions.invoke('anthropic-generate-story', { body: params.formData });
        if (error) throw new Error(`Edge Function Error: ${error.message}`);
        if (data?.error) throw new Error(`Generation Error: ${data.error}`);
        if (!data?.story || typeof data.title === 'undefined') throw new Error("Invalid response received from generation function (missing story or title).");
        return { story: data.story as string, title: data.title as string, isAnonymous: params.isAnonymous };
      },
      onSuccess: ({ story, title: returnedTitle }) => {
        setStoryContent(story);
        setGeneratedStoryId(null);
        setGeneratedAudioUrl(null);
        setSelectedVoiceId(undefined);
        const currentFormTitle = form.getValues('storyTitle');
        if (returnedTitle && (!currentFormTitle || currentFormTitle.trim() === '')) {
          form.setValue('storyTitle', returnedTitle, { shouldValidate: true });
          toast({ title: "Story & Title Generated!", description: "Review the story text below. The title is the first line." });
        } else {
          toast({ title: "Story Generated!", description: "Review the story text below. The title is the first line." });
        }
        setActiveTab("edit");
        // Scroll is handled by useEffect on activeTab, but keep here just in case
        // for immediate feedback after this specific action.
        window.scrollTo(0, 0);
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
            if (data?.error) throw new Error(`Audio Generation Error: ${data.error}`);
            if (!data?.audioUrl) throw new Error("No audio URL received from function.");
            return { audioUrl: data.audioUrl as string };
        },
        onSuccess: ({ audioUrl }) => {
            setGeneratedAudioUrl(audioUrl);
            toast({ title: "Narration Generated!", description: "You can now play or download the audio." });
        },
        onError: (error: Error) => {
            console.error("Audio generation failed:", error);
            toast({ title: "Audio Generation Failed", description: error.message, variant: "destructive" });
            setGeneratedAudioUrl(null);
        },
    });

    // Save Mutation
    const saveStoryMutation = useMutation({
      mutationFn: async (storyData: StoryInsertData) => {
        if (!user?.id) throw new Error("User not logged in.");
        const educationalElements = storyData.educationalFocus ? [storyData.educationalFocus] : null;
        // Prepare data to save - ageRange is naturally excluded now
        const dataToSave: StoryInsertData = {
            ...storyData,
            user_id: user.id,
            content: storyContent,
            title: storyData.title || "Untitled Story",
            educational_elements: educationalElements,
            // No age_range field here
        };
        delete (dataToSave as any).educationalFocus; // Remove temp field
        // Ensure age_range isn't somehow present before upsert
        delete (dataToSave as any).age_range;

        const { data, error } = await supabase
            .from('stories')
            .upsert(dataToSave)
            .select()
            .single();
        if (error) throw error;
        return data;
      },
      onSuccess: (data) => {
        setGeneratedStoryId(data.id);
        toast({ title: "Story Saved!", description: "Your story has been saved to your library." });
        queryClient.invalidateQueries({ queryKey: ['userStories', user?.id] });
      },
      onError: (error: Error) => {
        toast({ title: "Save Failed", description: error.message, variant: "destructive" });
      },
    });

    // Generate Submit Handler
    const onGenerateSubmit: SubmitHandler<StoryParamsFormValues> = (formData) => {
      const isAnonymous = !user;
      // formData no longer includes ageRange
      generateStoryMutation.mutate({ formData, isAnonymous });
    };

    // Save Handler (with redirect logic)
    const handleSaveStory = () => {
      if (!user) {
          toast({
              title: "Login Required",
              description: "Please log in or sign up to save stories.",
              variant: "destructive",
              action: (
                  <>
                      {/* Pass current location in state for redirect */}
                      <Button onClick={() => navigate('/login', { state: { from: location }, replace: true })} size="sm">Login</Button>
                      <Button onClick={() => navigate('/signup', { state: { from: location }, replace: true })} size="sm" variant="outline">Sign Up</Button>
                  </>
              )
          });
          return;
      }
      if (!storyContent) {
          toast({ title: "Cannot Save", description: "No story content to save.", variant: "destructive"});
          return;
      }
      const currentFormValues = form.getValues();
      const firstLineBreak = storyContent.indexOf('\n');
      const potentialTitleFromContent = (firstLineBreak === -1 ? storyContent : storyContent.substring(0, firstLineBreak)).trim();
      const titleToSave = potentialTitleFromContent || currentFormValues.storyTitle || "Untitled Story";
      form.setValue('storyTitle', titleToSave, { shouldValidate: false });

      // Prepare data for saving - ageRange is correctly omitted
      const storyDataToSave: Partial<StoryInsertData> & { educationalFocus?: string | null } = {
        id: generatedStoryId || undefined,
        user_id: user.id,
        title: titleToSave,
        content: storyContent,
        // age_range: currentFormValues.ageRange, // REMOVED
        themes: currentFormValues.theme ? [currentFormValues.theme] : null,
        educationalFocus: currentFormValues.educationalFocus || null,
      };
      saveStoryMutation.mutate(storyDataToSave as StoryInsertData);
    };

    // Handle Narration Generation (with time estimate)
    const handleGenerateNarration = () => {
        if (!storyContent || !selectedVoiceId) {
            toast({title: "Missing Input", description:"Ensure story text exists and a voice is selected.", variant: "destructive"});
            return;
        }
        setGeneratedAudioUrl(null);
        generateAudioMutation.mutate({ text: storyContent, voiceId: selectedVoiceId });
    };

    // Handle Voice Preview
     const handlePreviewVoice = () => {
        if (!selectedVoiceId || !voiceData?.voices) return;
        const selectedVoice = voiceData.voices.find(v => v.voice_id === selectedVoiceId);
        const previewUrl = selectedVoice?.preview_url;
        if (!previewUrl) { toast({ title: "Preview Unavailable", variant: "destructive" }); return; }
        if (previewAudioRef.current && previewAudioRef.current.src === previewUrl && isPreviewPlaying) {
            previewAudioRef.current.pause(); return;
        }
        previewAudioRef.current?.pause();
        const audio = new Audio(previewUrl);
        previewAudioRef.current = audio;
        const onEnded = () => { setIsPreviewPlaying(false); cleanupListeners(); };
        const onPause = () => { setIsPreviewPlaying(false); cleanupListeners(); };
        const cleanupListeners = () => {
             if(previewAudioRef.current){
                 previewAudioRef.current.removeEventListener('ended', onEnded);
                 previewAudioRef.current.removeEventListener('pause', onPause);
             }
        };
        audio.addEventListener('ended', onEnded); audio.addEventListener('pause', onPause);
        audio.play().then(() => setIsPreviewPlaying(true)).catch(err => {
            console.error("Error playing preview:", err);
            toast({ title: "Preview Error", variant: "destructive" });
            setIsPreviewPlaying(false);
            previewAudioRef.current = null;
        });
     };

    // Handle Download using Blob
    const handleDownloadAudio = async () => {
        if (!generatedAudioUrl) return;
        setIsDownloading(true);
        toast({ title: "Starting Download...", description: "Please wait."});
        try {
            const response = await fetch(generatedAudioUrl);
            if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            const safeTitle = form.getValues('storyTitle')?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storytime_audio';
            const fileName = `${safeTitle}.mp3`;
            link.download = fileName;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
            toast({ title: "Download Started", description: `Saved as ${fileName}` });
        } catch (error: any) {
             console.error("Download failed:", error);
             toast({ title: "Download Failed", description: error.message, variant: "destructive" });
        }
        finally { setIsDownloading(false); }
    };

    // Helper to get selected voice details
    const selectedVoiceDetails = selectedVoiceId ? voiceData?.voices?.find(v => v.voice_id === selectedVoiceId) : null;


  // --- Render ---
  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-bold mb-4 font-display text-gray-700">Story Creator Studio</h1>
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
          <form onSubmit={(e) => e.preventDefault()}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
               {/* Grid cols is 4, Share tab trigger is present */}
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="parameters" className="flex items-center gap-2"><PenTool className="h-4 w-4" /><span>Story Outline</span></TabsTrigger>
                <TabsTrigger value="edit" disabled={!storyContent} className="flex items-center gap-2"><Edit className="h-4 w-4" /><span>Edit / Preview</span></TabsTrigger>
                <TabsTrigger value="voice" disabled={!storyContent} className="flex items-center gap-2"><Headphones className="h-4 w-4" /><span>Voice & Audio</span></TabsTrigger>
                <TabsTrigger value="share" disabled={!generatedStoryId || !generatedAudioUrl} className="flex items-center gap-2"><Share2 className="h-4 w-4" /><span>Share Story</span></TabsTrigger>
              </TabsList>

              {/* Story Outline Tab Content */}
              <TabsContent value="parameters" className="mt-0">
                 <Card>
                    <CardHeader>
                        <CardTitle>Story Outline</CardTitle>
                        {/* Updated Description */}
                        <CardDescription>Provide the story details (story is generated for young children, ~3 min length).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                         <FormField control={form.control} name="storyTitle" render={({ field }) => (<FormItem><FormLabel>Story Title <span className="text-xs text-gray-500">(Optional)</span></FormLabel><FormControl><Input placeholder="Enter a title (or leave blank for AI)" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                         {/* --- Age Range Field REMOVED from UI --- */}
                         <FormField control={form.control} name="theme" render={({ field }) => (<FormItem><FormLabel>Theme</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select theme" /></SelectTrigger></FormControl><SelectContent><SelectItem value="adventure">Adventure</SelectItem><SelectItem value="fantasy">Fantasy</SelectItem><SelectItem value="animals">Animals</SelectItem><SelectItem value="friendship">Friendship</SelectItem><SelectItem value="space">Space</SelectItem><SelectItem value="ocean">Ocean</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="mainCharacter" render={({ field }) => (<FormItem><FormLabel>Main Character Name <span className="text-xs text-gray-500">(Optional)</span></FormLabel><FormControl><Input placeholder="E.g., Luna, Finn" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="educationalFocus" render={({ field }) => (<FormItem><FormLabel>Educational Focus <span className="text-xs text-gray-500">(Optional)</span></FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select focus (optional)" /></SelectTrigger></FormControl><SelectContent><SelectItem value="kindness">Kindness</SelectItem><SelectItem value="courage">Courage</SelectItem><SelectItem value="curiosity">Curiosity</SelectItem><SelectItem value="perseverance">Perseverance</SelectItem><SelectItem value="teamwork">Teamwork</SelectItem><SelectItem value="patience">Patience</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="additionalInstructions" render={({ field }) => (<FormItem><FormLabel>Additional Instructions <span className="text-xs text-gray-500">(Optional)</span></FormLabel><FormControl><Textarea placeholder="E.g., Include a talking squirrel..." {...field} value={field.value ?? ""} /></FormControl><FormDescription className="text-xs">Max 500 characters.</FormDescription><FormMessage /></FormItem>)} />
                    </CardContent>
                    <CardFooter>
                        <Button type="button" onClick={form.handleSubmit(onGenerateSubmit)} disabled={generateStoryMutation.isPending} className="w-full bg-storytime-purple hover:bg-storytime-purple/90 text-white rounded-full h-11">
                            {generateStoryMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating... (est. 15-30s)</>) : (<><Sparkles className="mr-2 h-4 w-4" /> Generate Story {!user ? '(Free)' : ''}</>)}
                        </Button>
                    </CardFooter>
                 </Card>
              </TabsContent>

              {/* Edit / Preview Tab Content */}
              <TabsContent value="edit">
                 <Card>
                    <CardHeader> <CardTitle>Edit / Preview Story</CardTitle> <CardDescription>Review and edit the generated story text. The first line will be used as the title when saving.</CardDescription> </CardHeader>
                    <CardContent className="space-y-6 pt-6"> <div className="space-y-2"> <Label htmlFor="story-content-editor">Story Text (Edit Title as First Line)</Label> <Textarea id="story-content-editor" placeholder="Generated story text will appear here..." value={storyContent} onChange={(e) => setStoryContent(e.target.value)} rows={15} className="min-h-[300px] text-base leading-relaxed" /> </div> </CardContent>
                    <CardFooter className="flex justify-between"> <Button type="button" variant="outline" onClick={() => setActiveTab('parameters')}> <RotateCw className="mr-2 h-4 w-4" /> Re-generate </Button> <Button type="button" onClick={() => setActiveTab('voice')} disabled={!storyContent} className="bg-storytime-blue hover:bg-storytime-blue/90 text-white"> Next: Add Voice <Headphones className="ml-2 h-4 w-4" /> </Button> </CardFooter>
                 </Card>
              </TabsContent>

              {/* Voice & Audio Tab Content */}
              <TabsContent value="voice">
                 <Card>
                    <CardHeader><CardTitle>Add Narration</CardTitle><CardDescription>Select a voice, preview it, generate audio, and save your story.</CardDescription></CardHeader>
                    <CardContent className="space-y-6">
                        {/* Voice Selection */}
                        <div className='space-y-2'>
                            <Label htmlFor="voice-select">Choose a Voice</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex-grow">
                                    {isLoadingVoices && ( <div className="flex items-center space-x-2 text-muted-foreground h-10 px-3"><Loader2 className="h-4 w-4 animate-spin" /><span>Loading voices...</span></div> )}
                                    {isVoiceError && ( <Alert variant="destructive" className="flex items-center h-10"><ServerCrash className="h-4 w-4 mr-2"/><AlertDescription>Could not load voices.</AlertDescription></Alert> )}
                                    {!isLoadingVoices && !isVoiceError && voiceData?.voices && ( <Select value={selectedVoiceId} onValueChange={(value) => { previewAudioRef.current?.pause(); setIsPreviewPlaying(false); setSelectedVoiceId(value); setGeneratedAudioUrl(null); }}> <SelectTrigger id="voice-select"><SelectValue placeholder="Select a voice..." /></SelectTrigger> <SelectContent>{voiceData.voices.map(voice => ( <SelectItem key={voice.voice_id} value={voice.voice_id}>{voice.name} {voice.labels?.accent ? `(${capitalizeFirstLetter(voice.labels.accent)})` : ''} {voice.category === 'professional' ? '(Pro)' : ''}</SelectItem> ))}</SelectContent> </Select> )}
                                </div>
                                <Button variant="outline" size="icon" title="Preview Selected Voice" onClick={handlePreviewVoice} disabled={!selectedVoiceId || isLoadingVoices || isVoiceError || !selectedVoiceDetails?.preview_url}>
                                    {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}<span className="sr-only">Preview Voice</span>
                                </Button>
                            </div>
                            {selectedVoiceDetails?.description && ( <p className='text-sm text-muted-foreground pt-1'>{selectedVoiceDetails.description}</p> )}
                            {selectedVoiceId && !isLoadingVoices && !isVoiceError && !selectedVoiceDetails?.preview_url && (<p className='text-xs text-destructive pt-1'>Preview not available.</p>)}
                        </div>

                        {/* Generate Narration Button (with time estimate) */}
                         <Button type="button" onClick={handleGenerateNarration} disabled={!storyContent || !selectedVoiceId || generateAudioMutation.isPending || isLoadingVoices || isVoiceError} className='w-full bg-storytime-blue hover:bg-storytime-blue/90 text-white'>
                            {generateAudioMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Audio... (est. 15-60s)</>) : (<><MicVocal className="mr-2 h-4 w-4" /> Generate Narration</>)}
                        </Button>
                        {/* Audio Generation Error Display */}
                        {generateAudioMutation.isError && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Audio Generation Error</AlertTitle><AlertDescription>{generateAudioMutation.error.message}</AlertDescription></Alert>)}
                        {/* Audio Player & Action Buttons */}
                        {generatedAudioUrl && !generateAudioMutation.isPending && (
                            <div className="space-y-4 pt-4 border-t">
                            <h4 className='font-medium'>Listen, Share, or Save:</h4>
                            <audio controls src={generatedAudioUrl} className="w-full">Your browser does not support the audio element.</audio>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Button type="button" variant="outline" onClick={() => { generatedAudioUrl && navigator.clipboard.writeText(generatedAudioUrl).then(() => toast({ title: "Audio Link Copied!"}))}}> <Copy className="mr-2 h-4 w-4" /> Copy Audio Link </Button>
                                <Button type="button" variant="outline" onClick={handleDownloadAudio} disabled={isDownloading}> {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} {isDownloading ? 'Preparing...' : 'Download MP3'} </Button>
                                <Tooltip> <TooltipTrigger asChild> <span className="w-full" tabIndex={!user ? 0 : undefined}> <Button type="button" onClick={handleSaveStory} disabled={!user || saveStoryMutation.isPending} className="w-full bg-storytime-green hover:bg-storytime-green/90"> {saveStoryMutation.isPending ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)} {generatedStoryId ? 'Update Story' : 'Save to Library'} </Button> </span> </TooltipTrigger> {!user && ( <TooltipContent> <p>Please <Link to="/login" className="underline">Login</Link> or <Link to="/signup" className="underline">Sign Up</Link> to save.</p> </TooltipContent> )} </Tooltip>
                            </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end"> <Button type="button" onClick={() => setActiveTab('share')} disabled={!generatedStoryId || !generatedAudioUrl} className="bg-storytime-orange hover:bg-storytime-orange/90 text-white"> Next: Share Story <Share2 className="ml-2 h-4 w-4" /> </Button> </CardFooter>
                 </Card>
              </TabsContent>

              {/* Share Tab Content */}
               <TabsContent value="share">
                 <Card>
                    <CardHeader> <CardTitle>Share Your Story</CardTitle> <CardDescription>Your story is ready! Share it or listen in the reading room.</CardDescription> </CardHeader>
                    <CardContent className="space-y-4 pt-6 text-center">
                     {generatedStoryId && generatedAudioUrl ? ( <div className='space-y-4'> <p className='text-green-600 font-medium'> <CheckCircle className="inline-block mr-2 h-5 w-5" /> Story saved and audio generated! </p> <div className='flex flex-col sm:flex-row gap-4 justify-center'> {generatedStoryId && ( <Link to={`/story/${generatedStoryId}/play`} target="_blank" rel="noopener noreferrer"> <Button className="w-full sm:w-auto bg-storytime-green hover:bg-storytime-green/90"> <BookOpen className="mr-2 h-4 w-4"/> Open Reading Room </Button> </Link> )} {generatedAudioUrl && ( <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigator.clipboard.writeText(generatedAudioUrl).then(() => toast({ title: "Audio Link Copied!"}))}> <Copy className="mr-2 h-4 w-4"/> Copy Sharable Audio Link </Button> )} </div> </div> ) : ( <p className='text-muted-foreground italic py-8'> Please save your story and generate audio first (on the 'Voice & Audio' tab). </p> )}
                    </CardContent>
                    <CardFooter className='flex justify-center'></CardFooter>
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
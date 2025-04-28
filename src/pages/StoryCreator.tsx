// src/pages/StoryCreator.tsx

import React, {
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { API_BASE } from "@/lib/apiBase";

/* ─────────── UI components ─────────── */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Keep Input for other fields
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/* ─────────── Icons ─────────── */
import {
  Sparkles,
  Edit,
  Headphones,
  Share2,
  PenTool,
  Loader2,
  AlertCircle,
  Mic,
  PlayCircle,
  PauseCircle,
  Copy as CopyIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  Check,
  Play,
} from "lucide-react";

/* ─────────── Static data ─────────── */
const THEME_SUGGESTIONS = [
  "Adventure",
  "Friendship",
  "Magic",
  "Space",
  "Animals",
  "Kindness",
] as const;

const LENGTH_OPTIONS = [3, 5, 10, 15, 30, 60] as const;

const SUPPORTED_VOICES = [
  { id: "alloy", label: "Alex (US)" },
  { id: "echo", label: "Ethan (US)" },
  { id: "fable", label: "Felix (UK)" },
  { id: "nova", label: "Nora (US)" },
  { id: "onyx", label: "Oscar (US)" },
  { id: "shimmer", label: "Selina (US)" },
] as const;

// Bucket name in Supabase Storage
const PREVIEW_BUCKET_NAME = "voice-previews";

const SUPPORTED_LANGUAGES = [
  "Afrikaans","Arabic","Armenian","Azerbaijani","Belarusian","Bosnian","Bulgarian","Catalan","Chinese","Croatian","Czech","Danish","Dutch","English","Estonian","Finnish","French","Galician","German","Greek","Hebrew","Hindi","Hungarian","Icelandic","Indonesian","Italian","Japanese","Kannada","Kazakh","Korean","Latvian","Lithuanian","Macedonian","Malay","Marathi","Maori","Nepali","Norwegian","Persian","Polish","Portuguese","Romanian","Russian","Serbian","Slovak","Slovenian","Spanish","Swahili","Swedish","Tagalog","Tamil","Thai","Turkish","Ukrainian","Urdu","Vietnamese","Welsh",
] as const;

/* ─────────── Zod schema (Title Removed) ─────────── */
const schema = z.object({
  // REMOVED: storyTitle field
  theme: z.string().min(1, "Theme is required."),
  length: z.number().min(3).max(60),
  language: z.string().refine(
    (val) => (SUPPORTED_LANGUAGES as readonly string[]).includes(val),
    { message: "Unsupported language" },
  ),
  mainCharacter: z.string().max(50).optional().nullable(),
  educationalFocus: z.string().optional().nullable(),
  additionalInstructions: z.string().max(500).optional().nullable(),
});

// Updated FormValues type
export type FormValues = z.infer<typeof schema>;
export type ActiveTab = "parameters" | "edit" | "voice" | "share";

/* ─────────── Component ─────────── */
const StoryCreator: React.FC = () => {
  const { user } = useAuth();
  const isSubscriber = Boolean(user?.user_metadata?.subscriber); // Adjust if profile holds subscription

  /* ── state ──────────────────────────────────────────────── */
  const [storyContent, setStoryContent] = useState("");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<ActiveTab>("parameters");
  const [storyTitle, setStoryTitle] = useState<string | null>(null); // State to hold the *generated* title

  /* ── scroll-to-top on tab switch ────────────────────────── */
  const pageTopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pageTopRef.current) {
      pageTopRef.current.scrollIntoView({ behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [activeTab]);

  /* ── audio handling (No changes needed here) ────────────── */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    // ... (implementation remains the same) ...
    if (!generatedAudioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(generatedAudioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => {
          toast({ title: "Playback Error", description: "Could not load main audio.", variant: "destructive" });
          setIsPlaying(false);
      }
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Error playing main audio:", err);
          toast({
            title: "Playback error",
            description: "Unable to play audio.",
            variant: "destructive",
          });
          setIsPlaying(false);
        });
    }
  };

  const handleCopyLink = () => {
    // ... (implementation remains the same) ...
     if (!generatedAudioUrl) return;
     navigator.clipboard.writeText(generatedAudioUrl).then(() =>
       toast({
         title: "Link copied",
         description: "URL copied to clipboard.",
       }),
     );
  };

  const handleDownload = () => {
    // ... (implementation uses storyTitle state now) ...
     if (!generatedAudioUrl) return;
     const title = storyTitle || "storytime"; // Use the generated title state
     const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
     const a = document.createElement("a");
     a.href = generatedAudioUrl;
     a.download = `${safeTitle}.mp3`;
     a.style.display = "none";
     document.body.appendChild(a);
     a.click();
     a.remove();
  };

  const handleOpen = () => {
     // ... (implementation remains the same) ...
     if (!generatedAudioUrl) return;
     window.open(generatedAudioUrl, "_blank", "noopener,noreferrer");
  };

  /* ── Voice Preview Handling (No changes needed here) ────────── */
  const handleVoicePreview = (voiceId: string) => {
    // ... (implementation remains the same) ...
     setSelectedVoiceId(voiceId);
     setGeneratedAudioUrl(null); // Stop main audio if previewing

     const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
     if (!supabaseUrl) {
         console.error("VITE_SUPABASE_URL environment variable is not set.");
         toast({
             title: "Configuration Error",
             description: "Supabase URL is not configured in environment variables.",
             variant: "destructive",
         });
         return;
     }
     const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
     const previewUrl = `${baseUrl}/storage/v1/object/public/${PREVIEW_BUCKET_NAME}/${voiceId}.mp3`;


     if (!previewAudioRef.current) {
       previewAudioRef.current = new Audio();
       previewAudioRef.current.preload = "auto";
       previewAudioRef.current.onerror = (e) => {
         console.error(`Preview audio element error loading ${previewUrl}:`, e);
         const target = e.target as HTMLAudioElement;
         const errorDetails = target.error ? ` Code ${target.error.code}: ${target.error.message}` : '';
         toast({
           title: "Preview Error",
           description: `Could not load audio file from Supabase Storage. Check bucket permissions and file existence.${errorDetails}`,
           variant: "destructive",
         });
       };
     }

     previewAudioRef.current.pause();
     previewAudioRef.current.currentTime = 0;
     previewAudioRef.current.src = previewUrl;

     previewAudioRef.current.play().catch(err => {
         console.error(`Error playing preview ${previewUrl}:`, err);
          toast({
             title: "Preview Playback Error",
             description: "Could not play the audio preview file.",
             variant: "destructive",
         });
     });
  };

  /* ── form (Updated Defaults) ──────────────────────────────── */
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      // REMOVED: storyTitle
      theme: "",
      length: 3,
      language: "English",
      mainCharacter: null,
      educationalFocus: null,
      additionalInstructions: null,
    },
    mode: "onBlur", // Keep mode as is
  });

  /* ── mutations ──────────────────────────────────────────── */
  const generateStory = useMutation({
    mutationFn: async (data: FormValues) => {
      // The data object here now matches the updated FormValues type (no storyTitle)
      const r = await fetch(`${API_BASE}/generate-story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The backend (`story.ts`) will ignore any stray storyTitle if present,
        // but `data` based on the zod schema won't have it anyway.
        body: JSON.stringify(data),
      });
      if (!r.ok) {
          const errorText = await r.text();
          throw new Error(errorText || `Story generation failed with status ${r.status}`);
      }
      return (await r.json()) as { story: string; title: string }; // Expect title back
    },
    onSuccess: ({ story, title }) => { // Destructure the returned title
      setStoryContent(story);
      setStoryTitle(title); // Store the generated title in state
      setActiveTab("edit");
    },
    onError: (e: Error) =>
      toast({
        title: "Generation failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  // generateAudio mutation remains the same

  const generateAudio = useMutation({
     mutationFn: async ({ text, voiceId }: { text: string; voiceId: string; }) => {
         const language = form.getValues("language");
         const r = await fetch(`${API_BASE}/tts`, {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ text, voice: voiceId, language }),
         });
         if (!r.ok) {
             const errorText = await r.text();
             throw new Error(errorText || `Audio generation failed with status ${r.status}`);
         }
         return (await r.json()).audioUrl as string;
     },
     onSuccess: (url) => {
         setGeneratedAudioUrl(url);
         setActiveTab("share");
          if (previewAudioRef.current) {
              previewAudioRef.current.pause();
              previewAudioRef.current.currentTime = 0;
          }
     },
     onError: (e: Error) =>
         toast({
             title: "Audio failed",
             description: e.message,
             variant: "destructive",
         }),
  });


  /* ── helpers ───────────────────────────────────────────── */
  const handleThemeKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    // ... (implementation remains the same) ...
     if (e.key !== "Enter") return;
     const match = THEME_SUGGESTIONS.find((t) =>
       t.toLowerCase().startsWith(e.currentTarget.value.toLowerCase()),
     );
     if (match) form.setValue("theme", match);
  };

  const additionalChars = (
    form.watch("additionalInstructions") || ""
  ).length;
  const watchLanguage = form.watch("language");

  /* ── UI ─────────────────────────────────────────────────── */
  return (
    <div
      ref={pageTopRef}
      className="min-h-screen bg-storytime-background py-12"
    >
      <div className="container mx-auto px-6">
        <h1 className="mb-4 text-3xl font-display font-bold text-gray-700">
          Story Creator Studio
        </h1>
        {/* Add display for the generated title */}
        {storyTitle && activeTab !== 'parameters' && (
            <h2 className="text-2xl font-semibold text-storytime-purple mb-6">
                Story: <span className="italic">{storyTitle}</span>
            </h2>
        )}


        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as ActiveTab)}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="parameters">
                  <PenTool className="mr-1 h-4 w-4" />
                  Story Outline
                </TabsTrigger>
                <TabsTrigger value="edit" disabled={!storyContent}>
                  <Edit className="mr-1 h-4 w-4" />
                  Edit / Preview
                </TabsTrigger>
                <TabsTrigger value="voice" disabled={!storyContent}>
                  <Headphones className="mr-1 h-4 w-4" />
                  Voice & Audio
                </TabsTrigger>
                <TabsTrigger value="share" disabled={!generatedAudioUrl}>
                  <Share2 className="mr-1 h-4 w-4" />
                  Share Story
                </TabsTrigger>
              </TabsList>

              {/* ───────────────────────────── parameters */}
              <TabsContent value="parameters">
                <Card>
                  <CardHeader>
                    <CardTitle>Story Outline</CardTitle>
                    <CardDescription>
                      Describe the story you want the AI to create. The title will be generated automatically.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* REMOVED Story Title FormField */}

                    {/* THEME */}
                    <FormField
                       control={form.control}
                       name="theme"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>
                             Theme / Genre{" "}
                             <span className="text-red-500">*</span>
                           </FormLabel>
                           <FormControl>
                             <Input
                               {...field}
                               placeholder="e.g., Adventure, Friendship, Magic"
                               onKeyDown={handleThemeKey}
                             />
                           </FormControl>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {THEME_SUGGESTIONS.map((suggestion) => (
                                    <Button
                                        key={suggestion}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => form.setValue("theme", suggestion, { shouldValidate: true })}
                                        className={`text-xs ${form.getValues("theme") === suggestion ? 'bg-accent text-accent-foreground' : ''}`}
                                    >
                                        {suggestion}
                                    </Button>
                                ))}
                            </div>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                    {/* LENGTH */}
                    <FormField
                      control={form.control}
                      name="length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Approximate Length (minutes){" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <RadioGroup
                            className="flex flex-wrap gap-3"
                            value={String(field.value)}
                            onValueChange={(v) => field.onChange(Number(v))}
                          >
                            {LENGTH_OPTIONS.map((len) => {
                              const disabled = !isSubscriber && len !== 3; // Keep free tier logic
                              return (
                                <div key={len} className="flex items-center">
                                  <RadioGroupItem
                                    value={String(len)}
                                    id={`len-${len}`}
                                    disabled={disabled}
                                  />
                                  <Label
                                    htmlFor={`len-${len}`}
                                    className={
                                      disabled
                                        ? "ml-1 cursor-not-allowed text-muted-foreground"
                                        : "ml-1 cursor-pointer"
                                    }
                                  >
                                    {len}
                                  </Label>
                                </div>
                              );
                            })}
                          </RadioGroup>
                          {!user && ( // Show login prompt if not logged in
                               <p className="mt-1 text-xs text-muted-foreground">
                                   <Link to="/login" state={{ from: location }} className="text-primary underline">Log in</Link> or <Link to="/signup" state={{ from: location }} className="text-primary underline">sign up</Link> to create longer stories.
                               </p>
                          )}
                          {user && !isSubscriber && ( // Show upgrade prompt if logged in but not subscriber
                              <p className="mt-1 text-xs text-muted-foreground">
                                  Want longer tales? <Link to="/pricing" className="text-primary underline">Upgrade your plan!</Link>
                              </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    {/* LANGUAGE */}
                     <FormField
                         control={form.control}
                         name="language"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>
                                     Language <span className="text-red-500">*</span>
                                 </FormLabel>
                                 <FormControl>
                                     <Input
                                         {...field}
                                         list="lang-suggestions"
                                         placeholder="English, Spanish, French…"
                                     />
                                 </FormControl>
                                 <datalist id="lang-suggestions">
                                     {SUPPORTED_LANGUAGES.map((lang) => (
                                         <option key={lang} value={lang} />
                                     ))}
                                 </datalist>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />

                    {/* MAIN CHARACTER */}
                     <FormField
                         control={form.control}
                         name="mainCharacter"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Main Character (Optional)</FormLabel>
                                 <FormControl>
                                     <Input
                                         placeholder="e.g., Penelope, Hudson, Luna the Rabbit"
                                         {...field}
                                          value={field.value ?? ''} // Handle null correctly
                                     />
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />

                    {/* EDUCATIONAL FOCUS */}
                     <FormField
                         control={form.control}
                         name="educationalFocus"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Educational Focus (Optional)</FormLabel>
                                 <FormControl>
                                     <Input
                                         placeholder="e.g., Counting to 10, The Water Cycle, Being Kind"
                                         {...field}
                                         value={field.value ?? ''} // Handle null correctly
                                     />
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />

                    {/* SPECIAL REQUESTS */}
                      <FormField
                          control={form.control}
                          name="additionalInstructions"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Special Requests (Optional)</FormLabel>
                                  <FormControl>
                                      <Textarea
                                          rows={4}
                                          {...field}
                                          value={field.value ?? ''} // Handle null correctly
                                          placeholder="e.g., Make the ending happy, include a talking squirrel, avoid scary themes"
                                          />
                                  </FormControl>
                                  <p className="text-right text-sm text-muted-foreground">
                                      {additionalChars}/500
                                  </p>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="button" // Important: keep as type="button"
                      className="w-full bg-storytime-blue text-white hover:bg-storytime-blue/90"
                      disabled={
                        generateStory.isPending || !form.formState.isValid
                      }
                      // Pass validated data directly
                      onClick={form.handleSubmit((data) => generateStory.mutate(data))}
                    >
                      {generateStory.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating…(~10s)
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Story
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* ───────────────────────────── edit / preview */}
              <TabsContent value="edit">
                  {/* ... (Edit/Preview CardContent and CardFooter remain the same) ... */}
                   <Card>
                       <CardHeader>
                           <CardTitle>Edit & Preview Story</CardTitle>
                           <CardDescription>
                               Review and edit the generated story text below. The title "<span className="italic font-medium">{storyTitle || 'Generated Story'}</span>" was created by the AI.
                           </CardDescription>
                       </CardHeader>
                       <CardContent className="grid gap-4 md:grid-cols-2">
                           <div>
                               <Label htmlFor="story-editor" className="mb-1 block">
                                   Edit Text
                               </Label>
                               <Textarea
                                   id="story-editor"
                                   value={storyContent}
                                   onChange={(e) => setStoryContent(e.target.value)}
                                   rows={20}
                                   className="resize-y"
                               />
                           </div>
                           <div>
                               <Label className="mb-1 block">Preview</Label>
                               <article className="prose prose-sm max-h-[calc(theme(space.96)_*_2)] overflow-y-auto rounded-md border bg-background p-4">
                                   {storyContent
                                       .split("\n")
                                       .filter(p => p.trim() !== '')
                                       .map((p, i) => <p key={i}>{p.replace(/^#\s+/, "")}</p>)}
                               </article>
                           </div>
                       </CardContent>
                       <CardFooter>
                           <Button
                               type="button"
                               className="ml-auto bg-storytime-blue text-white hover:bg-storytime-blue/90"
                               onClick={() => setActiveTab("voice")}
                               disabled={!storyContent.trim()}
                           >
                               Continue to Voice & Audio
                           </Button>
                       </CardFooter>
                   </Card>
              </TabsContent>

              {/* ───────────────────────────── voice / audio */}
               <TabsContent value="voice">
                  {/* ... (Voice/Audio CardContent and CardFooter remain the same) ... */}
                    <Card>
                       <CardHeader>
                           <CardTitle>Add Narration</CardTitle>
                           <CardDescription>
                               Select a voice below to preview it and set it for narration. (Language: {watchLanguage})
                           </CardDescription>
                       </CardHeader>
                       <CardContent className="space-y-6">
                           {/* Voice select buttons */}
                           <div className="space-y-4">
                               <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                   {SUPPORTED_VOICES.map((v) => (
                                       <Button
                                           key={v.id}
                                           variant={selectedVoiceId === v.id ? "default" : "outline"}
                                           size="sm"
                                           onClick={() => handleVoicePreview(v.id)}
                                            className={`flex min-w-[100px] items-center justify-start gap-1.5 rounded-md px-3 py-2 text-left transition-all sm:min-w-[120px] ${
                                                selectedVoiceId === v.id
                                                    ? 'bg-storytime-blue text-white hover:bg-storytime-blue/90 ring-2 ring-offset-2 ring-storytime-blue' // Added ring for selected
                                                    : 'text-gray-700 hover:bg-gray-100' // Adjusted non-selected style
                                            }`}
                                       >
                                           {selectedVoiceId === v.id ? (
                                               <Check className="h-4 w-4 flex-shrink-0" />
                                           ) : (
                                               <Play className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                           )}
                                           <span className="truncate">{v.label}</span>
                                       </Button>
                                   ))}
                               </div>
                               <audio ref={previewAudioRef} className="hidden" preload="auto" />
                           </div>

                           <Button
                               type="button"
                               className="w-full bg-storytime-blue text-white hover:bg-storytime-blue/90"
                               onClick={() => {
                                   if (storyContent && selectedVoiceId) {
                                       generateAudio.mutate({
                                           text: storyContent,
                                           voiceId: selectedVoiceId,
                                       });
                                   }
                               }}
                               disabled={
                                   generateAudio.isPending ||
                                   !selectedVoiceId ||
                                   !storyContent.trim() ||
                                   !SUPPORTED_LANGUAGES.includes(form.getValues("language"))
                               }
                           >
                               {generateAudio.isPending ? (
                                   <>
                                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                       Generating…(~60s)
                                   </>
                               ) : (
                                   <>
                                       <Mic className="mr-2 h-4 w-4" />
                                       Generate Narration
                                   </>
                               )}
                           </Button>

                           {generateAudio.isError && (
                               <Alert variant="destructive">
                                   <AlertCircle className="h-4 w-4" />
                                   <AlertTitle>Error Generating Audio</AlertTitle>
                                   <AlertDescription>
                                       {generateAudio.error instanceof Error
                                           ? generateAudio.error.message
                                           : "An unknown error occurred."}
                                   </AlertDescription>
                               </Alert>
                           )}
                       </CardContent>
                   </Card>
              </TabsContent>

              {/* ───────────────────────────── share */}
              <TabsContent value="share">
                 {/* ... (Share CardContent and CardFooter remain the same) ... */}
                 <Card>
                     <CardHeader>
                         <CardTitle>Share Your Story: <span className="italic">{storyTitle || 'Generated Story'}</span></CardTitle>
                         <CardDescription>
                             Listen, copy link, download, or open your narrated story.
                         </CardDescription>
                     </CardHeader>
                     <CardContent>
                         <div className="flex flex-wrap justify-center gap-4">
                             {/* Play / Pause */}
                             <Button
                                 aria-label={isPlaying ? "Pause audio" : "Play audio"}
                                 className="flex items-center gap-2 rounded-full px-6 py-4 font-semibold shadow-sm transition-colors w-full sm:w-auto bg-storytime-blue text-white hover:bg-storytime-blue/90"
                                 onClick={handlePlayPause}
                                 disabled={!generatedAudioUrl || generateAudio.isPending}
                             >
                                 {isPlaying ? (
                                     <PauseCircle className="h-6 w-6" />
                                 ) : (
                                     <PlayCircle className="h-6 w-6" />
                                 )}
                                 {isPlaying ? "Pause" : "Play"}
                             </Button>

                             {/* Copy link */}
                             <Button
                                 aria-label="Copy link"
                                 className="flex items-center gap-2 rounded-full px-6 py-4 font-semibold shadow-sm transition-colors w-full sm:w-auto border-2 border-storytime-blue bg-white text-storytime-blue hover:bg-storytime-blue hover:text-white"
                                 onClick={handleCopyLink}
                                 disabled={!generatedAudioUrl || generateAudio.isPending}
                             >
                                 <CopyIcon className="h-6 w-6" />
                                 Copy
                             </Button>

                             {/* Download */}
                             <Button
                                 aria-label="Download MP3"
                                 className="flex items-center gap-2 rounded-full px-6 py-4 font-semibold shadow-sm transition-colors w-full sm:w-auto border-2 border-storytime-blue bg-white text-storytime-blue hover:bg-storytime-blue hover:text-white"
                                 onClick={handleDownload}
                                 disabled={!generatedAudioUrl || generateAudio.isPending}
                             >
                                 <DownloadIcon className="h-6 w-6" />
                                 Download
                             </Button>

                             {/* Open in new tab */}
                             <Button
                                 aria-label="Open in new tab"
                                 className="flex items-center gap-2 rounded-full px-6 py-4 font-semibold shadow-sm transition-colors w-full sm:w-auto border-2 border-storytime-blue bg-white text-storytime-blue hover:bg-storytime-blue hover:text-white"
                                 onClick={handleOpen}
                                 disabled={!generatedAudioUrl || generateAudio.isPending}
                             >
                                 <LinkIcon className="h-6 w-6" />
                                 Open
                             </Button>
                         </div>
                     </CardContent>
                      <CardFooter>
                          {!generatedAudioUrl && !generateAudio.isPending && (
                              <p className="w-full text-center text-sm text-muted-foreground">
                                  Generate narration first to enable sharing actions.
                              </p>
                          )}
                           {generateAudio.isPending && (
                              <p className="w-full text-center text-sm text-muted-foreground">
                                  Generating audio... sharing actions will be enabled shortly.
                              </p>
                          )}
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
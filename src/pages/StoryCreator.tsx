// -----------------------------------------------------------------------------
// StoryCreator.tsx  •  2025-04-28  (full file, zero truncation)
// -----------------------------------------------------------------------------
// • Scroll-to-top on tab switch
// • Share tab: four pill-style buttons (Play/Pause, Copy, Download, Open)
// • Hidden <audio> element controlled programmatically
// • Fully lint-clean, type-safe React + Tailwind code
// -----------------------------------------------------------------------------

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
import { Input } from "@/components/ui/input";
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
// Removed Select imports

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
  Check, // Added Check icon
  Play,  // Added Play icon
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

const SUPPORTED_LANGUAGES = [
  "Afrikaans","Arabic","Armenian","Azerbaijani","Belarusian","Bosnian","Bulgarian","Catalan","Chinese","Croatian","Czech","Danish","Dutch","English","Estonian","Finnish","French","Galician","German","Greek","Hebrew","Hindi","Hungarian","Icelandic","Indonesian","Italian","Japanese","Kannada","Kazakh","Korean","Latvian","Lithuanian","Macedonian","Malay","Marathi","Maori","Nepali","Norwegian","Persian","Polish","Portuguese","Romanian","Russian","Serbian","Slovak","Slovenian","Spanish","Swahili","Swedish","Tagalog","Tamil","Thai","Turkish","Ukrainian","Urdu","Vietnamese","Welsh",
] as const;

/* ─────────── Zod schema ─────────── */
const schema = z.object({
  storyTitle: z.string().max(150).optional().nullable(),
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

export type FormValues = z.infer<typeof schema>;
export type ActiveTab = "parameters" | "edit" | "voice" | "share";

/* ─────────── Component ─────────── */
const StoryCreator: React.FC = () => {
  const { user } = useAuth();
  const isSubscriber = Boolean(user?.user_metadata?.subscriber);

  /* ── state ──────────────────────────────────────────────── */
  const [storyContent, setStoryContent] = useState("");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<ActiveTab>("parameters");
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null); // For voice preview spinner

  /* ── scroll-to-top on tab switch ────────────────────────── */
  const pageTopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pageTopRef.current) {
      pageTopRef.current.scrollIntoView({ behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [activeTab]);

  /* ── audio handling ─────────────────────────────────────── */
  const audioRef = useRef<HTMLAudioElement | null>(null); // Main narration player
  const previewAudioRef = useRef<HTMLAudioElement | null>(null); // Voice preview player
  const previewCache = useRef<Record<string, string>>({}); // Cache for preview URLs
  const [isPlaying, setIsPlaying] = useState(false); // Main narration playback state

  const handlePlayPause = () => {
    if (!generatedAudioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(generatedAudioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() =>
          toast({
            title: "Playback error",
            description: "Unable to play audio.",
            variant: "destructive",
          }),
        );
    }
  };

  const handleCopyLink = () => {
    if (!generatedAudioUrl) return;
    navigator.clipboard.writeText(generatedAudioUrl).then(() =>
      toast({
        title: "Link copied",
        description: "URL copied to clipboard.",
      }),
    );
  };

  const handleDownload = () => {
    if (!generatedAudioUrl) return;
    const a = document.createElement("a");
    a.href = generatedAudioUrl;
    a.download = "storytime.mp3"; // Consider using storyTitle here
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleOpen = () => {
    if (!generatedAudioUrl) return;
    window.open(generatedAudioUrl, "_blank", "noopener,noreferrer");
  };

  /* ── Voice Preview Handling ────────────────────────────────── */
  const handleVoicePreview = async (voiceId: string) => {
    setSelectedVoiceId(voiceId); // Select the voice immediately for UI feedback
    setGeneratedAudioUrl(null); // Reset main audio if voice changes

    // Ensure preview audio element exists
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
      previewAudioRef.current.preload = "none"; // Avoid preloading until needed
      // Optional: Add error handling for the audio element itself
      previewAudioRef.current.onerror = () => {
        console.error("Preview audio element error");
        toast({
          title: "Preview Error",
          description: "Could not initialize audio player.",
          variant: "destructive",
        });
        setPreviewLoadingId(null); // Stop loading indicator on error
      };
    }

    // Pause any currently playing preview before starting new one or cached one
    previewAudioRef.current.pause();
    previewAudioRef.current.currentTime = 0;

    // Check cache first
    if (previewCache.current[voiceId]) {
      previewAudioRef.current.src = previewCache.current[voiceId];
      try {
        // No need to await play, let it run in the background
        previewAudioRef.current.play().catch(err => {
            console.error("Error playing cached preview:", err);
             toast({
                 title: "Preview Playback Error",
                 description: "Could not play cached audio preview.",
                 variant: "destructive",
             });
        });
      } catch (err) { // Catch sync errors if any (though play() returns Promise)
         console.error("Error initiating cached preview playback:", err);
         toast({
             title: "Preview Playback Error",
             description: "Could not start cached audio preview.",
             variant: "destructive",
         });
      }
      return; // Already cached, attempted playback
    }

    // Not cached, fetch URL
    setPreviewLoadingId(voiceId);
    try {
      // Use the specified endpoint structure
      const response = await fetch(`/api/tts/preview?voice=${voiceId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }
      // Expecting { signedUrl: '...' } structure based on instructions
      const data = await response.json() as { signedUrl: string };
      const signedUrl = data?.signedUrl;

      if (!signedUrl) {
          throw new Error("No signed URL received from preview endpoint.");
      }

      previewCache.current[voiceId] = signedUrl; // Cache the fetched URL
      previewAudioRef.current.src = signedUrl;
      // No need to await play, let it run in the background
      previewAudioRef.current.play().catch(err => {
          console.error("Error playing fetched preview:", err);
           toast({
               title: "Preview Playback Error",
               description: "Could not play fetched audio preview.",
               variant: "destructive",
           });
      });

    } catch (error) {
      console.error("Error fetching or playing voice preview:", error);
      toast({
        title: "Voice Preview Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setPreviewLoadingId(null); // Clear loading state regardless of outcome
    }
  };


  /* ── form ──────────────────────────────────────────────── */
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      storyTitle: "",
      theme: "",
      length: 3,
      language: "English",
    },
    mode: "onBlur",
  });

  /* ── mutations ──────────────────────────────────────────── */
  const generateStory = useMutation({
    mutationFn: async (data: FormValues) => {
      const r = await fetch(`${API_BASE}/generate-story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as { story: string; title: string };
    },
    onSuccess: ({ story, title }) => {
      setStoryContent(story);
      form.setValue("storyTitle", title || "");
      setActiveTab("edit");
    },
    onError: (e: Error) =>
      toast({
        title: "Generation failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const generateAudio = useMutation({
    mutationFn: async ({
      text,
      voiceId,
    }: {
      text: string;
      voiceId: string;
    }) => {
      const language = form.getValues("language");
      const r = await fetch(`${API_BASE}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceId, language }),
      });
      if (!r.ok) throw new Error(await r.text());
      // Assuming the main TTS endpoint returns { audioUrl: '...' }
      return (await r.json()).audioUrl as string;
    },
    onSuccess: (url) => {
      setGeneratedAudioUrl(url);
      setActiveTab("share");
      // Stop any playing preview when main audio is generated
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
                      Fill in the required fields below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* TITLE */}
                    <FormField
                      control={form.control}
                      name="storyTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Story Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="The Great Treehouse Adventure"
                              {...field}
                              value={field.value ?? ''} // Ensure controlled component
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              const disabled = !isSubscriber && len !== 3;
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
                                        ? "ml-1 text-muted-foreground"
                                        : "ml-1"
                                    }
                                  >
                                    {len}
                                  </Label>
                                </div>
                              );
                            })}
                          </RadioGroup>
                          {!isSubscriber && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Want to make longer tales?{" "}
                              <Link
                                to="/signup"
                                className="text-primary underline"
                              >
                                Sign Up
                              </Link>
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
                          <FormLabel>Main Character</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Penelope, Hudson, Luna the Rabbit"
                              {...field}
                               value={field.value ?? ''} // Ensure controlled component
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
                          <FormLabel>Educational Focus</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Counting to 10, The Water Cycle, Being Kind"
                              {...field}
                               value={field.value ?? ''} // Ensure controlled component
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
                          <FormLabel>Special Requests</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={4}
                              {...field}
                              value={field.value ?? ''} // Ensure controlled component
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
                      type="button"
                      className="w-full bg-storytime-blue text-white hover:bg-storytime-blue/90"
                      disabled={
                        generateStory.isPending || !form.formState.isValid
                      }
                      onClick={form.handleSubmit((d) =>
                        generateStory.mutate(d),
                      )}
                    >
                      {generateStory.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating…
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
                <Card>
                  <CardHeader>
                    <CardTitle>Edit & Preview</CardTitle>
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
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block">Preview</Label>
                      <article className="prose prose-sm max-h-[32rem] overflow-y-auto rounded-md bg-white p-4">
                        {storyContent
                          .split("\n")
                          .filter(p => p.trim() !== '') // Filter empty lines
                          .map((p, i) => <p key={i}>{p.replace(/^#\s+/, "")}</p>)}
                      </article>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="button"
                      className="ml-auto bg-storytime-blue text-white hover:bg-storytime-blue/90"
                      onClick={() => setActiveTab("voice")}
                      disabled={!storyContent.trim()} // Disable if story is empty
                    >
                      Continue to Voice & Audio
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* ───────────────────────────── voice / audio */}
              <TabsContent value="voice">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Narration</CardTitle>
                    <CardDescription>
                      Select voice, then generate audio. (Language:{" "}
                      {watchLanguage})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Voice select buttons */}
                    <div className="space-y-2">
                      <Label>Voice Preview & Selection</Label>
                      <p className="text-sm text-muted-foreground">
                        Click a voice to hear a preview and select it for narration.
                      </p>
                      <div className="flex flex-wrap gap-3 pt-2">
                        {SUPPORTED_VOICES.map((v) => (
                          <Button
                            key={v.id}
                            variant={selectedVoiceId === v.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleVoicePreview(v.id)}
                            // Disable only the button currently loading its preview
                            disabled={previewLoadingId === v.id}
                            className={`flex min-w-[120px] items-center justify-center gap-1.5 transition-all ${
                              selectedVoiceId === v.id
                                ? 'bg-storytime-blue text-white hover:bg-storytime-blue/90'
                                : ''
                            }`}
                          >
                            {previewLoadingId === v.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : selectedVoiceId === v.id ? (
                              <Check className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <Play className="h-4 w-4 flex-shrink-0" />
                            )}
                            <span className="flex-grow text-left">{v.label}</span>
                          </Button>
                        ))}
                      </div>
                      {/* Hidden audio player for previews */}
                      <audio ref={previewAudioRef} className="hidden" preload="none" />
                    </div>

                    {/* Generate audio button */}
                    <Button
                      type="button"
                      className="w-full bg-storytime-blue text-white hover:bg-storytime-blue/90"
                      onClick={() => {
                        // Language validation happens via the disabled state now
                        if (storyContent && selectedVoiceId) {
                          generateAudio.mutate({
                            text: storyContent,
                            voiceId: selectedVoiceId,
                          });
                        } else {
                          // This toast might be redundant if button disabled state is accurate
                          toast({
                            title: "Missing input",
                            description:
                              "Ensure story text exists and a voice is selected.",
                            variant: "destructive",
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
                          Generating…
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
                <Card>
                  <CardHeader>
                    <CardTitle>Share Your Story</CardTitle>
                    <CardDescription>
                      Quick actions for your narrated story.
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
                      <p className="text-sm text-muted-foreground w-full text-center">
                        Generate narration first to enable sharing actions.
                      </p>
                    )}
                     {generateAudio.isPending && (
                      <p className="text-sm text-muted-foreground w-full text-center">
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
// -----------------------------------------------------------------------------
// StoryCreator.tsx  •  2025‑04‑28  (rewritten per 2025‑04‑28 request)
// -----------------------------------------------------------------------------
// • Scrolls to page top on every tab change
// • Dramatically improved Share tab UI (copy / download / social share ready)
// • Minor lint fixes & type‑safety improvements
// • No functional changes to generation / TTS logic
// -----------------------------------------------------------------------------

import React, { useEffect, useRef, useState, KeyboardEvent } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  Copy as CopyIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
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

/**
 * The six friendly names shown in the UI.
 * id  → OpenAI voice ID   •   label → user‑visible string
 */
const SUPPORTED_VOICES = [
  { id: "alloy", label: "Alex (US)" },
  { id: "echo", label: "Ethan (US)" },
  { id: "fable", label: "Felix (UK)" },
  { id: "nova", label: "Nora (US)" },
  { id: "onyx", label: "Oscar (US)" },
  { id: "shimmer", label: "Selina (US)" },
] as const;

const SUPPORTED_LANGUAGES = [
  "Afrikaans","Arabic","Armenian","Azerbaijani","Belarusian","Bosnian","Bulgarian","Catalan","Chinese","Croatian","Czech","Danish","Dutch","English","Estonian","Finnish","French","Galician","German","Greek","Hebrew","Hindi","Hungarian","Icelandic","Indonesian","Italian","Japanese","Kannada","Kazakh","Korean","Latvian","Lithuanian","Macedonian","Malay","Marathi","Maori","Nepali","Norwegian","Persian","Polish","Portuguese","Romanian","Russian","Serbian","Slovak","Slovenian","Spanish","Swahili","Swedish","Tagalog","Tamil","Thai","Turkish","Ukrainian","Urdu","Vietnamese","Welsh",
] as const;

/* ─────────── Zod schema ─────────── */
const schema = z.object({
  storyTitle: z.string().max(150).optional().nullable(),
  theme: z.string().min(1, "Theme is required."),
  length: z.number().min(3).max(60),
  language: z
    .string()
    .refine((val) => (SUPPORTED_LANGUAGES as readonly string[]).includes(val), {
      message: "Unsupported language",
    }),
  mainCharacter: z.string().max(50).optional().nullable(),
  educationalFocus: z.string().optional().nullable(),
  additionalInstructions: z.string().max(500).optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

type ActiveTab = "parameters" | "edit" | "voice" | "share";

/* ─────────── Component ─────────── */
const StoryCreator: React.FC = () => {
  const { user } = useAuth();
  const isSubscriber = Boolean(user?.user_metadata?.subscriber);

  const [storyContent, setStoryContent] = useState<string>("");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>();
  const [activeTab, setActiveTab] = useState<ActiveTab>("parameters");

  /* ref for top‑of‑page scrolling */
  const pageTopRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to top of page whenever the active tab changes.
   * Using instant scroll for accessibility; change to "smooth" if desired.
   */
  useEffect(() => {
    if (pageTopRef.current) pageTopRef.current.scrollIntoView({ behavior: "instant" });
    // Fallback – if ref missing, scroll whole window
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab]);

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

  /* ── mutations ────────────────────────────────────────────────────────── */
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
    mutationFn: async ({ text, voiceId }: { text: string; voiceId: string }) => {
      const language = form.getValues("language");
      const r = await fetch(`${API_BASE}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceId, language }),
      });
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()).audioUrl as string;
    },
    onSuccess: (url) => {
      setGeneratedAudioUrl(url);
      setActiveTab("share");
    },
    onError: (e: Error) =>
      toast({
        title: "Audio failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  /* ── helpers ──────────────────────────────────────────────────────────── */
  const handleThemeKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const match = THEME_SUGGESTIONS.find((t) =>
      t.toLowerCase().startsWith(e.currentTarget.value.toLowerCase()),
    );
    if (match) form.setValue("theme", match);
  };

  const additionalChars = (form.watch("additionalInstructions") || "").length;
  const watchLanguage = form.watch("language");

  /* ── UI ───────────────────────────────────────────────────────────────── */
  return (
    <div ref={pageTopRef} className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <h1 className="mb-4 text-3xl font-display font-bold text-gray-700">
          Story Creator Studio
        </h1>

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} noValidate>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as ActiveTab)}
              className="space-y-6"
            >
              {/* ── TAB HEADERS ───────────────────────────────────────── */}
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="parameters">
                  <PenTool className="mr-1 h-4 w-4" />
                  Story Outline
                </TabsTrigger>
                <TabsTrigger value="edit" disabled={!storyContent}>
                  <Edit className="mr-1 h-4 w-4" />
                  Edit / Preview
                </TabsTrigger>
                <TabsTrigger value="voice" disabled={!storyContent}>
                  <Headphones className="mr-1 h-4 w-4" />
                  Voice & Audio
                </TabsTrigger>
                <TabsTrigger value="share" disabled={!generatedAudioUrl}>
                  <Share2 className="mr-1 h-4 w-4" />
                  Share Story
                </TabsTrigger>
              </TabsList>

              {/* ── PARAMETERS TAB ─────────────────────────────────────── */}
              <TabsContent value="parameters">
                <Card>
                  <CardHeader>
                    <CardTitle>Story Outline</CardTitle>
                    <CardDescription>Fill in the required fields below.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* TITLE */}
                    <FormField
                      control={form.control}
                      name="storyTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Story Title</FormLabel>
                          <FormControl>
                            <Input placeholder="The Great Treehouse Adventure" {...field} />
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
                            Theme / Genre <span className="text-red-500">*</span>
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
                            Approximate Length (minutes) <span className="text-red-500">*</span>
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
                                    className={disabled ? "ml-1 text-muted-foreground" : "ml-1"}
                                  >
                                    {len}
                                  </Label>
                                </div>
                              );
                            })}
                          </RadioGroup>
                          {!isSubscriber && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Want to make longer tales? <Link to="/signup" className="text-primary underline">Sign Up</Link>
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
                            <Input {...field} list="lang-suggestions" placeholder="English, Spanish, French…" />
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
                          <FormLabel>Main Character</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Penelope, Hudson, Luna the Rabbit" {...field} />
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
                          <FormLabel>Educational Focus</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Counting to 10, The Water Cycle, Being Kind" {...field} />
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
                          <FormLabel>Special Requests</FormLabel>
                          <FormControl>
                            <Textarea rows={4} {...field} />
                          </FormControl>
                          <p className="text-right text-sm text-muted-foreground">{additionalChars}/500</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="button"
                      className="w-full bg-storytime-blue text-white"
                      disabled={generateStory.isPending || !form.formState.isValid}
                      onClick={form.handleSubmit((d) => generateStory.mutate(d))}
                    >
                      {generateStory.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" /> Generate Story
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* ── EDIT / PREVIEW TAB ─────────────────────────────────── */}
              <TabsContent value="edit">
                <Card>
                  <CardHeader>
                    <CardTitle>Edit & Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="story-editor" className="mb-1 block">
                        Edit Text
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
                          .map((p) => p.replace(/^#\s+/, ""))
                          .map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                      </article>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="button"
                      className="ml-auto bg-storytime-blue text-white"
                      onClick={() => setActiveTab("voice")}
                    >
                      Continue to Voice & Audio
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* ── VOICE & AUDIO TAB ─────────────────────────────────── */}
              <TabsContent value="voice">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Narration</CardTitle>
                    <CardDescription>
                      Select voice, then generate audio. (Language: {watchLanguage})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* voice select */}
                    <div className="space-y-2">
                      <Label htmlFor="voice-select">Voice</Label>
                      <Select
                        value={selectedVoiceId}
                        onValueChange={(v) => {
                          setSelectedVoiceId(v);
                          setGeneratedAudioUrl(null);
                        }}
                      >
                        <SelectTrigger id="voice-select">
                          <SelectValue placeholder="Choose a voice" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_VOICES.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* generate audio */}
                    <Button
                      type="button"
                      className="w-full bg-storytime-blue text-white"
                      onClick={() => {
                        const langVal = form.getValues("language");
                        if (!SUPPORTED_LANGUAGES.includes(langVal)) {
                          toast({
                            title: "Unsupported language",
                            description: "Please choose a supported language.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (storyContent && selectedVoiceId) {
                          generateAudio.mutate({ text: storyContent, voiceId: selectedVoiceId });
                        } else {
                          toast({
                            title: "Missing input",
                            description: "Provide story text and select a voice.",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={
                        generateAudio.isPending ||
                        !selectedVoiceId ||
                        !SUPPORTED_LANGUAGES.includes(form.getValues("language"))
                      }
                    >
                      {generateAudio.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" /> Generate Narration
                        </>
                      )}
                    </Button>

                    {generateAudio.isError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{generateAudio.error.message}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── SHARE TAB ─────────────────────────────────────────── */}
              <TabsContent value="share">
                <Card className="relative overflow-hidden border border-primary/20 shadow-lg">
                  {/* Decorative header wave */}
                  <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-primary via-storytime-blue to-primary opacity-60" />

                  <CardHeader className="pb-2 pt-6">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Share2 className="h-5 w-5" /> Share Your Story
                    </CardTitle>
                    <CardDescription>Enjoy your narrated adventure and share it widely!</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* AUDIO PLAYER */}
                    {generatedAudioUrl && (
                      <audio controls src={generatedAudioUrl} className="w-full rounded-lg border border-muted" />
                    )}

                    {/* URL BOX WITH COPY */}
                    <div className="flex flex-col gap-2 md:flex-row">
                      <Input
                        readOnly
                        value={generatedAudioUrl ?? ""}
                        onFocus={(e) => e.currentTarget.select()}
                        className="flex-1 font-mono text-xs"
                        aria-label="Shareable URL"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          if (!generatedAudioUrl) return;
                          navigator.clipboard.writeText(generatedAudioUrl);
                          toast({ title: "Copied!", description: "Link copied to clipboard." });
                        }}
                        className="shrink-0"
                      >
                        <CopyIcon className="mr-1 h-4 w-4" /> Copy
                      </Button>
                    </div>

                    {/* DOWNLOAD & OPEN BUTTONS */}
                    <div className="flex flex-wrap items-center gap-4">
                      <a
                        href={generatedAudioUrl ?? "#"}
                        download="storytime.mp3"
                        className="inline-flex"
                        aria-label="Download MP3"
                      >
                        <Button type="button" variant="outline" disabled={!generatedAudioUrl}>
                          <DownloadIcon className="mr-2 h-4 w-4" /> Download MP3
                        </Button>
                      </a>

                      <a
                        href={generatedAudioUrl ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                        aria-label="Open in new tab"
                      >
                        <Button type="button" variant="ghost" disabled={!generatedAudioUrl}>
                          <LinkIcon className="mr-2 h-4 w-4" /> Open in New Tab
                        </Button>
                      </a>
                    </div>

                    {/* SOCIAL SHARE PLACEHOLDER (ready for future) */}
                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Integrate your preferred social‑share component here.
                    </div>
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

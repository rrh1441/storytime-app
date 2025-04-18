// -----------------------------------------------------------------------------
// StoryCreator.tsx  •  2025‑04‑18  (FULL FILE — uses Fly backend, no Supabase Edge)
// -----------------------------------------------------------------------------
import React, { useState, KeyboardEvent } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate, useLocation } from "react-router-dom";

/* ─────────── UI components ─────────── */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

/* ─────────────── Icons ─────────────── */
import {
  Sparkles,
  Edit,
  Headphones,
  Share2,
  PenTool,
  Loader2,
  AlertCircle,
  Mic,
  Info,
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
  { id: "alloy", label: "Alex (US • Neutral Male)" },
  { id: "ash", label: "Aisha (US • Warm Female)" },
  { id: "ballad", label: "Bella (UK • Lyrical Female)" },
  { id: "coral", label: "Chloe (AU • Bright Female)" },
  { id: "echo", label: "Ethan (US • Friendly Male)" },
  { id: "fable", label: "Felix (UK • Storyteller Male)" },
  { id: "nova", label: "Nora (US • Energetic Female)" },
  { id: "onyx", label: "Oscar (US • Deep Male)" },
  { id: "sage", label: "Saanvi (IN • Clear Female)" },
  { id: "shimmer", label: "Selina (US • Expressive Female)" },
] as const;
const SUPPORTED_LANGUAGES = [
  "Afrikaans","Arabic","Armenian","Azerbaijani","Belarusian","Bosnian","Bulgarian",
  "Catalan","Chinese","Croatian","Czech","Danish","Dutch","English","Estonian",
  "Finnish","French","Galician","German","Greek","Hebrew","Hindi","Hungarian",
  "Icelandic","Indonesian","Italian","Japanese","Kannada","Kazakh","Korean",
  "Latvian","Lithuanian","Macedonian","Malay","Marathi","Maori","Nepali",
  "Norwegian","Persian","Polish","Portuguese","Romanian","Russian","Serbian",
  "Slovak","Slovenian","Spanish","Swahili","Swedish","Tagalog","Tamil","Thai",
  "Turkish","Ukrainian","Urdu","Vietnamese","Welsh",
] as const;

/* ─────────── Schema ─────────── */
const schema = z.object({
  storyTitle: z.string().max(150).optional().nullable(),
  theme: z.string().min(1, "Theme is required."),
  length: z.number().min(3).max(60),
  mainCharacter: z.string().max(50).optional().nullable(),
  educationalFocus: z.string().optional().nullable(),
  additionalInstructions: z.string().max(500).optional().nullable(),
});
type FormValues = z.infer<typeof schema>;

/* ─────────── Component ─────────── */
const StoryCreator: React.FC = () => {
  const { user } = useAuth();
  const isSubscriber = Boolean(user?.user_metadata?.subscriber);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [storyContent, setStoryContent] = useState("");
  const [generatedAudioUrl, setGeneratedAudioUrl] =
    useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>();
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [activeTab, setActiveTab] =
    useState<"parameters" | "edit" | "voice" | "share">("parameters");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      storyTitle: "",
      theme: "",
      length: 3,
      mainCharacter: "",
      educationalFocus: "",
      additionalInstructions: "",
    },
  });

  /* ---- mutations (hit Fly backend) ---- */
  const generateStory = useMutation({
    mutationFn: async (data: FormValues) => {
      const resp = await fetch("/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!resp.ok) throw new Error(await resp.text());
      return (await resp.json()) as { story: string; title: string };
    },
    onSuccess: ({ story, title }) => {
      setStoryContent(story);
      form.setValue("storyTitle", title || "");
      setActiveTab("edit");
    },
    onError: (err: Error) =>
      toast({
        title: "Generation failed",
        description: err.message,
        variant: "destructive",
      }),
  });

  const generateAudio = useMutation({
    mutationFn: async ({ text, voiceId }: { text: string; voiceId: string }) => {
      const resp = await fetch("/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceId, language: selectedLanguage }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const { audioUrl } = (await resp.json()) as { audioUrl: string };
      return audioUrl;
    },
    onSuccess: (url) => {
      setGeneratedAudioUrl(url);
      setActiveTab("share");
    },
    onError: (err: Error) =>
      toast({
        title: "Audio failed",
        description: err.message,
        variant: "destructive",
      }),
  });

  const submitOutline: SubmitHandler<FormValues> = (data) =>
    generateStory.mutate(data);

  const handleThemeKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const match = THEME_SUGGESTIONS.find((t) =>
      t.toLowerCase().startsWith(e.currentTarget.value.toLowerCase()),
    );
    if (match) form.setValue("theme", match);
  };

  const addTextLen = (form.watch("additionalInstructions") || "").length;

  /* ---- render ---- */
  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <h1 className="mb-4 text-3xl font-display font-bold text-gray-700">
          Story Creator Studio
        </h1>

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
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

              {/* -------- parameters -------- */}
              <TabsContent value="parameters">
                <Card>
                  <CardHeader>
                    <CardTitle>Story Outline</CardTitle>
                    <CardDescription>
                      Fill in the required fields below.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* title (optional) */}
                    <FormField
                      control={form.control}
                      name="storyTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Story Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="The Great Treehouse Adventure"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* theme (required) */}
                    <FormField
                      control={form.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Theme / Genre <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <>
                              <Input
                                {...field}
                                list="theme-suggestions"
                                placeholder="e.g., Adventure, Friendship, Magic"
                                onKeyDown={handleThemeKey}
                              />
                              <datalist id="theme-suggestions">
                                {THEME_SUGGESTIONS.map((t) => (
                                  <option key={t} value={t} />
                                ))}
                              </datalist>
                            </>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* length (required) */}
                    <FormField
                      control={form.control}
                      name="length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Approximate Length (minutes){" "}
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
                              Want longer tales?{" "}
                              <Link
                                to="/signup"
                                className="text-primary underline"
                              >
                                Sign Up For Longer Tales
                              </Link>
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* main character (optional) */}
                    <FormField
                      control={form.control}
                      name="mainCharacter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Main Character</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Penelope, Hudson, Luna the Rabbit"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* educational focus (optional) */}
                    <FormField
                      control={form.control}
                      name="educationalFocus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Educational Focus</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Counting to 10, The Water Cycle, Being Kind"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* special requests (optional) */}
                    <FormField
                      control={form.control}
                      name="additionalInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Requests</FormLabel>
                          <FormControl>
                            <Textarea rows={4} {...field} />
                          </FormControl>
                          <p className="text-right text-sm text-muted-foreground">
                            {addTextLen}/500
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>

                  <CardFooter>
                    <Button
                      type="button"
                      className="w-full bg-storytime-blue text-white"
                      disabled={
                        generateStory.isPending || !form.formState.isValid
                      }
                      onClick={form.handleSubmit(submitOutline)}
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

              {/* -------- edit -------- */}
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
                          .map((p) => p.replace(/^#\s+/, "")) // drop markdown #
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

              {/* -------- voice -------- */}
              <TabsContent value="voice">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Narration</CardTitle>
                    <CardDescription>
                      Select voice & language, then generate audio.
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
                    {/* language */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="language-input"
                        className="flex items-center gap-1"
                      >
                        Language
                        <Dialog>
                          <DialogTrigger asChild>
                            <button type="button">
                              <Info className="h-4 w-4 opacity-70" />
                            </button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Supported Languages</DialogTitle>
                              <DialogDescription>
                                Start typing to filter.
                              </DialogDescription>
                            </DialogHeader>
                            <ul className="mt-4 max-h-72 grid grid-cols-2 gap-1 overflow-y-auto pr-2 text-sm">
                              {SUPPORTED_LANGUAGES.map((lang) => (
                                <li key={lang}>{lang}</li>
                              ))}
                            </ul>
                          </DialogContent>
                        </Dialog>
                      </Label>
                      <Input
                        id="language-input"
                        list="lang-suggestions"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        placeholder="English, Spanish, French…"
                      />
                      <datalist id="lang-suggestions">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <option key={lang} value={lang} />
                        ))}
                      </datalist>
                    </div>
                    {/* generate audio */}
                    <Button
                      type="button"
                      className="w-full bg-storytime-blue text-white"
                      onClick={() =>
                        storyContent && selectedVoiceId
                          ? generateAudio.mutate({
                              text: storyContent,
                              voiceId: selectedVoiceId,
                            })
                          : toast({
                              title: "Missing input",
                              description:
                                "Provide story text and select a voice.",
                              variant: "destructive",
                            })
                      }
                      disabled={generateAudio.isPending || !selectedVoiceId}
                    >
                      {generateAudio.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" />
                          Generate Narration
                        </>
                      )}
                    </Button>
                    {generateAudio.isError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          {generateAudio.error.message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* -------- share -------- */}
              <TabsContent value="share">
                <Card>
                  <CardHeader>
                    <CardTitle>Share Your Story</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {generatedAudioUrl && (
                      <>
                        <audio
                          controls
                          src={generatedAudioUrl}
                          className="w-full"
                        />
                        <p className="text-sm text-muted-foreground">
                          Copy the link or download the MP3 to share with
                          friends and family.
                        </p>
                        <Input
                          readOnly
                          value={generatedAudioUrl}
                          onFocus={(e) => e.currentTarget.select()}
                        />
                      </>
                    )}
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

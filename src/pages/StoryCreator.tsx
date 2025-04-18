// -----------------------------------------------------------------------------
// src/pages/StoryCreator.tsx
// -----------------------------------------------------------------------------
// 2025‑04‑18  • Improved UX for Theme & Language inputs
// -----------------------------------------------------------------------------

import React, { useState, useEffect, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

import { Link, useLocation, useNavigate } from "react-router-dom";

/* ──────────────────────────────────────────────────────────────────────────── */
/*  UI components                                                             */
/* ──────────────────────────────────────────────────────────────────────────── */
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
  Sparkles,
  Edit,
  Headphones,
  Share2,
  PenTool,
  Loader2,
  AlertCircle,
  MicVocal,
  Info,
} from "lucide-react";

import { TablesInsert } from "@/integrations/supabase/types";

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Static data                                                               */
/* ──────────────────────────────────────────────────────────────────────────── */

// Suggestions that appear greyed‑out in the placeholder and datalist
const THEME_SUGGESTIONS = [
  "Adventure",
  "Friendship",
  "Space",
  "Animals",
  "Magic",
  "Kindness",
] as const;

const SUPPORTED_VOICES = [
  { id: "alloy",   label: "Alex (US • Neutral Male)" },
  { id: "ash",     label: "Aisha (US • Warm Female)" },
  { id: "ballad",  label: "Bella (UK • Lyrical Female)" },
  { id: "coral",   label: "Chloe (AU • Bright Female)" },
  { id: "echo",    label: "Ethan (US • Friendly Male)" },
  { id: "fable",   label: "Felix (UK • Storyteller Male)" },
  { id: "nova",    label: "Nora (US • Energetic Female)" },
  { id: "onyx",    label: "Oscar (US • Deep Male)" },
  { id: "sage",    label: "Saanvi (IN • Clear Female)" },
  { id: "shimmer", label: "Selina (US • Expressive Female)" },
] as const;

const SUPPORTED_LANGUAGES = [
  "Afrikaans","Arabic","Armenian","Azerbaijani","Belarusian","Bosnian",
  "Bulgarian","Catalan","Chinese","Croatian","Czech","Danish","Dutch",
  "English","Estonian","Finnish","French","Galician","German","Greek",
  "Hebrew","Hindi","Hungarian","Icelandic","Indonesian","Italian",
  "Japanese","Kannada","Kazakh","Korean","Latvian","Lithuanian",
  "Macedonian","Malay","Marathi","Maori","Nepali","Norwegian","Persian",
  "Polish","Portuguese","Romanian","Russian","Serbian","Slovak",
  "Slovenian","Spanish","Swahili","Swedish","Tagalog","Tamil","Thai",
  "Turkish","Ukrainian","Urdu","Vietnamese","Welsh",
] as const;

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Form schema                                                               */
/* ──────────────────────────────────────────────────────────────────────────── */
const storyParamsSchema = z.object({
  storyTitle:            z.string().max(150).optional().nullable(),
  theme:                 z.string().min(1, "Theme is required."),
  mainCharacter:         z.string().max(50).optional().nullable(),
  educationalFocus:      z.string().optional().nullable(),
  additionalInstructions:z.string().max(500).optional().nullable(),
});

type StoryParamsFormValues = z.infer<typeof storyParamsSchema>;
type StoryInsertData      = TablesInsert<"stories">;

const FREE_GEN_KEY = "storyTimeFreeGenUsed";

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                 */
/* ──────────────────────────────────────────────────────────────────────────── */
const StoryCreator: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  /* ---------------- state --------------- */
  const [storyContent, setStoryContent]   = useState<string>("");
  const [generatedStoryId, setGeneratedStoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab]         = useState<string>("parameters");
  const [freeGenUsed, setFreeGenUsed]     = useState<boolean>(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

  /* ------------- effects --------------- */
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [activeTab]);
  useEffect(() => {
    setFreeGenUsed(localStorage.getItem(FREE_GEN_KEY) === "true");
  }, []);

  /* ------------- form ------------------ */
  const form = useForm<StoryParamsFormValues>({
    resolver: zodResolver(storyParamsSchema),
    defaultValues: {
      storyTitle: "",
      theme: "",
      mainCharacter: "",
      educationalFocus: null,
      additionalInstructions: "",
    },
  });

  /* ------------- mutations ------------- */
  const generateStoryMutation = useMutation({
    mutationFn: async ({ formData, isAnonymous }: { formData: StoryParamsFormValues; isAnonymous: boolean }) => {
      const { data, error } = await supabase.functions.invoke("anthropic-generate-story", { body: formData });
      if (error) throw new Error(`Edge Function Error: ${error.message}`);
      if (data?.error) throw new Error(`Generation Error: ${data.error}`);
      return { story: data.story as string, title: data.title as string, isAnonymous };
    },
    onSuccess: ({ story, title }) => {
      setStoryContent(story);
      form.setValue("storyTitle", title || "", { shouldValidate: false });
      setActiveTab("edit");
      if (!freeGenUsed) {
        localStorage.setItem(FREE_GEN_KEY, "true");
        setFreeGenUsed(true);
      }
    },
    onError: (err: Error) => toast({ title: "Generation Failed", description: err.message, variant: "destructive" }),
  });

  const generateAudioMutation = useMutation({
    mutationFn: async ({ text, voiceId, language }: { text: string; voiceId: string; language: string }) => {
      const { data, error } = await supabase.functions.invoke("openai-tts", { body: { text, voiceId, language } });
      if (error) throw new Error(`Edge Function Error: ${error.message}`);
      if (data?.error) throw new Error(`Audio Generation Error: ${data.error}`);
      return { audioUrl: data.audioUrl as string };
    },
    onSuccess: ({ audioUrl }) => {
      setGeneratedAudioUrl(audioUrl);
      setActiveTab("share");
    },
    onError: (err: Error) =>
      toast({ title: "Audio Generation Failed", description: err.message, variant: "destructive" }),
  });

  /* ------------- handlers -------------- */
  const onGenerateSubmit: SubmitHandler<StoryParamsFormValues> = (formData) => {
    generateStoryMutation.mutate({ formData, isAnonymous: !user });
  };

  const handleGenerateNarration = () => {
    if (!storyContent || !selectedVoiceId) {
      toast({ title: "Missing Input", description: "Provide story text & select a voice.", variant: "destructive" });
      return;
    }
    setGeneratedAudioUrl(null);
    generateAudioMutation.mutate({ text: storyContent, voiceId: selectedVoiceId, language: selectedLanguage });
  };

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  Render                                                                  */
  /* ──────────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-bold mb-4 font-display text-gray-700">
          Story Creator Studio
        </h1>

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              {/* Tabs list */}
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="parameters" className="flex items-center gap-2">
                  <PenTool className="h-4 w-4" /> <span>Story Outline</span>
                </TabsTrigger>
                <TabsTrigger value="edit" disabled={!storyContent} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" /> <span>Edit / Preview</span>
                </TabsTrigger>
                <TabsTrigger value="voice" disabled={!storyContent} className="flex items-center gap-2">
                  <Headphones className="h-4 w-4" /> <span>Voice & Audio</span>
                </TabsTrigger>
                <TabsTrigger value="share" disabled={!generatedAudioUrl} className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" /> <span>Share Story</span>
                </TabsTrigger>
              </TabsList>

              {/* ----------------------------------------------------------------
                 Story Outline TAB
              ---------------------------------------------------------------- */}
              <TabsContent value="parameters">
                <Card>
                  <CardHeader>
                    <CardTitle>Story Outline</CardTitle>
                    <CardDescription>
                      Fill in the details below. <span className="text-muted-foreground">Suggestions appear as grey text while you type.</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    {/* Story Title */}
                    <FormField
                      control={form.control}
                      name="storyTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Story Title <span className="text-muted-foreground">(optional)</span></FormLabel>
                          <FormControl>
                            <Input placeholder="The Great Treehouse Adventure" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Theme with datalist suggestions */}
                    <FormField
                      control={form.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme / Genre</FormLabel>
                          <FormControl>
                            <>
                              <Input
                                placeholder="Adventure, Friendship, Space..."
                                list="theme-suggestions"
                                {...field}
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

                    {/* Main Character */}
                    <FormField
                      control={form.control}
                      name="mainCharacter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Main Character <span className="text-muted-foreground">(optional)</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Luna the Brave Rabbit" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Educational Focus */}
                    <FormField
                      control={form.control}
                      name="educationalFocus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Educational Focus <span className="text-muted-foreground">(optional)</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Learning the water cycle, counting by 5s..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Additional Instructions */}
                    <FormField
                      control={form.control}
                      name="additionalInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Requests <span className="text-muted-foreground">(optional)</span></FormLabel>
                          <FormControl>
                            <Textarea
                              rows={4}
                              placeholder="Keep the tone whimsical, under 800 words, include a friendly dragon..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    {freeGenUsed && (
                      <Alert variant="destructive" className="flex-1 mr-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Free story already used!</AlertTitle>
                        <AlertDescription>
                          Upgrade to generate unlimited stories.
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      type="button"
                      className="w-full md:w-auto bg-storytime-blue text-white"
                      disabled={
                        freeGenUsed ||
                        generateStoryMutation.isPending ||
                        !form.formState.isValid
                      }
                      onClick={form.handleSubmit(onGenerateSubmit)}
                    >
                      {generateStoryMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Story
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* ----------------------------------------------------------------
                 Edit / Preview TAB  (unchanged)
              ---------------------------------------------------------------- */}
              <TabsContent value="edit">
                {/* … your existing markdown preview / editor … */}
              </TabsContent>

              {/* ----------------------------------------------------------------
                 Voice & Audio TAB  (language field now Input + modal)
              ---------------------------------------------------------------- */}
              <TabsContent value="voice">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Narration</CardTitle>
                    <CardDescription>
                      Select a voice and language, then generate audio.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    {/* Voice Select (unchanged) */}
                    <div className="space-y-2">
                      <Label htmlFor="voice-select">Choose a Voice</Label>
                      <Select
                        value={selectedVoiceId}
                        onValueChange={(v) => {
                          setSelectedVoiceId(v);
                          setGeneratedAudioUrl(null);
                        }}
                      >
                        <SelectTrigger id="voice-select">
                          <SelectValue placeholder="Select voice" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_VOICES.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Language autocomplete + info dialog */}
                    <div className="space-y-2">
                      <Label htmlFor="language-input" className="flex items-center gap-1">
                        Language
                        <Dialog>
                          <DialogTrigger asChild>
                            <button type="button" className="opacity-70 hover:opacity-100">
                              <Info className="h-4 w-4" />
                            </button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Supported Languages</DialogTitle>
                              <DialogDescription>
                                You can type any of these languages. Start typing and
                                the field autocompletes.
                              </DialogDescription>
                            </DialogHeader>
                            <ul className="grid grid-cols-2 gap-1 mt-4 max-h-72 overflow-y-auto pr-2 text-sm">
                              {SUPPORTED_LANGUAGES.map((lang) => (
                                <li key={lang} className="px-2 py-1 rounded hover:bg-muted">{lang}</li>
                              ))}
                            </ul>
                          </DialogContent>
                        </Dialog>
                      </Label>
                      <>
                        <Input
                          id="language-input"
                          placeholder="English, Spanish, French…"
                          list="language-suggestions"
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                        />
                        <datalist id="language-suggestions">
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <option key={lang} value={lang} />
                          ))}
                        </datalist>
                      </>
                    </div>

                    {/* Generate Audio button */}
                    <Button
                      type="button"
                      onClick={handleGenerateNarration}
                      disabled={!storyContent || !selectedVoiceId || generateAudioMutation.isPending}
                      className="w-full bg-storytime-blue hover:bg-storytime-blue/90 text-white"
                    >
                      {generateAudioMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Audio…
                        </>
                      ) : (
                        <>
                          <MicVocal className="mr-2 h-4 w-4" />
                          Generate Narration
                        </>
                      )}
                    </Button>

                    {generateAudioMutation.isError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Audio Generation Error</AlertTitle>
                        <AlertDescription>{generateAudioMutation.error.message}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ----------------------------------------------------------------
                 Share TAB (unchanged)
              ---------------------------------------------------------------- */}
              <TabsContent value="share">
                {/* … your existing share UI … */}
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default StoryCreator;

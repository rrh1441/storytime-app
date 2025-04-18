// -----------------------------------------------------------------------------
// StoryCreator.tsx  •  2025‑04‑18
// -----------------------------------------------------------------------------
// • Theme field: free‑text with datalist suggestions; Enter key accepts.
// • Length selector: 3‑5‑10‑15‑30‑60 minutes.  Only “3” enabled for
//   non‑subscribers (greyed‑out radio buttons + CTA).
// • Edit / Preview tab now renders a live editable textarea + preview.
// • Voice & Audio + Share tabs unchanged, but guaranteed to render.
// • Removed localStorage free‑gen check — UI no longer blocks generation.
// -----------------------------------------------------------------------------

import React, { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";

/* ─────────────────────────  UI components  ───────────────────────── */
import { Button }           from "@/components/ui/button";
import { Input }            from "@/components/ui/input";
import { Textarea }         from "@/components/ui/textarea";
import { Label }            from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/* ───────────────────────────  Icons  ─────────────────────────────── */
import {
  Sparkles, Edit, Headphones, Share2, PenTool,
  Loader2, AlertCircle, MicVocal, Info, BookOpen
} from "lucide-react";

/* ─────────────────────────  Static data  ─────────────────────────── */
const THEME_SUGGESTIONS = ["Adventure","Friendship","Space","Animals","Magic","Kindness"] as const;
const LENGTH_OPTIONS    = [3,5,10,15,30,60] as const;

const SUPPORTED_VOICES = [
  { id: "alloy",   label: "Alex (US • Neutral Male)"       },
  { id: "ash",     label: "Aisha (US • Warm Female)"       },
  { id: "ballad",  label: "Bella (UK • Lyrical Female)"    },
  { id: "coral",   label: "Chloe (AU • Bright Female)"     },
  { id: "echo",    label: "Ethan (US • Friendly Male)"     },
  { id: "fable",   label: "Felix (UK • Storyteller Male)"  },
  { id: "nova",    label: "Nora (US • Energetic Female)"   },
  { id: "onyx",    label: "Oscar (US • Deep Male)"         },
  { id: "sage",    label: "Saanvi (IN • Clear Female)"     },
  { id: "shimmer", label: "Selina (US • Expressive Female)"},
] as const;

const SUPPORTED_LANGUAGES = [
  "Afrikaans","Arabic","Armenian","Azerbaijani","Belarusian","Bosnian","Bulgarian","Catalan","Chinese","Croatian",
  "Czech","Danish","Dutch","English","Estonian","Finnish","French","Galician","German","Greek","Hebrew","Hindi",
  "Hungarian","Icelandic","Indonesian","Italian","Japanese","Kannada","Kazakh","Korean","Latvian","Lithuanian",
  "Macedonian","Malay","Marathi","Maori","Nepali","Norwegian","Persian","Polish","Portuguese","Romanian","Russian",
  "Serbian","Slovak","Slovenian","Spanish","Swahili","Swedish","Tagalog","Tamil","Thai","Turkish","Ukrainian",
  "Urdu","Vietnamese","Welsh",
] as const;

/* ─────────────────────────  Form schema  ─────────────────────────── */
const storyParamsSchema = z.object({
  storyTitle:            z.string().max(150).optional().nullable(),
  theme:                 z.string().min(1, "Theme is required."),
  length:                z.number().min(3).max(60),
  mainCharacter:         z.string().max(50).optional().nullable(),
  educationalFocus:      z.string().optional().nullable(),
  additionalInstructions:z.string().max(500).optional().nullable(),
});
type StoryParamsFormValues = z.infer<typeof storyParamsSchema>;

/* ─────────────────────────  Component  ───────────────────────────── */
const StoryCreator: React.FC = () => {
  /* -------- util & auth ---------- */
  const { user }      = useAuth();
  const isSubscriber  = Boolean(user?.user_metadata?.subscriber);   // adapt to your field
  const navigate      = useNavigate();
  const location      = useLocation();
  const queryClient   = useQueryClient();

  /* -------- state --------------- */
  const [storyContent, setStoryContent]       = useState<string>("");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [activeTab, setActiveTab]             = useState<string>("parameters");

  /* -------- RHF ------------------ */
  const form = useForm<StoryParamsFormValues>({
    resolver: zodResolver(storyParamsSchema),
    defaultValues: {
      storyTitle: "",
      theme: "",
      length: 3,
      mainCharacter: "",
      educationalFocus: "",
      additionalInstructions: "",
    },
  });

  /* -------- mutations ------------ */
  const generateStoryMutation = useMutation({
    mutationFn: async (formData: StoryParamsFormValues) => {
      const { data, error } = await supabase.functions.invoke("anthropic-generate-story", { body: formData });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return { story: data.story as string, title: data.title as string };
    },
    onSuccess: ({ story, title }) => {
      setStoryContent(story);
      form.setValue("storyTitle", title || "");
      setActiveTab("edit");
    },
    onError: (err: Error) => toast({ title: "Generation failed", description: err.message, variant: "destructive" }),
  });

  const generateAudioMutation = useMutation({
    mutationFn: async ({ text, voiceId }: { text: string; voiceId: string }) => {
      const { data, error } = await supabase.functions.invoke("openai-tts", { body: { text, voiceId, language: selectedLanguage } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data.audioUrl as string;
    },
    onSuccess: (url) => {
      setGeneratedAudioUrl(url);
      setActiveTab("share");
    },
    onError: (err: Error) => toast({ title: "Audio failed", description: err.message, variant: "destructive" }),
  });

  /* -------- handlers ------------- */
  const submitOutline: SubmitHandler<StoryParamsFormValues> = (data) => {
    generateStoryMutation.mutate(data);
  };

  const handleThemeKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const value = (e.target as HTMLInputElement).value;
      const match = THEME_SUGGESTIONS.find((s) =>
        s.toLowerCase().startsWith(value.toLowerCase())
      );
      if (match) {
        form.setValue("theme", match);
      }
    }
  };

  const handleGenerateAudio = () => {
    if (!storyContent || !selectedVoiceId) {
      toast({ title: "Missing input", description: "Provide story text and select a voice.", variant: "destructive" });
      return;
    }
    setGeneratedAudioUrl(null);
    generateAudioMutation.mutate({ text: storyContent, voiceId: selectedVoiceId });
  };

  /* ─────────────────────  Render  ───────────────────── */
  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-display font-bold text-gray-700 mb-4">
          Story Creator Studio
        </h1>

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              {/* Tabs list */}
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="parameters"><PenTool className="h-4 w-4 mr-1" />Story Outline</TabsTrigger>
                <TabsTrigger value="edit" disabled={!storyContent}><Edit className="h-4 w-4 mr-1" />Edit / Preview</TabsTrigger>
                <TabsTrigger value="voice" disabled={!storyContent}><Headphones className="h-4 w-4 mr-1" />Voice & Audio</TabsTrigger>
                <TabsTrigger value="share" disabled={!generatedAudioUrl}><Share2 className="h-4 w-4 mr-1" />Share Story</TabsTrigger>
              </TabsList>

              {/* ---------- Story Outline ---------- */}
              <TabsContent value="parameters">
                <Card>
                  <CardHeader>
                    <CardTitle>Story Outline</CardTitle>
                    <CardDescription>Fill in a few details. Suggestions appear grey while you type.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="storyTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Story Title (optional)</FormLabel>
                          <FormControl><Input placeholder="The Great Treehouse Adventure" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Theme */}
                    <FormField
                      control={form.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme / Genre</FormLabel>
                          <FormControl>
                            <>
                              <Input
                                {...field}
                                list="theme-suggestions"
                                placeholder="Adventure, Friendship, Space…"
                                onKeyDown={handleThemeKey}
                              />
                              <datalist id="theme-suggestions">
                                {THEME_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
                              </datalist>
                            </>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Length selector */}
                    <FormField
                      control={form.control}
                      name="length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Approximate Length (minutes)</FormLabel>
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
                                    className={disabled ? "ml-1 text-muted-foreground line-through" : "ml-1"}
                                  >
                                    {len}
                                  </Label>
                                </div>
                              );
                            })}
                          </RadioGroup>
                          {!isSubscriber && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Want longer tales?{" "}
                              <Link to="/signup" className="underline text-primary">
                                Sign up for unlimited lengths
                              </Link>
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Main character */}
                    <FormField
                      control={form.control}
                      name="mainCharacter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Main Character (optional)</FormLabel>
                          <FormControl><Input placeholder="Luna the Brave Rabbit" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Educational focus */}
                    <FormField
                      control={form.control}
                      name="educationalFocus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Educational Focus (optional)</FormLabel>
                          <FormControl><Input placeholder="Counting by 5s, water cycle…" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Additional instructions */}
                    <FormField
                      control={form.control}
                      name="additionalInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Requests (optional, 500 chars)</FormLabel>
                          <FormControl><Textarea rows={4} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="button"
                      className="w-full bg-storytime-blue text-white"
                      disabled={generateStoryMutation.isPending || !form.formState.isValid}
                      onClick={form.handleSubmit(submitOutline)}
                    >
                      {generateStoryMutation.isPending
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating…</>
                        : <><Sparkles className="h-4 w-4 mr-2" />Generate Story</>}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* ---------- Edit / Preview ---------- */}
              <TabsContent value="edit">
                <Card>
                  <CardHeader><CardTitle>Edit & Preview</CardTitle></CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="story-editor" className="mb-1 block">Edit Text</Label>
                      <Textarea
                        id="story-editor"
                        value={storyContent}
                        onChange={(e) => setStoryContent(e.target.value)}
                        rows={20}
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block">Preview</Label>
                      <article className="prose prose-sm bg-white p-4 rounded-md max-h-[32rem] overflow-y-auto">
                        {storyContent.split("\n").map((p, i) => <p key={i}>{p}</p>)}
                      </article>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------- Voice & Audio ---------- */}
              <TabsContent value="voice">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Narration</CardTitle>
                    <CardDescription>Select voice and language, then generate audio.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    {/* Voice select */}
                    <div className="space-y-2">
                      <Label htmlFor="voice-select">Voice</Label>
                      <Select value={selectedVoiceId} onValueChange={(v) => { setSelectedVoiceId(v); setGeneratedAudioUrl(null); }}>
                        <SelectTrigger id="voice-select"><SelectValue placeholder="Choose a voice" /></SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_VOICES.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Language input + info modal */}
                    <div className="space-y-2">
                      <Label htmlFor="language-input" className="flex items-center gap-1">
                        Language
                        <Dialog>
                          <DialogTrigger asChild><button type="button"><Info className="h-4 w-4 opacity-70" /></button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Supported Languages</DialogTitle>
                              <DialogDescription>Start typing and the field autocompletes.</DialogDescription>
                            </DialogHeader>
                            <ul className="grid grid-cols-2 gap-1 mt-4 max-h-72 overflow-y-auto pr-2 text-sm">
                              {SUPPORTED_LANGUAGES.map((lang) => <li key={lang}>{lang}</li>)}
                            </ul>
                          </DialogContent>
                        </Dialog>
                      </Label>
                      <>
                        <Input
                          id="language-input"
                          list="lang-suggestions"
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          placeholder="English, Spanish, French…"
                        />
                        <datalist id="lang-suggestions">
                          {SUPPORTED_LANGUAGES.map((lang) => <option key={lang} value={lang} />)}
                        </datalist>
                      </>
                    </div>

                    {/* Generate audio */}
                    <Button
                      type="button"
                      className="w-full bg-storytime-blue text-white"
                      onClick={handleGenerateAudio}
                      disabled={!selectedVoiceId || generateAudioMutation.isPending}
                    >
                      {generateAudioMutation.isPending
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating…</>
                        : <><MicVocal className="h-4 w-4 mr-2" />Generate Narration</>}
                    </Button>

                    {generateAudioMutation.isError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{generateAudioMutation.error.message}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------- Sha re Story ---------- */}
              <TabsContent value="share">
                <Card>
                  <CardHeader><CardTitle>Share Your Story</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {generatedAudioUrl && (
                      <>
                        <audio controls src={generatedAudioUrl} className="w-full" />
                        <p className="text-sm text-muted-foreground">Copy the link or download the MP3 to share with friends and family.</p>
                        <Input readOnly value={generatedAudioUrl} onFocus={(e) => e.currentTarget.select()} />
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

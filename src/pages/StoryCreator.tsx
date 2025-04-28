// -----------------------------------------------------------------------------
// StoryCreator.tsx  •  2025‑04‑18  (last updated 2025‑04‑28)
// -----------------------------------------------------------------------------
// • Language field added to Story Outline tab (required, validated)
// • Voice & Audio tab now uses six friendly voice names
// • Share tab UI significantly improved with Copy, Download, QR, Social Share
// -----------------------------------------------------------------------------

import React, { useState, KeyboardEvent } from "react";
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
// Added for enhanced Share Tab:
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

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
  // Added for enhanced Share Tab:
  Check,
  Copy,
  Download,
  QrCode,
  Twitter,
  Facebook,
  Linkedin,
} from "lucide-react";

/* ─────────── Static data ─────────── */
const THEME_SUGGESTIONS = [/* ...omitted for brevity... */] as const;
const LENGTH_OPTIONS = [3, 5, 10, 15, 30, 60] as const;
const SUPPORTED_VOICES = [/* ...omitted for brevity... */] as const;
const SUPPORTED_LANGUAGES = [/* ...omitted for brevity... */] as const;

/* ─────────── Zod schema ─────────── */
const schema = z.object({
  storyTitle: z.string().max(150).optional().nullable(),
  theme: z.string().min(1, "Theme is required."),
  length: z.number().min(3).max(60),
  language: z
    .string()
    .refine(
      (val) => (SUPPORTED_LANGUAGES as readonly string[]).includes(val),
      { message: "Unsupported language" },
    ),
  mainCharacter: z.string().max(50).optional().nullable(),
  educationalFocus: z.string().optional().nullable(),
  additionalInstructions: z.string().max(500).optional().nullable(),
});
type FormValues = z.infer<typeof schema>;

/* ─────────── Component ─────────── */
const StoryCreator: React.FC = () => {
  const { user } = useAuth();
  const isSubscriber = Boolean(user?.user_metadata?.subscriber);

  const [storyContent, setStoryContent] = useState("");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(
    null,
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>();
  const [activeTab, setActiveTab] = useState<
    "parameters" | "edit" | "voice" | "share"
  >("parameters");
  const [copied, setCopied] = useState(false); // State for copy button feedback

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
      const r = await fetch(`${API_BASE}/generate-story`, { /* ... */ });
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as { story: string; title: string };
    },
    onSuccess: ({ story, title }) => {
      setStoryContent(story);
      form.setValue("storyTitle", title || "");
      setActiveTab("edit");
      setGeneratedAudioUrl(null); // Reset audio URL if story changes
    },
    onError: (e: Error) => {/* ... */},
  });

  const generateAudio = useMutation({
    mutationFn: async ({ text, voiceId }: { text: string; voiceId: string }) => {
      const language = form.getValues("language");
      const r = await fetch(`${API_BASE}/tts`, { /* ... */ });
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()).audioUrl as string;
    },
    onSuccess: (url) => {
      setGeneratedAudioUrl(url);
      setActiveTab("share");
    },
    onError: (e: Error) => {/* ... */},
  });

  /* ── helpers ──────────────────────────────────────────────────────────── */
  const handleThemeKey = (e: KeyboardEvent<HTMLInputElement>) => { /* ... */ };
  const additionalChars = (form.watch("additionalInstructions") || "").length;
  const watchLanguage = form.watch("language");

  // --- Share Tab Helper Functions ---
  const copyToClipboard = () => {
    if (!generatedAudioUrl) return;
    navigator.clipboard.writeText(generatedAudioUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
  };

  const downloadAudio = () => {
    if (!generatedAudioUrl) return;
    const link = document.createElement("a");
    link.href = generatedAudioUrl;
    // Create a filename from the story title or use a default
    const title = form.getValues("storyTitle") || "storytime-audio";
    const safeFilename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeFilename}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareToSocial = (platform: string) => {
    if (!generatedAudioUrl) return;

    let shareUrl = "";
    const storyTitle = form.getValues("storyTitle");
    const text = storyTitle
        ? `Listen to the audio story "${storyTitle}" I created using StoryTime!` // Slightly improved text
        : "Check out this audio story I created using StoryTime!";

    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(generatedAudioUrl)}`;
        break;
      case "facebook":
        // Facebook uses the URL's meta tags for preview, so the 'text' isn't directly used here.
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(generatedAudioUrl)}`;
        break;
      case "linkedin":
        // LinkedIn also relies heavily on URL meta tags.
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(generatedAudioUrl)}`;
        break;
    }

    if (shareUrl) {
        window.open(shareUrl, "_blank", "noopener,noreferrer"); // Use noopener,noreferrer for security
    }
  };
  // --- End Share Tab Helper Functions ---

  /* ── UI ───────────────────────────────────────────────────────────────── */
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
                {/* ... Tab Triggers for Parameters, Edit, Voice ... */}
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
                  {/* ... Parameters Card ... */}
                   <Card>
                      <CardHeader>
                        <CardTitle>Story Outline</CardTitle>
                        <CardDescription>Fill in the required fields below.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                         {/* ... FormFields for title, theme, length, language, etc. ... */}
                      </CardContent>
                      <CardFooter>
                        {/* ... Generate Story Button ... */}
                      </CardFooter>
                   </Card>
              </TabsContent>

              {/* ── EDIT / PREVIEW TAB ─────────────────────────────────── */}
              <TabsContent value="edit">
                {/* ... Edit/Preview Card ... */}
                <Card>
                  <CardHeader>
                    <CardTitle>Edit & Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {/* ... Textarea for editing and Preview div ... */}
                  </CardContent>
                  <CardFooter>
                    <Button type="button" className="ml-auto bg-storytime-blue text-white" onClick={() => setActiveTab("voice")}>
                       Continue to Voice & Audio
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* ── VOICE & AUDIO TAB ─────────────────────────────────── */}
              <TabsContent value="voice">
                 {/* ... Voice & Audio Card ... */}
                 <Card>
                   <CardHeader>
                     <CardTitle>Add Narration</CardTitle>
                     <CardDescription>
                       Select voice, then generate audio. (Language: {watchLanguage})
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-6">
                     {/* ... Voice Select Dropdown ... */}
                     {/* ... Generate Audio Button ... */}
                     {generateAudio.isError && (/* ... Error Alert ... */)}
                   </CardContent>
                 </Card>
              </TabsContent>

              {/* ── SHARE TAB (IMPROVED) ──────────────────────────────── */}
              <TabsContent value="share">
                <Card> {/* Consistent card styling */}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Share2 className="h-5 w-5" />
                      Share Your Story
                    </CardTitle>
                  </CardHeader>

                  {generatedAudioUrl ? (
                    <>
                      <CardContent className="space-y-6">
                        {/* Audio Player Section */}
                        <div className="bg-muted/50 rounded-lg p-4">
                          <audio controls src={generatedAudioUrl} className="w-full" />
                        </div>

                        {/* Audio Link Section */}
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">Audio Link</h3>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={generatedAudioUrl}
                              className="font-mono text-sm flex-grow" // Use flex-grow
                              onFocus={(e) => e.currentTarget.select()}
                            />
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={copyToClipboard} className="shrink-0">
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{copied ? "Copied!" : "Copy link"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        <Separator />

                        {/* Share Options Section */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium">Share Options</h3>
                          {/* Download & QR */}
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" className="gap-2" onClick={downloadAudio}>
                              <Download className="h-4 w-4" />
                              Download MP3
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                  <QrCode className="h-4 w-4" />
                                  QR Code
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-xs"> {/* Made slightly smaller */}
                                <DialogHeader>
                                  <DialogTitle>Share via QR Code</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col items-center justify-center p-4"> {/* Adjusted padding */}
                                  <div className="bg-white p-2 rounded-md">
                                    <img
                                      // Using qrserver API for QR code generation
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generatedAudioUrl)}`} // Adjusted size
                                      alt="QR Code for Audio Story Link" // More specific alt text
                                      className="w-44 h-44" // Match size
                                    />
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-3 text-center"> {/* Adjusted margin */}
                                    Scan this code to listen to your story.
                                  </p>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>

                          {/* Social Media */}
                           <div className="flex flex-wrap gap-2">
                             <h3 className="text-sm font-medium w-full mb-1">Share on Social Media:</h3> {/* Added sub-heading */}
                             <TooltipProvider delayDuration={100}>
                               <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => shareToSocial("twitter")} className="rounded-full">
                                       <Twitter className="h-4 w-4" />
                                       <span className="sr-only">Share to Twitter/X</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Share to Twitter/X</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button variant="outline" size="icon" onClick={() => shareToSocial("facebook")} className="rounded-full">
                                        <Facebook className="h-4 w-4" />
                                        <span className="sr-only">Share to Facebook</span>
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent><p>Share to Facebook</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button variant="outline" size="icon" onClick={() => shareToSocial("linkedin")} className="rounded-full">
                                        <Linkedin className="h-4 w-4" />
                                        <span className="sr-only">Share to LinkedIn</span>
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent><p>Share to LinkedIn</p></TooltipContent>
                                </Tooltip>
                             </TooltipProvider>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="bg-muted/30 pt-4 mt-auto"> {/* Added mt-auto */}
                        <p className="text-xs text-muted-foreground"> {/* Slightly smaller text */}
                          Tip: Download the MP3 for permanent access. The sharing link might be temporary.
                        </p>
                      </CardFooter>
                    </>
                  ) : (
                    // Placeholder when no audio is generated
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-16 text-center min-h-[350px]"> {/* Adjusted padding/min-height */}
                        <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Ready to Share?</h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-sm"> {/* Adjusted max-width */}
                          First, head over to the <span className="font-semibold">Voice & Audio</span> tab. Select a voice and click 'Generate Narration'. Once your audio is ready, you'll find all the sharing options right here!
                        </p>
                         <Button variant="outline" className="mt-6" onClick={() => setActiveTab('voice')} disabled={!storyContent}> {/* Added button to guide user */}
                             <Headphones className="mr-2 h-4 w-4"/> Go to Voice & Audio
                         </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>
              {/* ── END SHARE TAB ─────────────────────────────────────── */}

            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default StoryCreator;
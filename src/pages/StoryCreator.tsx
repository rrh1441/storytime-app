import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label'; // Keep if used outside form
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // Import RHF components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For errors
import { Sparkles, BookOpen, Edit, Headphones, RotateCw, Save, Play, PenTool, Loader2, AlertCircle } from 'lucide-react';
import { Database, TablesInsert } from '@/integrations/supabase/types'; // Import generated types

// --- Zod Schema for Form Validation ---
// Matches the expected input for the Edge Function and DB structure
const storyParamsSchema = z.object({
  storyTitle: z.string().min(1, "Story title is required.").max(150, "Title too long"),
  ageRange: z.string().min(1, "Age range is required."),
  storyLength: z.string().min(1, "Story length is required."), // Corresponds to 'short', 'medium', 'long'
  theme: z.string().min(1, "Theme is required."),
  mainCharacter: z.string().max(50).optional().nullable(),
  educationalFocus: z.string().optional().nullable(),
  additionalInstructions: z.string().max(500).optional().nullable(),
  // Add voice fields if combining steps, otherwise handle separately
  // voiceType: z.string().optional(),
  // voiceSelection: z.string().optional(),
});

type StoryParamsFormValues = z.infer<typeof storyParamsSchema>;

// Type for data needed to save the story
type StoryInsertData = TablesInsert<'stories'>;


const StoryCreator: React.FC = () => {
  const { user } = useAuth(); // Get user session
  const queryClient = useQueryClient(); // For potential cache invalidation later

  const [storyContent, setStoryContent] = useState<string>('');
  const [generatedStoryId, setGeneratedStoryId] = useState<string | null>(null); // To store ID after saving
  const [activeTab, setActiveTab] = useState<string>("parameters");

  // --- React Hook Form Setup ---
  const form = useForm<StoryParamsFormValues>({
    resolver: zodResolver(storyParamsSchema),
    defaultValues: {
      storyTitle: "",
      ageRange: "4-8",
      storyLength: "medium",
      theme: "adventure",
      mainCharacter: "",
      educationalFocus: "courage",
      additionalInstructions: "",
    },
  });

  // --- Mutation to call Anthropic Edge Function ---
  const generateStoryMutation = useMutation({
    mutationFn: async (params: StoryParamsFormValues) => {
      console.log("Calling anthropic-generate-story with:", params);
      const { data, error } = await supabase.functions.invoke('anthropic-generate-story', {
        body: params, // Pass validated form data
      });

      if (error) throw new Error(`Edge Function Error: ${error.message}`);
      // Check for errors returned *within* the function's JSON response
      if (data.error) throw new Error(`Generation Error: ${data.error}`);
      if (!data.story) throw new Error("No story content received from function.");

      return data.story as string;
    },
    onSuccess: (data) => {
      setStoryContent(data);
      setGeneratedStoryId(null); // Reset saved ID if regenerating
      toast({ title: "Story Generated!", description: "Review your story draft below or edit it." });
      setActiveTab("edit"); // Switch to edit tab after generation
    },
    onError: (error: Error) => {
      console.error("Story generation failed:", error);
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    },
  });

  // --- Mutation to save the story to Supabase DB ---
   const saveStoryMutation = useMutation({
     mutationFn: async (storyData: StoryInsertData) => {
        console.log("Saving story to database:", storyData);
        // Ensure user ID is present
        if (!user?.id) throw new Error("User not logged in.");

        const dataToSave: StoryInsertData = {
            ...storyData,
            user_id: user.id, // Associate story with logged-in user
            content: storyContent // Use the current story content state
        };

       // Use upsert: if generatedStoryId exists, update; otherwise insert
       const { data, error } = await supabase
         .from('stories')
         .upsert(dataToSave)
         .select() // Select the inserted/updated row
         .single(); // Expect a single row back

       if (error) {
         console.error("Supabase save error:", error);
         throw error; // Let onError handle it
       }
       console.log("Save successful, response data:", data);
       return data; // Return the saved story data (includes the ID)
     },
     onSuccess: (data) => {
        setGeneratedStoryId(data.id); // Store the ID of the saved story
        toast({ title: "Story Saved!", description: "Your story has been saved to your library." });
        // Optional: Invalidate queries related to story list if needed
        // queryClient.invalidateQueries({ queryKey: ['stories'] });
     },
     onError: (error: Error) => {
       console.error("Story save failed:", error);
       toast({ title: "Save Failed", description: error.message, variant: "destructive" });
     },
   });


  // --- Form Submit Handler (triggers generation) ---
  const onGenerateSubmit: SubmitHandler<StoryParamsFormValues> = (formData) => {
    console.log("Form submitted for generation:", formData);
    generateStoryMutation.mutate(formData);
  };

  // --- Save Handler ---
   const handleSaveStory = () => {
       if (!storyContent) {
           toast({ title: "Cannot Save", description: "Please generate or write a story first.", variant: "destructive"});
           return;
       }
        if (!user) {
            toast({ title: "Not Logged In", description: "Please log in to save your story.", variant: "destructive"});
           return;
        }

       // Get current form values to save alongside content
       const currentFormValues = form.getValues();

       const storyDataToSave: Partial<StoryInsertData> = {
           // If we have an ID, use it for upsert, otherwise it's an insert
           id: generatedStoryId || undefined,
           user_id: user.id, // Will be overwritten in mutationFn, but good practice
           title: currentFormValues.storyTitle,
           content: storyContent, // Current content from state
           age_range: currentFormValues.ageRange,
           themes: currentFormValues.theme ? [currentFormValues.theme] : [], // Assuming theme is single selection for now
           // characters: {}, // Add if you have character input
           educational_elements: currentFormValues.educationalFocus ? [currentFormValues.educationalFocus] : [],
           // Add other fields from your 'stories' table if needed
       };

       saveStoryMutation.mutate(storyDataToSave as StoryInsertData); // Assert type or ensure all fields are present
   };


  // --- Render Component ---
  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-bold mb-8">Story Creator Studio</h1>

        <Form {...form}> {/* Form provider wraps Tabs or specific content */}
          {/* We use a basic form element mainly to group buttons, actual submit via handler */}
          <form onSubmit={(e) => e.preventDefault()}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="parameters" className="flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  <span>Parameters</span>
                </TabsTrigger>
                <TabsTrigger value="edit" disabled={!storyContent} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  <span>Edit / Preview</span>
                </TabsTrigger>
                 <TabsTrigger value="voice" disabled={!generatedStoryId} className="flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  <span>Voice & Audio</span>
                </TabsTrigger>
                 <TabsTrigger value="publish" disabled={!generatedStoryId} className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Publish</span>
                </TabsTrigger>
              </TabsList>

              {/* Form fields are now within the parameters tab */}
              <TabsContent value="parameters" className="mt-0">
                 <Card>
                    <CardHeader>
                        <CardTitle>Story Details</CardTitle>
                        <CardDescription>Set the parameters for your AI-generated story.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="storyTitle"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Story Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter a title for your story" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="ageRange"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Age Range</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select age range" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="0-3">0-3 years</SelectItem>
                                                <SelectItem value="4-6">4-6 years</SelectItem>
                                                <SelectItem value="4-8">4-8 years</SelectItem>
                                                <SelectItem value="9-12">9-12 years</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="storyLength"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Story Length</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select length" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="short">Short (~3-5 min)</SelectItem>
                                            <SelectItem value="medium">Medium (~5-10 min)</SelectItem>
                                            <SelectItem value="long">Long (~10-15 min)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                         <FormField
                            control={form.control}
                            name="theme"
                            render={({ field }) => (
                               <FormItem>
                                    <FormLabel>Theme</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select theme" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                             <SelectItem value="adventure">Adventure</SelectItem>
                                             <SelectItem value="fantasy">Fantasy</SelectItem>
                                             <SelectItem value="animals">Animals</SelectItem>
                                             <SelectItem value="friendship">Friendship</SelectItem>
                                             <SelectItem value="space">Space</SelectItem>
                                             <SelectItem value="ocean">Ocean</SelectItem>
                                             {/* Add more themes */}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="mainCharacter"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Main Character Name (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="E.g., Luna, Finn, Sparky" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="educationalFocus"
                             render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Educational Focus (Optional)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value ?? ""} value={field.value ?? ""}>
                                        <FormControl>
                                             <SelectTrigger><SelectValue placeholder="Select focus (optional)" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                             <SelectItem value="">None</SelectItem>
                                             <SelectItem value="kindness">Kindness</SelectItem>
                                             <SelectItem value="courage">Courage</SelectItem>
                                             <SelectItem value="curiosity">Curiosity</SelectItem>
                                             <SelectItem value="perseverance">Perseverance</SelectItem>
                                             <SelectItem value="teamwork">Teamwork</SelectItem>
                                             <SelectItem value="patience">Patience</SelectItem>
                                             {/* Add more options */}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="additionalInstructions"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Additional Instructions (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="E.g., 'Include a talking squirrel', 'Set the story by a river'" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormDescription>Max 500 characters.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                         {/* Trigger generation via form's onSubmit */}
                         <Button
                            type="button" // Prevent default form submission if necessary
                            onClick={form.handleSubmit(onGenerateSubmit)} // Use RHF submit handler
                            disabled={generateStoryMutation.isPending}
                            className="w-full bg-storytime-purple hover:bg-storytime-purple/90 text-white"
                         >
                            {generateStoryMutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="mr-2 h-4 w-4" /> Generate Story</>
                            )}
                        </Button>
                    </CardFooter>
                 </Card>
              </TabsContent>

              {/* Edit Tab - Now enabled only after generation */}
               <TabsContent value="edit">
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                             <div>
                                <CardTitle>Edit & Preview Story</CardTitle>
                                <CardDescription>Make changes to the generated text below.</CardDescription>
                             </div>
                             <div className="flex gap-2">
                                 <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={form.handleSubmit(onGenerateSubmit)} // Re-generate
                                     disabled={generateStoryMutation.isPending}
                                     title="Regenerate based on current parameters"
                                 >
                                     <RotateCw className="mr-2 h-4 w-4" />
                                     Regenerate
                                 </Button>
                                 <Button
                                     size="sm"
                                     onClick={handleSaveStory} // Save current content
                                     disabled={saveStoryMutation.isPending || !storyContent}
                                     className="bg-storytime-green hover:bg-storytime-green/90"
                                 >
                                     {saveStoryMutation.isPending ? (
                                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                     ) : (
                                         <Save className="mr-2 h-4 w-4" />
                                     )}
                                     {generatedStoryId ? 'Update Story' : 'Save Story'}
                                 </Button>
                             </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                         {generateStoryMutation.isPending && (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-storytime-purple"/>
                            </div>
                         )}
                         {generateStoryMutation.isError && (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Generation Error</AlertTitle>
                                <AlertDescription>{generateStoryMutation.error.message}</AlertDescription>
                            </Alert>
                         )}
                         {storyContent && !generateStoryMutation.isPending && (
                             <Textarea
                                value={storyContent}
                                onChange={(e) => setStoryContent(e.target.value)}
                                className="min-h-[500px] font-mono text-sm" // Use mono for easier Markdown editing
                                placeholder="Your generated story will appear here..."
                            />
                         )}
                         {!storyContent && !generateStoryMutation.isPending && (
                             <div className="text-center py-10 text-gray-500">
                                Generate a story using the parameters tab first.
                             </div>
                         )}
                    </CardContent>
                 </Card>
               </TabsContent>

              {/* Voice Tab - Placeholder Content, requires TTS logic */}
               <TabsContent value="voice">
                 <Card>
                    <CardHeader>
                        <CardTitle>Add Narration</CardTitle>
                        <CardDescription>Choose a voice and generate the audio for your saved story.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         {/* TODO: Implement voice selection (professional/cloned) */}
                         {/* TODO: Implement selection of specific voice ID */}
                         {/* TODO: Implement Slider for speed/pitch? */}
                         {/* TODO: Implement useMutation hook to call elevenlabs-tts function */}
                         {/* TODO: Implement button to trigger TTS generation */}
                         {/* TODO: Implement audio player to preview/play generated audioUrl */}
                         {/* TODO: Save audioUrl/duration/voiceId to story_readings table */}
                          <div className="text-center py-10 text-gray-500">
                             Voice selection and audio generation coming soon! (Requires saving the story first).
                          </div>
                    </CardContent>
                 </Card>
               </TabsContent>

               {/* Publish Tab - Placeholder */}
                <TabsContent value="publish">
                 <Card>
                    <CardHeader>
                        <CardTitle>Publish & Share</CardTitle>
                        <CardDescription>Make your story public or share it.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         {/* TODO: Implement toggle for is_public flag */}
                         {/* TODO: Implement sharing options */}
                         <div className="text-center py-10 text-gray-500">
                             Publishing options coming soon! (Requires saving the story first).
                          </div>
                    </CardContent>
                 </Card>
               </TabsContent>

            </Tabs>

            {/* Buttons like Cancel might be outside the form/tabs if desired */}
            {/* <div className="flex justify-between mt-8"> ... </div> */}
          </form>
        </Form>
      </div>
    </div>
  );
};

export default StoryCreator;
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Sparkles,
  BookOpen, 
  Edit, 
  Headphones, 
  RotateCw,
  Save,
  Play,
  PenTool
} from 'lucide-react';

const StoryCreator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [storyContent, setStoryContent] = useState('');
  
  const generateStory = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setStoryContent(`# The Adventures of Luna the Brave

Once upon a time, in a small village nestled between rolling hills and whispering forests, there lived a curious little girl named Luna. Luna had bright eyes that sparkled like stars and a heart full of courage.

Luna loved exploring the meadows near her home, collecting colorful flowers and watching butterflies dance in the sunlight. But what she loved most was listening to her grandmother's stories about magical creatures that lived deep in the Whispering Woods.

"Grandma, are there really dragons and fairies in the woods?" Luna would ask, her eyes wide with wonder.

Her grandmother would smile mysteriously and say, "The forest holds many secrets, my dear. Those with brave hearts might discover them."

One sunny morning, Luna noticed something unusual—a trail of glittering dust leading from her window toward the edge of the Whispering Woods. Without hesitation, Luna put on her red boots and followed the sparkling path.

As she entered the forest, the trees seemed to lean down to greet her, their leaves rustling in whispered conversations. The path twisted and turned, taking Luna deeper into the woods than she had ever gone before.

Suddenly, Luna heard a soft whimper. Following the sound, she discovered a tiny fox with fur as white as snow, its paw caught under a fallen branch.

"Don't worry, little one," Luna said gently. "I'll help you."

With all her might, Luna lifted the branch and freed the fox. To her amazement, the fox spoke!

"Thank you, brave child. You have a kind heart."

Luna gasped. "You can talk!"

The fox bowed its head. "I am Silverfox, guardian of these woods. You have shown courage and compassion. For that, I will grant you a wish."

Luna thought carefully. "I don't need a wish for myself," she said. "But could you show me some of the magic my grandmother told me about?"

Silverfox's eyes twinkled. "That is a wish I would be happy to grant. Follow me."

Together, Luna and Silverfox journeyed through the forest, where Luna met gentle giants who tended ancient trees, fairies who painted flowers with morning dew, and even a young dragon who was learning to breathe fire.

As the day grew late, Silverfox led Luna back to the edge of the forest. "Remember, Luna the Brave, magic exists everywhere—in the kindness you show others, in the courage to help those in need, and in the wonder with which you see the world."

Luna returned home, her heart full of joy and her mind filled with magical memories. From that day on, whenever villagers spoke of courage, they would mention Luna the Brave, the girl who found magic in the Whispering Woods.

And sometimes, on quiet mornings, if Luna looked carefully out her window, she would see a white fox watching from the edge of the forest, its tail leaving a trail of glittering dust.

The End.`);
      setIsGenerating(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-bold mb-8">Story Creator Studio</h1>
        
        <Tabs defaultValue="parameters" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="parameters" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              <span>Story Parameters</span>
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Generate</span>
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              <span>Edit Story</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              <span>Voice Settings</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <TabsContent value="parameters" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="storyTitle">Story Title</Label>
                  <Input id="storyTitle" placeholder="Enter a title for your story" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="ageRange">Age Range</Label>
                    <Select defaultValue="4-8">
                      <SelectTrigger>
                        <SelectValue placeholder="Select age range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-3">0-3 years</SelectItem>
                        <SelectItem value="4-6">4-6 years</SelectItem>
                        <SelectItem value="4-8">4-8 years</SelectItem>
                        <SelectItem value="9-12">9-12 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="storyLength">Story Length</Label>
                    <Select defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue placeholder="Select length" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short (3-5 min)</SelectItem>
                        <SelectItem value="medium">Medium (5-10 min)</SelectItem>
                        <SelectItem value="long">Long (10-15 min)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select defaultValue="adventure">
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adventure">Adventure</SelectItem>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="animals">Animals</SelectItem>
                      <SelectItem value="friendship">Friendship</SelectItem>
                      <SelectItem value="space">Space</SelectItem>
                      <SelectItem value="ocean">Ocean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="mainCharacter">Main Character</Label>
                  <Input id="mainCharacter" placeholder="Name of the main character" />
                </div>
                
                <div>
                  <Label htmlFor="educationalFocus">Educational Focus</Label>
                  <Select defaultValue="courage">
                    <SelectTrigger>
                      <SelectValue placeholder="Select educational focus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kindness">Kindness</SelectItem>
                      <SelectItem value="courage">Courage</SelectItem>
                      <SelectItem value="curiosity">Curiosity</SelectItem>
                      <SelectItem value="perseverance">Perseverance</SelectItem>
                      <SelectItem value="teamwork">Teamwork</SelectItem>
                      <SelectItem value="patience">Patience</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="additionalInstructions">Additional Instructions</Label>
                  <Textarea id="additionalInstructions" placeholder="Add any specific details or elements you'd like in the story" />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="generate" className="space-y-6">
              <div className="border rounded-lg p-6 bg-slate-50">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-storytime-purple" />
                  AI Story Generation
                </h3>
                <p className="text-gray-600 mb-6">
                  Our AI will create a personalized story based on your parameters. This process typically takes less than a minute.
                </p>
                
                <Button 
                  onClick={generateStory} 
                  disabled={isGenerating}
                  className="bg-storytime-purple hover:bg-storytime-purple/90 text-white w-full"
                >
                  {isGenerating ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating your story...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Story
                    </>
                  )}
                </Button>
              </div>
              
              {storyContent && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Preview</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex items-center">
                        <RotateCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                      <Button size="sm" className="bg-storytime-green hover:bg-storytime-green/90 text-white flex items-center">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-6 bg-white max-h-[500px] overflow-y-auto story-preview">
                    <div className="prose max-w-none">
                      {storyContent.split('\n\n').map((paragraph, index) => {
                        if (paragraph.startsWith('# ')) {
                          return <h2 key={index} className="text-2xl font-bold mb-4">{paragraph.substring(2)}</h2>;
                        }
                        return <p key={index} className="mb-4">{paragraph}</p>;
                      })}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="edit" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Edit Your Story</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex items-center">
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                </div>
              </div>
              
              <Textarea 
                value={storyContent} 
                onChange={(e) => setStoryContent(e.target.value)} 
                className="min-h-[500px] font-medium"
              />
            </TabsContent>
            
            <TabsContent value="voice" className="space-y-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="voiceType">Voice Type</Label>
                  <Select defaultValue="professional">
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional Narrator</SelectItem>
                      <SelectItem value="cloned">Your Cloned Voice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="voiceSelection">Voice Selection</Label>
                  <Select defaultValue="sarah">
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sarah">Sarah (Professional Female)</SelectItem>
                      <SelectItem value="james">James (Professional Male)</SelectItem>
                      <SelectItem value="emma">Emma (Professional Female - British)</SelectItem>
                      <SelectItem value="michael">Michael (Professional Male - American)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="readingSpeed">Reading Speed</Label>
                    <span className="text-sm text-gray-500">Normal</span>
                  </div>
                  <Slider defaultValue={[50]} max={100} step={1} />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Slower</span>
                    <span>Faster</span>
                  </div>
                </div>
                
                <div className="border rounded-lg p-6 bg-slate-50">
                  <h3 className="text-lg font-semibold mb-3">Voice Preview</h3>
                  <p className="text-gray-600 mb-4">
                    Listen to a sample of your selected voice:
                  </p>
                  <div className="flex justify-center">
                    <Button className="bg-storytime-purple hover:bg-storytime-purple/90 text-white flex items-center">
                      <Play className="h-4 w-4 mr-2" />
                      Play Sample
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        <div className="flex justify-between mt-8">
          <Button variant="outline">Cancel</Button>
          <div className="space-x-3">
            <Button variant="outline" className="flex items-center">
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button className="bg-storytime-purple hover:bg-storytime-purple/90 text-white flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              Preview Story
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryCreator;

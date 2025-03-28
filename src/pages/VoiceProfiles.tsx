
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Mic, 
  Play, 
  Plus, 
  Trash, 
  CheckCircle, 
  VoiceNetwork,
  Settings,
  AlertCircle
} from 'lucide-react';

// Mock voice profiles data
const mockVoiceProfiles = [
  {
    id: '1',
    name: 'My Reading Voice',
    createdAt: '2 months ago',
    isDefault: true,
  },
  {
    id: '2',
    name: 'Bedtime Story Voice',
    createdAt: '3 weeks ago',
    isDefault: false,
  }
];

// Mock voice samples data
const mockVoiceSamples = [
  {
    id: '1',
    name: 'Sarah (Professional Female)',
    description: 'Warm and friendly female voice with American accent',
    isPremium: false,
  },
  {
    id: '2',
    name: 'James (Professional Male)',
    description: 'Clear and engaging male voice with British accent',
    isPremium: false,
  },
  {
    id: '3',
    name: 'Emma (Professional Female)',
    description: 'Soft and nurturing female voice perfect for bedtime stories',
    isPremium: true,
  },
  {
    id: '4',
    name: 'Michael (Professional Male)',
    description: 'Energetic male voice ideal for adventure stories',
    isPremium: true,
  }
];

const VoiceProfiles = () => {
  const [voiceProfiles, setVoiceProfiles] = useState(mockVoiceProfiles);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingStage, setRecordingStage] = useState(0);
  
  const startRecording = () => {
    setIsRecording(true);
    setRecordingProgress(0);
    setRecordingStage(1);
    
    // Simulate recording progress
    const interval = setInterval(() => {
      setRecordingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setRecordingStage(2);
          return 100;
        }
        return prev + 1;
      });
    }, 60);
  };
  
  const deleteVoiceProfile = (id: string) => {
    setVoiceProfiles(voiceProfiles.filter(profile => profile.id !== id));
  };
  
  const setDefaultVoiceProfile = (id: string) => {
    setVoiceProfiles(voiceProfiles.map(profile => ({
      ...profile,
      isDefault: profile.id === id
    })));
  };
  
  const addNewVoiceProfile = (name: string) => {
    const newProfile = {
      id: (voiceProfiles.length + 1).toString(),
      name,
      createdAt: 'Just now',
      isDefault: false,
    };
    
    setVoiceProfiles([...voiceProfiles, newProfile]);
  };
  
  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-bold mb-8">Voice Profiles</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Your Voice Profiles</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-storytime-purple hover:bg-storytime-purple/90 text-white flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Voice
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New Voice Profile</DialogTitle>
                      <DialogDescription>
                        Record a sample of your voice to create a personalized voice profile for narrating stories.
                      </DialogDescription>
                    </DialogHeader>
                    
                    {recordingStage === 0 && (
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="voice-name">Voice Profile Name</Label>
                          <Input id="voice-name" placeholder="E.g., My Storytelling Voice" />
                        </div>
                        
                        <div className="border rounded-md p-4 space-y-2">
                          <h4 className="font-medium flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2 text-storytime-blue" />
                            Recording Tips
                          </h4>
                          <ul className="text-sm text-gray-600 space-y-1 pl-6 list-disc">
                            <li>Use a quiet environment with minimal background noise</li>
                            <li>Speak in your natural storytelling voice</li>
                            <li>Maintain a consistent distance from your microphone</li>
                            <li>You'll need to read for about 1 minute</li>
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {recordingStage === 1 && (
                      <div className="space-y-4 py-4">
                        <div className="border rounded-md p-4 space-y-4">
                          <h4 className="font-medium text-center">Please read the following text:</h4>
                          <p className="text-gray-700 italic text-sm">
                            "Once upon a time in a land of endless wonder, there lived a curious child who loved to explore. Every day brought new adventures and discoveries, from the tallest trees to the smallest flowers. The world was full of magic for those who took the time to notice the little things. And so our story begins, with a heart full of courage and eyes wide open to the possibilities that await."
                          </p>
                          <div className="flex justify-center">
                            <div className="w-full max-w-xs bg-gray-100 rounded-full h-2.5">
                              <div 
                                className="bg-storytime-purple h-2.5 rounded-full" 
                                style={{ width: `${recordingProgress}%` }}
                              ></div>
                            </div>
                          </div>
                          <p className="text-center text-sm text-gray-500">
                            Recording in progress... {recordingProgress}%
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {recordingStage === 2 && (
                      <div className="space-y-4 py-4 text-center">
                        <CheckCircle className="h-16 w-16 text-storytime-green mx-auto" />
                        <h3 className="font-semibold text-lg">Recording Complete!</h3>
                        <p className="text-gray-600">
                          Your voice sample has been recorded successfully. We're now processing it to create your voice profile.
                        </p>
                      </div>
                    )}
                    
                    <DialogFooter>
                      {recordingStage === 0 && (
                        <Button 
                          onClick={startRecording}
                          className="bg-storytime-purple hover:bg-storytime-purple/90 text-white flex items-center"
                        >
                          <Mic className="h-4 w-4 mr-2" />
                          Start Recording
                        </Button>
                      )}
                      
                      {recordingStage === 1 && (
                        <Button 
                          disabled
                          className="bg-gray-400 text-white cursor-not-allowed"
                        >
                          Recording in progress...
                        </Button>
                      )}
                      
                      {recordingStage === 2 && (
                        <Button 
                          onClick={() => {
                            addNewVoiceProfile("My New Voice");
                            setRecordingStage(0);
                          }}
                          className="bg-storytime-green hover:bg-storytime-green/90 text-white"
                        >
                          Create Voice Profile
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {voiceProfiles.length > 0 ? (
                <div className="space-y-4">
                  {voiceProfiles.map((profile) => (
                    <Card key={profile.id} className="border border-gray-200">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{profile.name}</CardTitle>
                            <CardDescription>Created {profile.createdAt}</CardDescription>
                          </div>
                          {profile.isDefault && (
                            <div className="bg-storytime-purple/10 text-storytime-purple text-xs font-medium px-2 py-1 rounded-full flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Default
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardFooter className="pt-2 flex justify-between">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="flex items-center">
                            <Play className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex items-center"
                            onClick={() => setDefaultVoiceProfile(profile.id)}
                            disabled={profile.isDefault}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Set as Default
                          </Button>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteVoiceProfile(profile.id)}
                          disabled={profile.isDefault}
                        >
                          <Trash className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <VoiceNetwork className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Voice Profiles Yet</h3>
                  <p className="text-gray-500 mb-6">Create your first voice profile to start narrating stories</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6">Professional Voices</h2>
              
              <div className="space-y-4">
                {mockVoiceSamples.map((voice) => (
                  <Card key={voice.id} className="border border-gray-200">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{voice.name}</CardTitle>
                        {voice.isPremium && (
                          <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                            Premium
                          </span>
                        )}
                      </div>
                      <CardDescription>{voice.description}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2">
                      <Button size="sm" variant="outline" className="flex items-center">
                        <Play className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Voice Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="defaultVoice">Default Voice</Label>
                  <div className="text-sm text-gray-600 mb-1">Choose which voice to use by default for new stories</div>
                  <Select defaultValue="profile:1">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select default voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profile:1">My Reading Voice (Your Voice)</SelectItem>
                      <SelectItem value="profile:2">Bedtime Story Voice (Your Voice)</SelectItem>
                      <SelectItem value="sarah">Sarah (Professional Female)</SelectItem>
                      <SelectItem value="james">James (Professional Male)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Button variant="outline" className="w-full flex items-center justify-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced Voice Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceProfiles;


import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  BookOpen 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const StoryReading = () => {
  const { id } = useParams<{ id: string }>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Mock story data
  const storyTitle = "The Adventures of Luna the Brave";
  const storyPages = [
    {
      text: "Once upon a time, in a small village nestled between rolling hills and whispering forests, there lived a curious little girl named Luna. Luna had bright eyes that sparkled like stars and a heart full of courage.\n\nLuna loved exploring the meadows near her home, collecting colorful flowers and watching butterflies dance in the sunlight. But what she loved most was listening to her grandmother's stories about magical creatures that lived deep in the Whispering Woods.",
      image: "https://images.unsplash.com/photo-1619532550766-12c525d012bc?q=80&w=1587&auto=format&fit=crop"
    },
    {
      text: "\"Grandma, are there really dragons and fairies in the woods?\" Luna would ask, her eyes wide with wonder.\n\nHer grandmother would smile mysteriously and say, \"The forest holds many secrets, my dear. Those with brave hearts might discover them.\"",
      image: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=1438&auto=format&fit=crop"
    },
    {
      text: "One sunny morning, Luna noticed something unusual—a trail of glittering dust leading from her window toward the edge of the Whispering Woods. Without hesitation, Luna put on her red boots and followed the sparkling path.\n\nAs she entered the forest, the trees seemed to lean down to greet her, their leaves rustling in whispered conversations. The path twisted and turned, taking Luna deeper into the woods than she had ever gone before.",
      image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=1470&auto=format&fit=crop"
    },
    {
      text: "Suddenly, Luna heard a soft whimper. Following the sound, she discovered a tiny fox with fur as white as snow, its paw caught under a fallen branch.\n\n\"Don't worry, little one,\" Luna said gently. \"I'll help you.\"",
      image: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=1472&auto=format&fit=crop"
    },
    {
      text: "With all her might, Luna lifted the branch and freed the fox. To her amazement, the fox spoke!\n\n\"Thank you, brave child. You have a kind heart.\"\n\nLuna gasped. \"You can talk!\"",
      image: "https://images.unsplash.com/photo-1612957693059-13b7934e4619?q=80&w=1470&auto=format&fit=crop"
    }
  ];
  
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  const goToNextPage = () => {
    if (currentPage < storyPages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  return (
    <div className={`min-h-screen bg-storytime-background flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Reading Controls Header */}
      <div className="bg-white shadow-sm py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-storytime-purple" />
            <h1 className="text-xl font-bold">{storyTitle}</h1>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullscreen}
            className="text-gray-600"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      {/* Story Content */}
      <div className="flex-grow flex flex-col items-center justify-center py-8 px-6">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg overflow-hidden animate-fade-in">
          <div className="aspect-video relative overflow-hidden">
            <img 
              src={storyPages[currentPage].image} 
              alt={`Story illustration for page ${currentPage + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="p-6 md:p-8">
            <div className="flex justify-between text-sm text-gray-500 mb-4">
              <span>Page {currentPage + 1} of {storyPages.length}</span>
              <span>{Math.floor(progress)}% complete</span>
            </div>
            
            <div className="prose max-w-none mb-6">
              {storyPages[currentPage].text.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Audio Controls */}
      <div className="bg-white shadow-sm py-4 px-6 border-t">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={toggleMute}
                  className="text-gray-600 hover:text-storytime-purple"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                
                {!isMuted && (
                  <div className="w-24">
                    <Slider defaultValue={[70]} max={100} step={1} />
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 0}
                  className="text-gray-600 hover:text-storytime-purple disabled:opacity-50"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePlayPause}
                  className="h-10 w-10 rounded-full bg-storytime-purple text-white hover:bg-storytime-purple/90"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={goToNextPage}
                  disabled={currentPage === storyPages.length - 1}
                  className="text-gray-600 hover:text-storytime-purple disabled:opacity-50"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="hidden sm:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={goToPreviousPage}
                  className="text-gray-600 hover:text-storytime-purple flex items-center disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === storyPages.length - 1}
                  onClick={goToNextPage}
                  className="text-gray-600 hover:text-storytime-purple flex items-center disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
            
            <div className="w-full">
              <Slider 
                value={[progress]} 
                max={100} 
                step={0.1}
                onValueChange={(value) => setProgress(value[0])}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryReading;

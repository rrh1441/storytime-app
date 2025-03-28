
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TabsContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Plus, BookOpen } from 'lucide-react';
import StoryCard from '@/components/stories/StoryCard';
import { Link } from 'react-router-dom';

// Mock data for stories
const allStories = [
  {
    id: '1',
    title: 'The Adventures of Luna the Brave',
    coverImage: 'https://images.unsplash.com/photo-1619532550766-12c525d012bc?q=80&w=1587&auto=format&fit=crop',
    ageRange: 'Ages 4-8',
    duration: '5 min',
    isNew: true
  },
  {
    id: '2',
    title: 'The Magical Forest Friends',
    coverImage: 'https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?q=80&w=1470&auto=format&fit=crop',
    ageRange: 'Ages 3-6',
    duration: '4 min'
  },
  {
    id: '3',
    title: 'Captain Finn\'s Ocean Adventure',
    coverImage: 'https://images.unsplash.com/photo-1535381273077-21e815afe1ce?q=80&w=1587&auto=format&fit=crop',
    ageRange: 'Ages 5-9',
    duration: '6 min'
  },
  {
    id: '4',
    title: 'The Brave Little Robot',
    coverImage: 'https://images.unsplash.com/photo-1535378917042-10a5c3b5e6a4?q=80&w=1547&auto=format&fit=crop',
    ageRange: 'Ages 6-10',
    duration: '7 min'
  },
  {
    id: '5',
    title: 'Princess Zara and the Dragon',
    coverImage: 'https://images.unsplash.com/photo-1604725333736-1f962a6218d0?q=80&w=1587&auto=format&fit=crop',
    ageRange: 'Ages 5-8',
    duration: '6 min'
  },
  {
    id: '6',
    title: 'The Curious Astronaut',
    coverImage: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1472&auto=format&fit=crop',
    ageRange: 'Ages 7-10',
    duration: '8 min'
  }
];

const StoryLibrary = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter stories based on search term
  const filteredStories = allStories.filter(story => 
    story.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-wrap justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Story Library</h1>
          <Link to="/create-story">
            <Button className="bg-storytime-purple hover:bg-storytime-purple/90 text-white flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Create New Story
            </Button>
          </Link>
        </div>
        
        <Tabs defaultValue="all" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <TabsList className="bg-white">
              <TabsTrigger value="all">All Stories</TabsTrigger>
              <TabsTrigger value="your">Your Stories</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search stories..." 
                  className="pl-9 w-full sm:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="bg-white border rounded-md p-2">
                <Filter className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-wrap justify-between items-center mb-6">
              <div className="flex items-center space-x-3 mb-4 sm:mb-0">
                <p className="text-gray-600">
                  <span className="font-medium text-black">{filteredStories.length}</span> stories
                </p>
                <Select defaultValue="newest">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="a-z">A-Z</SelectItem>
                    <SelectItem value="z-a">Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-3">
                <Select defaultValue="all-ages">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Age Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-ages">All Ages</SelectItem>
                    <SelectItem value="0-3">0-3 years</SelectItem>
                    <SelectItem value="4-6">4-6 years</SelectItem>
                    <SelectItem value="7-10">7-10 years</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select defaultValue="all-themes">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-themes">All Themes</SelectItem>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="fantasy">Fantasy</SelectItem>
                    <SelectItem value="animals">Animals</SelectItem>
                    <SelectItem value="space">Space</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <TabsContent value="all">
              {filteredStories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredStories.map((story) => (
                    <StoryCard
                      key={story.id}
                      id={story.id}
                      title={story.title}
                      coverImage={story.coverImage}
                      ageRange={story.ageRange}
                      duration={story.duration}
                      isNew={story.isNew}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No stories found</h3>
                  <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="your">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredStories.slice(0, 3).map((story) => (
                  <StoryCard
                    key={story.id}
                    id={story.id}
                    title={story.title}
                    coverImage={story.coverImage}
                    ageRange={story.ageRange}
                    duration={story.duration}
                    isNew={story.isNew}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="favorites">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredStories.slice(1, 3).map((story) => (
                  <StoryCard
                    key={story.id}
                    id={story.id}
                    title={story.title}
                    coverImage={story.coverImage}
                    ageRange={story.ageRange}
                    duration={story.duration}
                    isNew={story.isNew}
                  />
                ))}
              </div>
            </TabsContent>
          </div>
          
          <div className="flex justify-center mt-8">
            <Button variant="outline" className="mx-auto">Load More Stories</Button>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default StoryLibrary;

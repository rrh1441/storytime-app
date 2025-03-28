
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Clock, Bookmark, Settings } from 'lucide-react';
import StoryCard from '@/components/stories/StoryCard';

// Mock data for user's stories
const userStories = [
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
  }
];

const Dashboard = () => {
  // This would normally be fetched from an auth context or API
  const userName = "Sarah";
  
  return (
    <div className="min-h-screen bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        {/* Welcome Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {userName}!</h1>
          <p className="text-gray-600">Create and manage your personalized children's stories.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link to="/create-story">
            <div className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-storytime-lightBlue flex items-center justify-center">
                <Plus className="h-6 w-6 text-storytime-purple" />
              </div>
              <div>
                <h3 className="font-semibold">Create New Story</h3>
                <p className="text-sm text-gray-500">Generate a custom story</p>
              </div>
            </div>
          </Link>
          
          <Link to="/voice-profiles">
            <div className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-storytime-lightBlue flex items-center justify-center">
                <Settings className="h-6 w-6 text-storytime-blue" />
              </div>
              <div>
                <h3 className="font-semibold">Voice Profiles</h3>
                <p className="text-sm text-gray-500">Manage your voice settings</p>
              </div>
            </div>
          </Link>
          
          <Link to="/favorites">
            <div className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-storytime-lightBlue flex items-center justify-center">
                <Bookmark className="h-6 w-6 text-storytime-green" />
              </div>
              <div>
                <h3 className="font-semibold">Favorites</h3>
                <p className="text-sm text-gray-500">View your bookmarked stories</p>
              </div>
            </div>
          </Link>
        </div>

        {/* My Stories Section */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">My Stories</h2>
            <Link to="/stories">
              <Button variant="ghost" className="text-storytime-purple hover:text-storytime-purple/90 story-link">
                View all
              </Button>
            </Link>
          </div>

          {userStories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {userStories.map((story) => (
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
            <div className="text-center py-16 bg-white rounded-lg shadow-sm">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No stories yet</h3>
              <p className="text-gray-500 mb-6">Create your first story to get started!</p>
              <Link to="/create-story">
                <Button className="bg-storytime-purple hover:bg-storytime-purple/90 text-white">
                  Create New Story
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-md divide-y">
            <div className="p-4 flex items-center">
              <div className="w-10 h-10 rounded-full bg-storytime-lightBlue flex items-center justify-center mr-4">
                <BookOpen className="h-5 w-5 text-storytime-blue" />
              </div>
              <div>
                <p className="font-medium">You created a new story: "The Adventures of Luna the Brave"</p>
                <p className="text-sm text-gray-500">2 days ago</p>
              </div>
            </div>
            <div className="p-4 flex items-center">
              <div className="w-10 h-10 rounded-full bg-storytime-lightBlue flex items-center justify-center mr-4">
                <Clock className="h-5 w-5 text-storytime-green" />
              </div>
              <div>
                <p className="font-medium">You read "The Magical Forest Friends" to completion</p>
                <p className="text-sm text-gray-500">4 days ago</p>
              </div>
            </div>
            <div className="p-4 flex items-center">
              <div className="w-10 h-10 rounded-full bg-storytime-lightBlue flex items-center justify-center mr-4">
                <Settings className="h-5 w-5 text-storytime-purple" />
              </div>
              <div>
                <p className="font-medium">You created a new voice profile</p>
                <p className="text-sm text-gray-500">1 week ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

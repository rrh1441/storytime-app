import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Headphones, Sparkles, Users, Clock, BarChart } from 'lucide-react';
import StoryCard from '@/components/stories/StoryCard';

// Mock data for featured stories
const featuredStories = [
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

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="w-full lg:w-1/2 mb-12 lg:mb-0">
              <h1 className="hero-heading mb-6">
                <span className="gradient-text">Bring your stories to life.</span> Just add voice.
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8">
                Create magical, personalized children's stories with AI assistance and bring them to life with professional narration or your own voice.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button className="bg-storytime-purple hover:bg-storytime-purple/90 text-white font-medium text-lg px-8 py-6">
                    Try for free
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button variant="outline" className="font-medium text-lg px-8 py-6">
                    How it works
                  </Button>
                </Link>
              </div>
            </div>
            <div className="w-full lg:w-1/2 relative">
              <div className="relative z-10 rounded-2xl shadow-xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1476234251651-f353703a034d?q=80&w=1769&auto=format&fit=crop" 
                  alt="Parent reading to child" 
                  className="w-full h-auto"
                />
              </div>
              <div className="absolute -top-6 -right-6 w-64 h-64 bg-storytime-pink opacity-30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-storytime-purple opacity-20 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="section-heading mb-4">Create Unforgettable Stories</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              StoryTime combines artificial intelligence and voice technology to help you create and narrate personalized children's stories in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-storytime-lightBlue flex items-center justify-center mb-5">
                <Sparkles className="h-8 w-8 text-storytime-blue" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI-Powered Stories</h3>
              <p className="text-gray-600">
                Generate age-appropriate, educational stories tailored to your child's interests and learning goals.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-storytime-lightBlue flex items-center justify-center mb-5">
                <Headphones className="h-8 w-8 text-storytime-blue" />
              </div>
              <h3 className="text-xl font-bold mb-3">Voice Cloning</h3>
              <p className="text-gray-600">
                Use your own voice or choose from our library of professional narrators to bring stories to life.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-storytime-lightBlue flex items-center justify-center mb-5">
                <BookOpen className="h-8 w-8 text-storytime-blue" />
              </div>
              <h3 className="text-xl font-bold mb-3">Interactive Reading</h3>
              <p className="text-gray-600">
                Engage children with interactive elements, highlighting text as it's read for a complete learning experience.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-storytime-lightBlue flex items-center justify-center mb-5">
                <Users className="h-8 w-8 text-storytime-blue" />
              </div>
              <h3 className="text-xl font-bold mb-3">Personalized Characters</h3>
              <p className="text-gray-600">
                Create stories featuring your child as the main character, or customize characters to match their interests.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-storytime-lightBlue flex items-center justify-center mb-5">
                <Clock className="h-8 w-8 text-storytime-blue" />
              </div>
              <h3 className="text-xl font-bold mb-3">Save Time</h3>
              <p className="text-gray-600">
                Create professional-quality stories in minutes, not hours, perfect for busy parents and educators.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-storytime-lightBlue flex items-center justify-center mb-5">
                <BarChart className="h-8 w-8 text-storytime-blue" />
              </div>
              <h3 className="text-xl font-bold mb-3">Educational Focus</h3>
              <p className="text-gray-600">
                Incorporate specific educational elements and learning goals into your stories with our guided tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stories Section */}
      <section className="py-20 bg-storytime-background">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center mb-10">
            <h2 className="section-heading mb-0">Featured Stories</h2>
            <Link to="/stories" className="text-storytime-purple hover:text-storytime-purple/90 font-semibold story-link">
              View all stories
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredStories.map((story) => (
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
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-storytime-purple to-storytime-pink text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to create your first story?</h2>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto opacity-90">
            Join thousands of parents and educators who are creating magical story experiences for children.
          </p>
          <Link to="/signup">
            <Button className="bg-white text-storytime-purple hover:bg-gray-100 font-medium text-lg px-8 py-6">
              Start creating now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

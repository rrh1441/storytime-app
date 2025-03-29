
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Headphones, Sparkles, Users, Clock, BarChart, Bird, Leaf, Cloud } from 'lucide-react';
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
    <div className="flex flex-col min-h-screen bg-[#F2FCE2]">
      {/* Hero Section with Ghibli-inspired styling */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Floating clouds */}
        <div className="absolute top-20 left-20 animate-float opacity-70">
          <Cloud className="h-20 w-20 text-[#D3E4FD]" />
        </div>
        <div className="absolute top-40 right-20 animate-bounce-slow opacity-60">
          <Cloud className="h-16 w-16 text-[#D3E4FD]" />
        </div>
        <div className="absolute bottom-40 left-1/4 animate-bounce-slow opacity-50">
          <Cloud className="h-24 w-24 text-[#D3E4FD]" />
        </div>
        
        {/* Floating nature elements */}
        <div className="absolute bottom-20 right-1/3 animate-float">
          <Leaf className="h-10 w-10 text-[#06D6A0] opacity-60" />
        </div>
        <div className="absolute top-48 left-1/3 animate-float">
          <Bird className="h-8 w-8 text-[#FEC6A1] opacity-70" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="w-full lg:w-1/2 mb-12 lg:mb-0">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight text-[#8E9196]">
                <span className="block text-[#06D6A0]">Discover</span>
                <span className="block text-[#FF9F51]">Magical</span>
                <span className="block text-[#4FB8FF]">Stories</span>
              </h1>
              <p className="text-lg md:text-xl text-[#8E9196] mb-8 max-w-xl font-medium">
                Create enchanted tales that transport children to worlds of wonder, where nature and imagination intertwine.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button className="bg-[#4FB8FF] hover:bg-[#4FB8FF]/90 text-white font-medium text-lg px-8 py-6 rounded-full shadow-lg">
                    Begin your journey
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button variant="outline" className="font-medium text-lg px-8 py-6 border-[#FEC6A1] text-[#FEC6A1] hover:bg-[#FEC6A1]/10 rounded-full">
                    Explore the magic
                  </Button>
                </Link>
              </div>
            </div>
            <div className="w-full lg:w-1/2 relative">
              <div className="relative z-10 rounded-3xl shadow-xl overflow-hidden border-4 border-white transform rotate-1">
                <img 
                  src="https://images.unsplash.com/photo-1476234251651-f353703a034d?q=80&w=1769&auto=format&fit=crop" 
                  alt="Parent reading to child" 
                  className="w-full h-auto"
                />
              </div>
              <div className="absolute -top-6 -right-6 w-64 h-64 bg-[#FFDEE2] opacity-30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-[#E5DEFF] opacity-40 rounded-full blur-3xl"></div>
              
              {/* Ghibli-inspired decorative elements */}
              <div className="absolute -bottom-8 right-20 transform rotate-12">
                <Sparkles className="h-12 w-12 text-[#FFD166]" />
              </div>
              <div className="absolute top-10 -right-6 transform -rotate-12">
                <Leaf className="h-14 w-14 text-[#06D6A0] opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#FEF7CD]/40">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-[#FF9F51]">The Magic of Storytelling</h2>
            <p className="text-lg text-[#8E9196] max-w-3xl mx-auto">
              StoryTime combines imagination and technology to weave tales that captivate children and transport them to magical worlds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center p-6 bg-white/70 rounded-xl backdrop-blur-sm border border-white/40 shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md">
              <div className="w-16 h-16 rounded-full bg-[#D3E4FD] flex items-center justify-center mb-5">
                <Sparkles className="h-8 w-8 text-[#4FB8FF]" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#4FB8FF]">Enchanted Stories</h3>
              <p className="text-[#8E9196]">
                Create magical tales inspired by nature, adventure, and friendship that spark children's imagination.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-white/70 rounded-xl backdrop-blur-sm border border-white/40 shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md">
              <div className="w-16 h-16 rounded-full bg-[#FDE1D3] flex items-center justify-center mb-5">
                <Headphones className="h-8 w-8 text-[#FF9F51]" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#FF9F51]">Soothing Narration</h3>
              <p className="text-[#8E9196]">
                Bring stories to life with gentle voices that guide children through magical landscapes and adventures.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-white/70 rounded-xl backdrop-blur-sm border border-white/40 shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md">
              <div className="w-16 h-16 rounded-full bg-[#E5DEFF] flex items-center justify-center mb-5">
                <BookOpen className="h-8 w-8 text-[#8A4FFF]" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#8A4FFF]">Immersive Reading</h3>
              <p className="text-[#8E9196]">
                Create an enchanting experience with beautiful illustrations that bring each story to vivid life.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-white/70 rounded-xl backdrop-blur-sm border border-white/40 shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md">
              <div className="w-16 h-16 rounded-full bg-[#FFDEE2] flex items-center justify-center mb-5">
                <Users className="h-8 w-8 text-[#EF476F]" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#EF476F]">Personalized Characters</h3>
              <p className="text-[#8E9196]">
                Place your child in the heart of the story as the hero of their own magical adventure.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-white/70 rounded-xl backdrop-blur-sm border border-white/40 shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md">
              <div className="w-16 h-16 rounded-full bg-[#F2FCE2] flex items-center justify-center mb-5">
                <Clock className="h-8 w-8 text-[#06D6A0]" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#06D6A0]">Bedtime Ready</h3>
              <p className="text-[#8E9196]">
                Perfect-length tales designed to fit into bedtime routines, helping children transition to peaceful sleep.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-white/70 rounded-xl backdrop-blur-sm border border-white/40 shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md">
              <div className="w-16 h-16 rounded-full bg-[#FEF7CD] flex items-center justify-center mb-5">
                <BarChart className="h-8 w-8 text-[#FFD166]" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#FFD166]">Growth Mindset</h3>
              <p className="text-[#8E9196]">
                Stories that nurture courage, kindness, and curiosity, gently teaching important life values.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stories Section */}
      <section className="py-20 bg-[#F9FAFC] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10">
          <Leaf className="h-20 w-20 text-[#06D6A0]/20 transform rotate-45" />
        </div>
        <div className="absolute bottom-10 right-10">
          <Cloud className="h-24 w-24 text-[#4FB8FF]/20" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-0 text-[#8A4FFF]">Magical Tales</h2>
            <Link to="/stories" className="text-[#8A4FFF] hover:text-[#8A4FFF]/90 font-semibold story-link">
              Explore all stories
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
      <section className="py-20 bg-gradient-to-r from-[#4FB8FF] to-[#06D6A0] text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-12 bg-white opacity-20">
          <div className="wave"></div>
        </div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">Begin your storytelling adventure</h2>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto opacity-90">
            Join families who are creating magical bedtime moments with stories that inspire wonder and joy.
          </p>
          <Link to="/signup">
            <Button className="bg-white text-[#4FB8FF] hover:bg-white/90 font-medium text-lg px-8 py-6 rounded-full shadow-lg">
              Create your first story
            </Button>
          </Link>
        </div>
        
        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-white opacity-20">
          <div className="wave-bottom"></div>
        </div>
      </section>
    </div>
  );
};

export default Home;

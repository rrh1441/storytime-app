import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Headphones, Sparkles, Users, Clock, BarChart, Bird, Leaf, Cloud, PenTool, Mic, PlayCircle } from 'lucide-react';
import StoryCard from '@/components/stories/StoryCard';

// Mock data for featured stories (keep as is or update)
const featuredStories = [
  {
    id: '1',
    title: 'The Adventures of Luna the Brave',
    // Use a generic placeholder path, you might replace these too
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
  // ... other featured stories
];

const Home = () => {
  return (
    // Use the background color from your updated example
    <div className="flex flex-col min-h-screen bg-[#F2FCE2]">
      {/* Hero Section with Ghibli-inspired styling */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Floating clouds and elements from your updated example */}
        <div className="absolute top-20 left-20 animate-float opacity-70 z-0">
          <Cloud className="h-20 w-20 text-[#D3E4FD]" />
        </div>
        <div className="absolute top-40 right-20 animate-bounce-slow opacity-60 z-0">
          <Cloud className="h-16 w-16 text-[#D3E4FD]" />
        </div>
        <div className="absolute bottom-40 left-1/4 animate-bounce-slow opacity-50 z-0">
          <Cloud className="h-24 w-24 text-[#D3E4FD]" />
        </div>
        <div className="absolute bottom-20 right-1/3 animate-float z-0">
          <Leaf className="h-10 w-10 text-[#06D6A0] opacity-60" />
        </div>
        <div className="absolute top-48 left-1/3 animate-float z-0">
          <Bird className="h-8 w-8 text-[#FEC6A1] opacity-70" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="w-full lg:w-[55%] mb-12 lg:mb-0 text-center lg:text-left"> {/* Adjusted width */}
              {/* Ghibli-esque heading from your updated example */}
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight font-bold text-[#6b7280]"> {/* Adjusted text color */}
                <span className="block text-[#06D6A0]">Discover</span>
                <span className="block text-[#FF9F51]">Magical</span>
                <span className="block text-[#4FB8FF]">Stories</span>
              </h1>
              <p className="text-lg md:text-xl text-[#6b7280] mb-8 max-w-xl mx-auto lg:mx-0"> {/* Adjusted text color */}
                Create enchanted tales with AI, brought to life by your voice. Transport children to worlds of wonder where nature and imagination intertwine. Try your first story free!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {/* Buttons from your updated example */}
                <Link to="/create-story">
                  <Button className="bg-[#4FB8FF] hover:bg-[#4FB8FF]/90 text-white font-medium text-lg px-8 py-3 rounded-full shadow-lg h-auto">
                    Create First Story Free
                  </Button>
                </Link>
                 <a href="/#how-it-works"> {/* Use anchor link */}
                  <Button variant="outline" className="font-medium text-lg px-8 py-3 border-[#FEC6A1] text-[#FEC6A1] hover:bg-[#FEC6A1]/10 rounded-full h-auto">
                    Explore the Magic
                  </Button>
                </a>
              </div>
            </div>
            <div className="w-full lg:w-[45%] relative mt-10 lg:mt-0"> {/* Adjusted width */}
              <div className="relative z-10 rounded-3xl shadow-xl overflow-hidden border-4 border-white transform rotate-1 aspect-video">
                 {/* --- Use the correct image path --- */}
                 <img
                   src="/landing_image.jpg" // <-- Updated path
                   alt="Two children reading a magical story book outdoors" // Updated alt text
                   className="w-full h-full object-cover"
                 />
                 {/* --------------------------------- */}
              </div>
              {/* Decorative elements from your updated example */}
              <div className="absolute -top-6 -right-6 w-32 h-32 md:w-64 md:h-64 bg-[#FFDEE2] opacity-30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 md:w-72 md:h-72 bg-[#E5DEFF] opacity-40 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-8 right-10 md:right-20 transform rotate-12 z-20">
                <Sparkles className="h-8 w-8 md:h-12 md:w-12 text-[#FFD166]" />
              </div>
              <div className="absolute top-10 -right-3 md:-right-6 transform -rotate-12 z-20">
                <Leaf className="h-10 w-10 md:h-14 md:h-14 text-[#06D6A0] opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- How It Works Section --- */}
      <section id="how-it-works" className="py-20 bg-white scroll-mt-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="section-heading mb-4 text-[#8A4FFF]">How StoryTime Works</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Creating personalized, narrated stories is simple and fun. Follow these easy steps:
            </p>
          </div>
          {/* Reusing the 4-step layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 items-start">
             {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-4">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-full bg-storytime-lightBlue flex items-center justify-center">
                  <PenTool className="h-8 w-8 text-storytime-blue" />
                </div>
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-storytime-purple text-white font-bold text-xs">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-storytime-blue">Set Parameters</h3>
              <p className="text-gray-600 text-sm">
                Choose the age range, theme, characters, length, and any educational focus for your story.
              </p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-4">
               <div className="relative mb-5">
                <div className="w-16 h-16 rounded-full bg-[#E7FCEC] flex items-center justify-center"> {/* Green background */}
                  <Sparkles className="h-8 w-8 text-storytime-green" />
                </div>
                 <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-storytime-purple text-white font-bold text-xs">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-storytime-green">Generate Story</h3>
              <p className="text-gray-600 text-sm">
                Our AI crafts a unique story based on your input. Review and edit the text as needed. (First one's free!)
              </p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-4">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-full bg-[#FFEAF2] flex items-center justify-center"> {/* Pink background */}
                   <Mic className="h-8 w-8 text-storytime-pink" />
                </div>
                 <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-storytime-purple text-white font-bold text-xs">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-storytime-pink">Add Voice</h3>
              <p className="text-gray-600 text-sm">
                Select a professional narrator or easily record your own voice using our voice cloning feature.
              </p>
            </div>
             {/* Step 4 */}
            <div className="flex flex-col items-center text-center p-4">
               <div className="relative mb-5">
                <div className="w-16 h-16 rounded-full bg-[#FFF5E7] flex items-center justify-center"> {/* Orange background */}
                  <PlayCircle className="h-8 w-8 text-storytime-orange" />
                </div>
                 <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-storytime-purple text-white font-bold text-xs">4</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-storytime-orange">Enjoy!</h3>
              <p className="text-gray-600 text-sm">
                Listen to the narrated story with highlighting text and interactive elements in the Reading Room.
              </p>
            </div>
          </div>
           <div className="text-center mt-12">
                <Link to="/create-story">
                   <Button size="lg" className="bg-storytime-purple hover:bg-storytime-purple/90 text-white font-medium rounded-full">
                     Start Creating Your Story
                   </Button>
                 </Link>
           </div>
        </div>
      </section>

       {/* Featured Stories Section */}
      <section className="py-20 bg-storytime-background relative overflow-hidden">
           {/* Decorative elements (optional) */}
           <div className="absolute top-10 left-10 opacity-20">
             <Leaf className="h-20 w-20 text-[#06D6A0] transform rotate-45" />
           </div>
           <div className="absolute bottom-10 right-10 opacity-20">
             <Cloud className="h-24 w-24 text-[#4FB8FF]" />
           </div>

            <div className="container mx-auto px-6 relative z-10">
                 <div className="flex justify-between items-center mb-10">
                   <h2 className="section-heading mb-0 text-[#8A4FFF]">Magical Tales</h2> {/* Use Ghibli colors */}
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
      <section className="py-20 bg-gradient-to-r from-storytime-blue to-storytime-green text-white relative overflow-hidden">
            {/* Decorative elements (optional waves from index.css) */}
            <div className="absolute top-0 left-0 w-full h-12 bg-[#F2FCE2] opacity-20"> {/* Match background */}
              <div className="wave"></div>
            </div>

            <div className="container mx-auto px-6 text-center relative z-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">Begin your storytelling adventure</h2>
              <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto opacity-90">
                Join families creating magical bedtime moments with stories that inspire wonder and joy.
              </p>
              <Link to="/create-story">
                <Button className="bg-white text-storytime-blue hover:bg-white/90 font-medium text-lg px-8 py-3 rounded-full shadow-lg h-auto">
                  Create Your First Story (Free!)
                </Button>
              </Link>
            </div>

             <div className="absolute bottom-0 left-0 w-full h-12 bg-[#F2FCE2] opacity-20"> {/* Match background */}
              <div className="wave-bottom"></div>
            </div>
      </section>
    </div>
  );
};

export default Home;
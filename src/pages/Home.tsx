// src/pages/Home.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
// Removed unused icons like BookOpen, Headphones, Users, BarChart, Mic
import { Sparkles, Clock, Bird, Leaf, Cloud, PenTool, PlayCircle, PauseCircle } from 'lucide-react';

// Updated featured stories data (Duration is still here but won't be displayed)
const featuredStories = [
  {
    id: 'cosmic',
    title: 'Cosmic Adventures',
    coverImage: '/Cosmic.png',
    audioSrc: '/Cosmic.mp3',
    duration: '4 min', // We'll just not render this part
  },
  {
    id: 'flying',
    title: 'The Flying Acorn Ship',
    coverImage: '/Flying.png',
    audioSrc: '/Flying.mp3',
    duration: '6 min', // We'll just not render this part
  },
  {
    id: 'whispers',
    title: 'The Whispers of the Windwood',
    coverImage: '/Whispers.png',
    audioSrc: '/Whispers.mp3',
    duration: '5 min', // We'll just not render this part
  }
];

const Home: React.FC = () => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement | null>>(new Map());

  // Function to manage refs
  const setAudioRef = (id: string, element: HTMLAudioElement | null) => {
    if (element) {
      audioRefs.current.set(id, element);
    } else {
      audioRefs.current.delete(id);
    }
  };

  // Function to toggle play/pause
  const togglePlay = (id: string) => {
    const currentAudio = audioRefs.current.get(id);
    const isCurrentlyPlaying = playingAudioId === id;

    audioRefs.current.forEach((audioEl, audioId) => {
        if (audioId !== id && audioEl && !audioEl.paused) {
            audioEl.pause();
        }
    });

    if (currentAudio) {
      if (isCurrentlyPlaying) {
        currentAudio.pause();
        setPlayingAudioId(null);
      } else {
        currentAudio.play().then(() => {
            setPlayingAudioId(id);
            const onEnded = () => {
                setPlayingAudioId(null);
                currentAudio.removeEventListener('ended', onEnded);
            };
            currentAudio.addEventListener('ended', onEnded);
        }).catch(err => {
            console.error("Error playing audio:", err);
            setPlayingAudioId(null);
        });
      }
    }
  };

   // Cleanup effect
   useEffect(() => {
      return () => {
          audioRefs.current.forEach((audioEl) => {
              audioEl?.pause();
          });
      };
  }, []);


  return (
    <div className="flex flex-col min-h-screen bg-[#F2FCE2]">

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pb-32 overflow-hidden">
        {/* Floating elements */}
        <div className="absolute top-10 md:top-20 left-5 md:left-20 animate-float opacity-70 z-0"> <Cloud className="h-16 w-16 md:h-20 md:w-20 text-[#D3E4FD]" /> </div>
        <div className="absolute top-20 md:top-40 right-5 md:right-20 animate-bounce-slow opacity-60 z-0"> <Cloud className="h-12 w-12 md:h-16 md:w-16 text-[#D3E4FD]" /> </div>
        <div className="absolute bottom-20 md:bottom-40 left-1/4 animate-bounce-slow opacity-50 z-0"> <Cloud className="h-16 w-16 md:h-24 md:w-24 text-[#D3E4FD]" /> </div>
        <div className="absolute bottom-10 md:bottom-20 right-1/3 animate-float z-0"> <Leaf className="h-8 w-8 md:h-10 md:h-10 text-[#06D6A0] opacity-60" /> </div>
        <div className="absolute top-32 md:top-48 left-1/3 animate-float z-0"> <Bird className="h-6 w-6 md:h-8 md:w-8 text-[#FEC6A1] opacity-70" /> </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="w-full lg:w-[55%] mb-12 lg:mb-0 text-center lg:text-left">
              {/* Headline */}
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight font-bold text-[#4FB8FF]">
                 Your Ideas,
                <span className="block text-[#FF9F51]">Their Adventures</span>
              </h1>
              {/* Subhead */}
              <p className="text-lg md:text-xl text-[#6b7280] mb-8 max-w-xl mx-auto lg:mx-0">
                Never run out of stories again. Create stories they'll always remember. Transport your kids to worlds of wonder. Try your first story free!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/create-story">
                  <Button className="bg-[#4FB8FF] hover:bg-[#4FB8FF]/90 text-white font-medium text-lg px-8 py-3 rounded-full shadow-lg h-auto">
                    Create First Story Free
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" className="font-medium text-lg px-8 py-3 border-[#FEC6A1] text-[#FEC6A1] hover:bg-[#FEC6A1]/10 rounded-full h-auto">
                    Explore the Magic
                  </Button>
                </a>
              </div>
            </div>
            <div className="w-full lg:w-[45%] relative mt-10 lg:mt-0">
              <div className="relative z-10 rounded-3xl shadow-xl overflow-hidden border-4 border-white transform rotate-1">
                 <img
                   src="/landing_image.png"
                   alt="Two children reading a magical story book outdoors"
                   className="w-full h-full object-cover"
                   width="1769" height="995"
                 />
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 md:w-64 md:h-64 bg-[#FFDEE2] opacity-30 rounded-full blur-3xl -z-10"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 md:w-72 md:h-72 bg-[#E5DEFF] opacity-40 rounded-full blur-3xl -z-10"></div>
              <div className="absolute -bottom-8 right-10 md:right-20 transform rotate-12 z-20"> <Sparkles className="h-8 w-8 md:h-12 md:w-12 text-[#FFD166]" /> </div>
              <div className="absolute top-10 -right-3 md:-right-6 transform -rotate-12 z-20"> <Leaf className="h-10 w-10 md:h-14 md:h-14 text-[#06D6A0] opacity-80" /> </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white scroll-mt-20">
         <div className="container mx-auto px-6">
           <div className="text-center mb-16">
             <h2 className="section-heading mb-4 text-[#8A4FFF]">How StoryTime Works</h2>
             <p className="text-lg text-gray-600 max-w-3xl mx-auto">
               Creating personalized, narrated stories is simple and fun. Follow these easy steps:
             </p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 items-start">
             {/* Step 1 */}
             <div className="flex flex-col items-center text-center p-4">
                <div className="relative mb-5"> <div className="w-16 h-16 rounded-full bg-storytime-lightBlue flex items-center justify-center"> <PenTool className="h-8 w-8 text-storytime-blue" /> </div> <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-storytime-purple text-white font-bold text-xs">1</span> </div>
                <h3 className="text-xl font-bold mb-3 text-storytime-blue">Outline Your Story</h3>
                <p className="text-gray-600 text-sm"> Choose the theme, characters, and any educational focus for your story (length is ~3min). </p>
             </div>
             {/* Step 2 */}
             <div className="flex flex-col items-center text-center p-4">
                <div className="relative mb-5"> <div className="w-16 h-16 rounded-full bg-[#E7FCEC] flex items-center justify-center"> <Sparkles className="h-8 w-8 text-storytime-green" /> </div> <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-storytime-purple text-white font-bold text-xs">2</span> </div>
                <h3 className="text-xl font-bold mb-3 text-storytime-green">Generate Story</h3>
                <p className="text-gray-600 text-sm"> Our AI crafts a unique story based on your input. Review and edit the text as needed. (First one's free!) </p>
             </div>
             {/* Step 3 */}
             <div className="flex flex-col items-center text-center p-4">
                 {/* Corrected icon reference */}
                <div className="relative mb-5"> <div className="w-16 h-16 rounded-full bg-[#FFEAF2] flex items-center justify-center"> <Headphones className="h-8 w-8 text-storytime-pink" /> </div> <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-storytime-purple text-white font-bold text-xs">3</span> </div>
                <h3 className="text-xl font-bold mb-3 text-storytime-pink">Add Voice</h3>
                <p className="text-gray-600 text-sm"> Select a professional narrator or easily record your own voice using our voice cloning feature. </p>
             </div>
              {/* Step 4 */}
             <div className="flex flex-col items-center text-center p-4">
                <div className="relative mb-5"> <div className="w-16 h-16 rounded-full bg-[#FFF5E7] flex items-center justify-center"> <PlayCircle className="h-8 w-8 text-storytime-orange" /> </div> <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-storytime-purple text-white font-bold text-xs">4</span> </div>
                <h3 className="text-xl font-bold mb-3 text-storytime-orange">Enjoy!</h3>
                <p className="text-gray-600 text-sm"> Listen to the narrated story with highlighting text and interactive elements in the Reading Room. </p>
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
          <div className="absolute top-10 left-10 opacity-20"> <Leaf className="h-20 w-20 text-[#06D6A0] transform rotate-45" /> </div>
          <div className="absolute bottom-10 right-10 opacity-20"> <Cloud className="h-24 w-24 text-[#4FB8FF]" /> </div>
          <div className="container mx-auto px-6 relative z-10">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-[#8A4FFF] text-center sm:text-left">Magical Tales</h2>
                  <Link to="/stories" className="text-[#8A4FFF] hover:text-[#8A4FFF]/90 font-semibold story-link whitespace-nowrap">
                      Explore all stories &rarr;
                  </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {featuredStories.map((story) => (
                      <div key={story.id} className="bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg flex flex-col">
                          {/* Image Container - Taller Aspect Ratio */}
                          <div className="relative aspect-[3/4] overflow-hidden">
                              <img
                                  src={story.coverImage}
                                  alt={story.title}
                                  className="w-full h-full object-cover"
                              />
                          </div>
                          {/* Content */}
                          <div className="p-4 flex flex-col flex-grow">
                              <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">{story.title}</h3>
                              {/* Footer area containing only the Play button */}
                              <div className="flex items-center justify-end mt-auto pt-2 text-sm text-gray-500">
                                  {/* --- Duration REMOVED --- */}
                                  {/* <div className="flex items-center space-x-1">
                                      <Clock className="h-4 w-4" />
                                      <span>{story.duration}</span>
                                  </div> */}
                                  {/* Play/Pause Button */}
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-storytime-purple hover:text-storytime-purple/90 flex items-center space-x-1 p-1 h-auto"
                                      onClick={() => togglePlay(story.id)}
                                  >
                                      {playingAudioId === story.id ? ( <PauseCircle className="h-6 w-6"/> ) : ( <PlayCircle className="h-6 w-6" /> )}
                                      <span className="text-xs font-medium">{playingAudioId === story.id ? 'Pause' : 'Play'}</span>
                                  </Button>
                              </div>
                              {/* Hidden Audio Element */}
                              <audio
                                  ref={(el) => setAudioRef(story.id, el)}
                                  src={story.audioSrc}
                                  preload="metadata"
                                  onPause={() => { if(playingAudioId === story.id) setPlayingAudioId(null); }}
                              >
                                  Your browser does not support the audio element.
                              </audio>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-storytime-blue to-storytime-green text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-12 bg-[#F2FCE2] opacity-20"> <div className="wave"></div> </div>
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
             <div className="absolute bottom-0 left-0 w-full h-12 bg-[#F2FCE2] opacity-20"> <div className="wave-bottom"></div> </div>
      </section>

    </div>
  );
};

export default Home;
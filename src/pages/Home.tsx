// src/pages/Home.tsx
import React, { useState, useRef } from 'react'; // Added React, useState, useRef
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Headphones, Sparkles, Users, Clock, BarChart, Bird, Leaf, Cloud, PenTool, Mic, PlayCircle, PauseCircle } from 'lucide-react'; // Added PlayCircle, PauseCircle
// REMOVED: StoryCard import

// Updated featured stories data
const featuredStories = [
  {
    id: 'cosmic',
    title: 'Cosmic Adventures',
    coverImage: '/Cosmic.png', // Use actual path in /public
    audioSrc: '/Cosmic.mp3',   // Use actual path in /public
    duration: '4 min', // Keep duration or remove if not needed
  },
  {
    id: 'flying',
    title: 'The Flying Acorn Ship',
    coverImage: '/Flying.png',
    audioSrc: '/Flying.mp3',
    duration: '6 min',
  },
  {
    id: 'whispers',
    title: 'The Whispers of the Windwood',
    coverImage: '/Whispers.png',
    audioSrc: '/Whispers.mp3',
    duration: '5 min',
  }
];

const Home: React.FC = () => { // Added React.FC type
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  // Use a map for refs to handle multiple audio elements
  const audioRefs = useRef<Map<string, HTMLAudioElement | null>>(new Map());

  // Ensure ref is set for each audio element
  const setAudioRef = (id: string, element: HTMLAudioElement | null) => {
    if (element) {
      audioRefs.current.set(id, element);
    } else {
      audioRefs.current.delete(id);
    }
  };

  // Function to handle play/pause toggling
  const togglePlay = (id: string) => {
    const currentAudio = audioRefs.current.get(id);
    const isCurrentlyPlaying = playingAudioId === id;

    // Pause any other playing audio first
    audioRefs.current.forEach((audioEl, audioId) => {
        if (audioId !== id && audioEl && !audioEl.paused) {
            audioEl.pause();
            audioEl.currentTime = 0; // Reset other audio
        }
    });

    if (currentAudio) {
      if (isCurrentlyPlaying) {
        currentAudio.pause();
        setPlayingAudioId(null);
      } else {
        currentAudio.play().then(() => {
            setPlayingAudioId(id);
            // Add listener to clear state when audio finishes
            const onEnded = () => {
                setPlayingAudioId(null);
                currentAudio.removeEventListener('ended', onEnded);
            };
            currentAudio.addEventListener('ended', onEnded);
        }).catch(err => {
            console.error("Error playing audio:", err);
            setPlayingAudioId(null); // Reset state on error
        });
      }
    }
  };

  // Stop audio when component unmounts or user navigates away
  React.useEffect(() => {
      return () => {
          audioRefs.current.forEach((audioEl) => {
              audioEl?.pause();
          });
          setPlayingAudioId(null);
      };
  }, []);


  return (
    <div className="flex flex-col min-h-screen bg-[#F2FCE2]">
      {/* Hero Section (Keep as is) */}
      <section className="relative pt-20 pb-24 md:pb-32 overflow-hidden">
        {/* ... floating elements ... */}
        <div className="container mx-auto px-6 relative z-10">
            {/* ... hero text and image ... */}
        </div>
      </section>

      {/* How It Works Section (Keep as is) */}
      <section id="how-it-works" className="py-20 bg-white scroll-mt-20">
         {/* ... section content ... */}
      </section>

        {/* Featured Stories Section - MODIFIED */}
        <section className="py-20 bg-storytime-background relative overflow-hidden">
            {/* ... decorative elements ... */}
            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-[#8A4FFF] text-center sm:text-left">Magical Tales</h2>
                    <Link to="/stories" className="text-[#8A4FFF] hover:text-[#8A4FFF]/90 font-semibold story-link whitespace-nowrap">
                        Explore all stories &rarr;
                    </Link>
                </div>
                {/* Use custom structure instead of StoryCard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {featuredStories.map((story) => (
                        <div key={story.id} className="bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg flex flex-col">
                            {/* Image */}
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <img
                                    src={story.coverImage}
                                    alt={story.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {/* Content */}
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">{story.title}</h3>
                                <div className="flex items-center justify-between mt-auto pt-2 text-sm text-gray-500">
                                    <div className="flex items-center space-x-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{story.duration}</span>
                                    </div>
                                    {/* Play/Pause Button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-storytime-purple hover:text-storytime-purple/90 flex items-center space-x-1 p-1 h-auto"
                                        onClick={() => togglePlay(story.id)}
                                    >
                                        {playingAudioId === story.id ? (
                                            <PauseCircle className="h-6 w-6"/>
                                        ) : (
                                            <PlayCircle className="h-6 w-6" />
                                        )}
                                        <span className="text-xs font-medium">{playingAudioId === story.id ? 'Pause' : 'Play'}</span>
                                    </Button>
                                </div>
                                {/* Hidden Audio Element */}
                                <audio
                                    ref={(el) => setAudioRef(story.id, el)}
                                    src={story.audioSrc}
                                    preload="metadata" // Preload metadata but not full audio
                                    onPause={() => { // Ensure state resets if paused manually
                                        if(playingAudioId === story.id) setPlayingAudioId(null);
                                    }}
                                >
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

      {/* CTA Section (Keep as is) */}
      <section className="py-20 bg-gradient-to-r from-storytime-blue to-storytime-green text-white relative overflow-hidden">
         {/* ... section content ... */}
      </section>
    </div>
  );
};

export default Home;
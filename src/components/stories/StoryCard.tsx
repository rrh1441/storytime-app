
import { Link } from 'react-router-dom';
import { PlayCircle, BookOpen, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StoryCardProps {
  id: string;
  title: string;
  coverImage: string;
  ageRange: string;
  duration: string;
  isNew?: boolean;
}

const StoryCard = ({ id, title, coverImage, ageRange, duration, isNew = false }: StoryCardProps) => {
  return (
    <div className="story-card overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={coverImage} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        {isNew && (
          <div className="absolute top-3 right-3 bg-storytime-pink text-white text-xs font-bold py-1 px-2 rounded-full">
            NEW
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{title}</h3>
        <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <BookOpen className="h-4 w-4" />
            <span>{ageRange}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{duration}</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Link to={`/story/${id}`}>
            <Button 
              variant="ghost" 
              className="text-storytime-purple hover:text-storytime-purple/90 p-0"
            >
              Read Story
            </Button>
          </Link>
          <Link to={`/story/${id}/play`}>
            <Button 
              variant="ghost" 
              className="text-storytime-purple hover:text-storytime-purple/90 flex items-center space-x-1 p-0"
            >
              <PlayCircle className="h-5 w-5" />
              <span>Play</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StoryCard;

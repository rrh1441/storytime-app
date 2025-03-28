
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, X } from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="py-4 px-6 md:px-8 bg-white shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <BookOpen className="h-8 w-8 text-storytime-purple" />
          <span className="text-2xl font-display font-bold gradient-text">StoryTime</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/features" className="font-medium text-gray-600 hover:text-storytime-purple transition-colors">
            Features
          </Link>
          <Link to="/pricing" className="font-medium text-gray-600 hover:text-storytime-purple transition-colors">
            Pricing
          </Link>
          <Link to="/how-it-works" className="font-medium text-gray-600 hover:text-storytime-purple transition-colors">
            How It Works
          </Link>
          <div className="flex items-center space-x-3">
            <Link to="/login">
              <Button variant="outline" className="font-medium">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-storytime-purple hover:bg-storytime-purple/90 text-white font-medium">
                Try for free
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? 
            <X className="h-6 w-6 text-gray-700" /> : 
            <Menu className="h-6 w-6 text-gray-700" />
          }
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-white md:hidden animate-fade-in">
          <div className="flex flex-col p-8 space-y-6">
            <Link 
              to="/features" 
              className="text-xl font-medium text-gray-600 hover:text-storytime-purple"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link 
              to="/pricing" 
              className="text-xl font-medium text-gray-600 hover:text-storytime-purple"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              to="/how-it-works" 
              className="text-xl font-medium text-gray-600 hover:text-storytime-purple"
              onClick={() => setIsMenuOpen(false)}
            >
              How It Works
            </Link>
            <div className="pt-4 space-y-4">
              <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" className="w-full font-medium">
                  Log in
                </Button>
              </Link>
              <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full bg-storytime-purple hover:bg-storytime-purple/90 text-white font-medium">
                  Try for free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

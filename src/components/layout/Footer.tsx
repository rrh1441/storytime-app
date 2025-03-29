import { Link } from 'react-router-dom';
import { BookOpen, Twitter, Facebook, Instagram, Mail } from "lucide-react";

const Footer = () => {
  return (
    // Added subtle background matching the Ghibli theme
    <footer className="bg-[#FEF7CD]/40 pt-16 pb-12 border-t border-[#06D6A0]/20 mt-auto"> {/* Added mt-auto */}
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"> {/* Adjusted grid columns */}
          {/* Logo and Social Column (Spans more on medium screens) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1"> {/* Adjusted spans */}
            <Link to="/" className="flex items-center space-x-2 mb-6">
              <BookOpen className="h-6 w-6 text-[#8A4FFF]" />
              {/* Match Navbar title style */}
              <span className="text-xl font-display font-bold text-[#4FB8FF]">StoryTime</span>
            </Link>
            <p className="text-[#6b7280] mb-4 text-sm"> {/* Adjusted text color */}
              Create magical, personalized children's stories with AI assistance and bring them to life with your own voice.
            </p>
            <div className="flex space-x-4">
              {/* Social links - add actual URLs */}
              <a href="#" aria-label="Twitter" className="text-gray-400 hover:text-[#8A4FFF] transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-[#8A4FFF] transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-[#8A4FFF] transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Updated Product Links Column */}
          <div>
            <h3 className="text-sm font-semibold text-[#FF9F51] uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <a href="/#how-it-works" className="text-[#6b7280] hover:text-[#8A4FFF] transition-colors text-sm"> {/* Use anchor link */}
                  How It Works
                </a>
              </li>
              <li>
                 <Link to="/create-story" className="text-[#6b7280] hover:text-[#8A4FFF] transition-colors text-sm">
                   Create Story
                 </Link>
              </li>
               <li>
                 <Link to="/stories" className="text-[#6b7280] hover:text-[#8A4FFF] transition-colors text-sm">
                    Story Library
                 </Link>
               </li>
               {/* MOVED & MODIFIED: Contact Us Link */}
               <li>
                 <a href="mailto:support@simpleappsgroup.com" className="text-[#6b7280] hover:text-[#8A4FFF] transition-colors flex items-center space-x-1 text-sm">
                   <Mail className="h-4 w-4" />
                   <span>Contact Us</span>
                 </a>
               </li>
            </ul>
          </div>

          {/* REMOVED Resources Column */}

          {/* REMOVED Company Column */}

        </div>

        {/* Bottom Copyright/Links Section (Unchanged) */}
        <div className="border-t border-[#06D6A0]/20 pt-8">
          <p className="text-[#6b7280] text-sm text-center"> {/* Adjusted text color */}
            &copy; {new Date().getFullYear()} StoryTime. All rights reserved. Made with Magic ✨.
          </p>
          <div className="flex justify-center mt-4 space-x-6">
            <Link to="/privacy" className="text-xs text-[#6b7280] hover:text-[#8A4FFF] transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs text-[#6b7280] hover:text-[#8A4FFF] transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
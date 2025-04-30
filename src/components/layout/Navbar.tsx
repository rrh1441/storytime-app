// src/components/layout/Navbar.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, X, Tag } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
// Removed Skeleton import as it's no longer used here

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth(); // Get 'loading'

  // Logging remains for debugging if needed
  useEffect(() => {
    console.log("Navbar received Auth State - Loading:", loading, "User:", !!user);
  }, [loading, user]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    // Close menu on initial mount in case resize happens before interaction
    setIsMenuOpen(false);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      setIsMenuOpen(false); // Close mobile menu on logout
      await logout();
      // Navigation will happen automatically via AuthContext/ProtectedRoute
    } catch (error) {
      console.error("Logout failed:", error);
      // Optionally show a toast notification for logout failure
    }
  };

  const closeMobileMenu = () => setIsMenuOpen(false);

  return (
    <nav className="py-4 px-6 md:px-8 bg-white shadow-sm sticky top-0 z-40">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
          <BookOpen className="h-8 w-8 text-[#8A4FFF]" />
          <span className="text-2xl font-display font-bold text-[#4FB8FF]">
            StoryTime
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
          <a
            href="/#how-it-works"
            className="font-medium text-gray-600 hover:text-[#8A4FFF] transition-colors"
          >
            How It Works
          </a>
          <Link
            to="/pricing"
            className="font-medium text-gray-600 hover:text-[#8A4FFF] transition-colors flex items-center gap-1"
          >
            <Tag className="h-4 w-4" /> Pricing
          </Link>

          {/* --- MODIFIED CONDITIONAL RENDERING --- */}
          {user && !loading ? ( // Show logged-in state only if user exists AND loading is finished
            // Logged In State
            <>
              <Link
                to="/dashboard"
                className="font-medium text-gray-600 hover:text-[#8A4FFF] transition-colors"
              >
                Dashboard
              </Link>
              <Button
                variant="outline"
                className="font-medium border-[#FF9F51] text-[#FF9F51] hover:bg-[#FF9F51]/10 rounded-full h-9 px-4"
                onClick={handleLogout}
              >
                Log Out
              </Button>
            </>
          ) : ( // Show logged-out state if no user OR if still loading
            // Logged Out State (or Loading State)
            <div className="flex items-center space-x-3">
              <Link to="/login">
                <Button
                  variant="outline"
                  className="font-medium border-gray-300 hover:border-[#8A4FFF] hover:text-[#8A4FFF] rounded-full h-9 px-4"
                >
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  className="bg-[#4FB8FF] hover:bg-[#4FB8FF]/90 text-white font-medium rounded-full shadow-sm h-9 px-4"
                >
                  Sign Up Free
                </Button>
              </Link>
            </div>
          )}
          {/* --- END MODIFICATION --- */}

        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-1"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X className="h-6 w-6 text-gray-700" /> : <Menu className="h-6 w-6 text-gray-700" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-[69px] left-0 w-full bg-white shadow-md md:hidden z-30 border-t border-gray-100">
          <div className="flex flex-col p-6 space-y-5">
            <a
              href="/#how-it-works"
              className="text-lg font-medium text-gray-700 hover:text-[#8A4FFF]"
              onClick={closeMobileMenu}
            >
              How It Works
            </a>
            <Link
              to="/pricing"
              className="text-lg font-medium text-gray-700 hover:text-[#8A4FFF] flex items-center gap-2"
              onClick={closeMobileMenu}
            >
               <Tag className="h-5 w-5" /> Pricing
            </Link>

            {/* --- MODIFIED MOBILE CONDITIONAL RENDERING --- */}
            {user && !loading ? ( // Show logged-in state only if user exists AND loading is finished
              <>
                <Link
                  to="/dashboard"
                  className="text-lg font-medium text-gray-700 hover:text-[#8A4FFF]"
                  onClick={closeMobileMenu}
                >
                  Dashboard
                </Link>
                <Button
                  variant="outline"
                  className="w-full font-medium border-[#FF9F51] text-[#FF9F51] hover:bg-[#FF9F51]/10 rounded-full"
                  onClick={handleLogout} // Logout function closes menu internally now
                >
                  Log Out
                </Button>
              </>
            ) : ( // Show logged-out state if no  user OR if still loading
              <div className="pt-4 space-y-4">
                <Link to="/login" onClick={closeMobileMenu}>
                  <Button className="w-full font-medium rounded-full" variant="outline">
                    Log in
                  </Button>
                </Link>
                <Link to="/signup" onClick={closeMobileMenu}>
                  <Button className="w-full bg-[#4FB8FF] hover:bg-[#4FB8FF]/90 text-white font-medium rounded-full">
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            )}
             {/* --- END MODIFICATION --- */}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
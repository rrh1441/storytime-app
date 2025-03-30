// src/App.tsx

// --- Existing Imports ---
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Note: Consider changing these layout imports to use aliases too for consistency
// e.g., import Navbar from "@/components/layout/Navbar";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
// Import pages using aliases for consistency if desired
// e.g., import Home from "@/pages/Home";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import StoryCreator from "./pages/StoryCreator";
import StoryLibrary from "./pages/StoryLibrary";
import StoryReading from "./pages/StoryReading";
import VoiceProfiles from "./pages/VoiceProfiles";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { AuthProvider } from '@/context/AuthContext'; // Import AuthProvider

// --- CORRECTED Import Path ---
import ProtectedRoute from "@/components/ProtectedRoute"; // Use alias path

// --- Existing QueryClient setup ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  // --- Existing Providers are kept ---
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* --- Existing Layout is kept --- */}
          <div className="flex flex-col min-h-screen">
            <Navbar /> {/* You might update Navbar later to show login/logout state */}
            <main className="flex-grow">
              {/* --- Routes restructured --- */}
              <Routes>
                {/* --- Root Route Handling --- */}
                <Route path="/" element={<Home />} />
                
                {/* --- Public Routes --- */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                
                {/* Story creator page - public */}
                <Route path="/create-story" element={<StoryCreator />} />
                
                {/* Story reading page - assume public for now */}
                <Route path="/story/:id/play" element={<StoryReading />} />

                {/* --- Protected Routes --- */}
                <Route element={<ProtectedRoute />}> {/* Wrap protected routes */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/stories" element={<StoryLibrary />} />
                  <Route path="/voice-profiles" element={<VoiceProfiles />} />
                  {/* Add other routes that require login here */}
                </Route>

                {/* Legacy Routes Handling */}
                <Route path="/create" element={<Navigate to="/create-story" replace />} />
                <Route path="/library" element={<Navigate to="/stories" replace />} />

                {/* Not Found Route (Keep last) */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
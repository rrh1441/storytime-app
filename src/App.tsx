// src/App.tsx

// --- Existing Imports ---
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import StoryCreator from "./pages/StoryCreator";
import StoryLibrary from "./pages/StoryLibrary";
import StoryReading from "./pages/StoryReading";
import VoiceProfiles from "./pages/VoiceProfiles";
import NotFound from "./pages/NotFound";

// --- Add New Imports ---
import LoginPage from "./pages/LoginPage"; // Import Login Page
import SignupPage from "./pages/SignupPage"; // Import Signup Page
import ProtectedRoute from "./components/ProtectedRoute"; // Import ProtectedRoute

// --- Existing QueryClient setup ---
const queryClient = new QueryClient();

const App = () => (
  // --- Existing Providers are kept ---
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* --- Existing Layout is kept --- */}
        <div className="flex flex-col min-h-screen">
          <Navbar /> {/* You might update Navbar later to show login/logout state */}
          <main className="flex-grow">
            {/* --- Routes are restructured --- */}
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              {/* Story reading page - decide if public or protected */}
              {/* Let's assume public for now */}
              <Route path="/story/:id/play" element={<StoryReading />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}> {/* Wrap protected routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/create-story" element={<StoryCreator />} />
                <Route path="/stories" element={<StoryLibrary />} />
                <Route path="/voice-profiles" element={<VoiceProfiles />} />
                {/* Add other routes that require login here */}
              </Route>

              {/* Not Found Route (Keep last) */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
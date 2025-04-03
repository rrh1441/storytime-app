// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner"; // Ensure correct import if using Sonner
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar"; // Using relative path as in original
import Footer from "./components/layout/Footer"; // Using relative path as in original
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import StoryCreator from "./pages/StoryCreator";
import StoryLibrary from "./pages/StoryLibrary";
import StoryReading from "./pages/StoryReading";
import VoiceProfiles from "./pages/VoiceProfiles";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import PricingPage from "./pages/PricingPage"; // Import the new page

import ProtectedRoute from "@/components/ProtectedRoute"; // Use alias path

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner /> {/* Ensure you intend to use Sonner alongside the other Toaster */}
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* --- Public Routes --- */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/story/:id/play" element={<StoryReading />} />
              <Route path="/create-story" element={<StoryCreator />} />
              <Route path="/pricing" element={<PricingPage />} /> {/* Pricing Route */}

              {/* --- Protected Routes --- */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/stories" element={<StoryLibrary />} />
                <Route path="/voice-profiles" element={<VoiceProfiles />} />
                {/* Add other protected routes here */}
              </Route>

              {/* Not Found Route */}
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
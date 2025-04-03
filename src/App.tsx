// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react"; // <<<--- IMPORT ADDED

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import StoryCreator from "./pages/StoryCreator";
import StoryLibrary from "./pages/StoryLibrary";
import StoryReading from "./pages/StoryReading";
import VoiceProfiles from "./pages/VoiceProfiles";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import PricingPage from "./pages/PricingPage";

import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
              <Route path="/pricing" element={<PricingPage />} />

              {/* --- Protected Routes --- */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/stories" element={<StoryLibrary />} />
                <Route path="/voice-profiles" element={<VoiceProfiles />} />
              </Route>

              {/* Not Found Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <Analytics /> {/* <<<--- COMPONENT ADDED */}
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
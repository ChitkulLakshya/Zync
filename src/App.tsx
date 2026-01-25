import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import NewProject from "./pages/NewProject";
import ProjectDetails from "./pages/ProjectDetails";

import PrivacyPolicy from "./pages/PrivacyPolicy";
import { useActivityTracker } from "./hooks/use-activity-tracker";
import { useChatNotifications } from "./hooks/use-chat-notifications";
import { useUserSync } from "./hooks/use-user-sync";
import { WakeUpService } from "@/components/WakeUpService";
import { useTeamProtection } from "./hooks/use-team-protection";

const queryClient = new QueryClient();

const AppContent = () => {
  useActivityTracker(); // Apply activity tracking globally
  useChatNotifications(); // Apply chat notifications globally
  useUserSync(); // Sync user data (names) globally
  const location = useLocation();

  return (
    <>
      <WakeUpService />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/workspace" element={<Dashboard />} />
            <Route path="/dashboard/projects" element={<Dashboard />} />
            <Route path="/dashboard/calendar" element={<Dashboard />} />
            <Route path="/dashboard/design" element={<Dashboard />} />
            <Route path="/dashboard/tasks" element={<Dashboard />} />
            <Route path="/dashboard/notes" element={<Dashboard />} />
            <Route path="/dashboard/files" element={<Dashboard />} />
            <Route path="/dashboard/activity" element={<Dashboard />} />
            <Route path="/dashboard/people" element={<Dashboard />} />
            <Route path="/dashboard/meet" element={<Dashboard />} />
            <Route path="/dashboard/settings" element={<Dashboard />} />
            <Route path="/dashboard/chat" element={<Dashboard />} />
            <Route path="/dashboard/new-project" element={<Dashboard />} />
            <Route path="/new-project" element={<NewProject />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />

            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

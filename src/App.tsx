import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import NewProject from "./pages/NewProject";
import ProjectDetails from "./pages/ProjectDetails";
import Design from "./pages/Design";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import { useActivityTracker } from "./hooks/use-activity-tracker";
import { useChatNotifications } from "./hooks/use-chat-notifications";
import { useUserSync } from "./hooks/use-user-sync";

const queryClient = new QueryClient();

const AppContent = () => {
  useActivityTracker(); // Apply activity tracking globally
  useChatNotifications(); // Apply chat notifications globally
  useUserSync(); // Sync user data (names) globally
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/projects" element={<Dashboard />} />
      <Route path="/new-project" element={<NewProject />} />
      <Route path="/projects/:id" element={<ProjectDetails />} />
      <Route path="/design" element={<Design />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
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

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryPersister } from "./lib/query-persister";
import { queryClient } from "./lib/query-client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { lazy, Suspense } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewProject = lazy(() => import("./pages/NewProject"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const WelcomeToZync = lazy(() => import("./pages/WelcomeToZync"));
const IndexMobile = lazy(() => import("./mobile/pages/IndexMobile"));
const LoginMobile = lazy(() => import("./mobile/pages/LoginMobile"));
const SignupMobile = lazy(() => import("./mobile/pages/SignupMobile"));
const NotFoundMobile = lazy(() => import("./mobile/pages/NotFoundMobile"));
const DashboardMobile = lazy(() => import("./mobile/pages/DashboardMobile"));
const NewProjectMobile = lazy(() => import("./mobile/pages/NewProjectMobile"));
const ProjectDetailsMobile = lazy(() => import("./mobile/pages/ProjectDetailsMobile"));
const PrivacyPolicyMobile = lazy(() => import("./mobile/pages/PrivacyPolicyMobile"));
const PrivacyMobile = lazy(() => import("./mobile/pages/PrivacyMobile"));
const TermsMobile = lazy(() => import("./mobile/pages/TermsMobile"));
const WelcomeToZyncMobile = lazy(() => import("./mobile/pages/WelcomeToZyncMobile"));
import { useActivityTracker } from "./hooks/use-activity-tracker";
import { useChatNotifications } from "./hooks/use-chat-notifications";
import { useUserSync } from "./hooks/use-user-sync";
import { useSyncData } from "./hooks/useSyncData";
import { WakeUpService } from "@/components/WakeUpService";

const AppContent = () => {
  useActivityTracker();
  useChatNotifications();
  useUserSync();
  useSyncData();
  const location = useLocation();
  const isMobile = useIsMobile();


  const getPageKey = (pathname: string) => {
    if (pathname.startsWith('/dashboard')) {
      return 'dashboard-layout';
    }
    return pathname;
  };

  return (
    <>
      <WakeUpService />
<AnimatePresence mode="wait">
        <motion.div
          key={getPageKey(location.pathname)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full w-full"
        >
          <Suspense fallback={<div className="min-h-screen w-full bg-background" />}>
            <Routes location={location}>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={isMobile ? <LoginMobile /> : <Login />} />
              <Route path="/signup" element={isMobile ? <SignupMobile /> : <Signup />} />
              <Route path="/welcome" element={isMobile ? <WelcomeToZyncMobile /> : <WelcomeToZync />} />
              <Route path="/dashboard" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/workspace" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/workspace/project/:id" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/projects" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/calendar" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/design" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/tasks" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/notes" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/files" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/activity" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/people" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/meet" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/settings" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/chat" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/dashboard/new-project" element={isMobile ? <DashboardMobile /> : <Dashboard />} />
              <Route path="/new-project" element={isMobile ? <NewProjectMobile /> : <NewProject />} />
              <Route path="/projects/:id" element={isMobile ? <ProjectDetailsMobile /> : <ProjectDetails />} />

              <Route path="/privacy-policy" element={isMobile ? <PrivacyPolicyMobile /> : <PrivacyPolicy />} />
              <Route path="/privacy" element={isMobile ? <PrivacyMobile /> : <Privacy />} />
              <Route path="/terms" element={isMobile ? <TermsMobile /> : <Terms />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={isMobile ? <NotFoundMobile /> : <NotFound />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister: queryPersister,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    }}
  >
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

export default App;

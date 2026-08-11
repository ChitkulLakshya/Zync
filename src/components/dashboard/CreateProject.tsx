/**
 * @fileoverview CreateProject.tsx
 * @module CreateProject
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license AGPL-3.0-only
 * ============================================================================
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CreateProjectProps {
  onProjectCreated: (projectData: any) => void;
}

const CreateProject = ({ onProjectCreated }: CreateProjectProps) => {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    if (!projectName || !projectDescription) {return;}

    setIsGenerating(true);

    const user = auth.currentUser;
    const ownerId = user ? user.uid : "anonymous";
    let token = "";
    let interval: ReturnType<typeof setInterval> | null = null;
    
    try {
      token = user ? await user.getIdToken() : "";
      if (!token) {
        toast({ 
          title: "Authentication Error", 
          description: "Failed to authenticate. Please ensure you're logged in and try again.", 
          variant: "destructive" 
        });
        setIsGenerating(false);
        return;
      }
    } catch (tokenErr) {
      console.error("Failed to get token:", tokenErr);
      toast({ 
        title: "Authentication Error", 
        description: "Failed to authenticate. Please ensure you're logged in and try again.", 
        variant: "destructive" 
      });
      setIsGenerating(false);
      return;
    }

    // Trigger persistent dynamic progress toast
    const toastController = toast({
      title: "Creating Project",
      description: (
        <div className="w-full mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-xs font-medium text-foreground">Initializing GitHub repository...</div>
            </div>
            <div className="text-xs font-semibold text-primary">10%</div>
          </div>
          <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out relative" 
              style={{ width: '10%' }} 
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      ),
      duration: 120000, // 2 minutes timeout
    });

    let progress = 10;
    interval = setInterval(() => {
      if (progress < 95) {
        progress += Math.floor(Math.random() * 8) + 4; // increment between 4% and 11%
        if (progress > 95) {progress = 95;}

        let statusText = "Initializing GitHub repository...";
        if (progress > 80) {
          statusText = "Finalizing commit changes...";
        } else if (progress > 60) {
          statusText = "Writing project configuration & documentation...";
        } else if (progress > 40) {
          statusText = "Analyzing architecture plan using Kilo Code Gateway...";
        } else if (progress > 25) {
          statusText = "Provisioning codebase structure...";
        }

        toastController.update({
          id: toastController.id,
          title: "Creating Project",
          description: (
            <div className="w-full mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-xs font-medium text-foreground">{statusText}</div>
                </div>
                <div className="text-xs font-semibold text-primary">{progress}%</div>
              </div>
              <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out relative" 
                  style={{ width: `${progress}%` }} 
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
          ),
          duration: 120000,
        });
      }
    }, 800);

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          ownerId,
        }),
      });

      if (interval) {
        clearInterval(interval);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate project");
      }

      const data = await response.json();

      // Show success toast with optional warning
      const hasWarning = data.warning;
      toastController.update({
        id: toastController.id,
        title: "Project Created Successfully!",
        description: (
          <div className="w-full mt-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="text-xs font-medium text-green-600 dark:text-green-400">Your new project and GitHub repository are ready.</div>
                {hasWarning && (
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 font-medium">
                    ⚠️ {data.warning}
                  </div>
                )}
              </div>
              <div className="text-green-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="h-2 w-full bg-green-500/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500/80 to-green-500 transition-all duration-700 ease-out relative" 
                style={{ width: '100%' }} 
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        ),
        duration: hasWarning ? 8000 : 4000,
      });

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      sessionStorage.setItem('newlyCreatedProjectId', data._id || data.id);
      setIsGenerating(false);
      
      // Redirect to workspace after successful project creation
      onProjectCreated(null);
    } catch (error: any) {
      if (interval) {
        clearInterval(interval);
      }
      console.error("Generation error:", error);
      toastController.update({
        id: toastController.id,
        title: "Generation Failed",
        description: (
          <div className="w-full mt-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="text-xs font-medium text-destructive">
                  {error.message || "Something went wrong. Please try again."}
                </div>
              </div>
              <div className="text-destructive">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div className="h-2 w-full bg-destructive/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-destructive/80 to-destructive transition-all duration-700 ease-out relative" 
                style={{ width: '100%' }} 
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        ),
        variant: "destructive",
        duration: 6000,
      });
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Zync</h1>
          <p className="text-muted-foreground text-lg">
            Let's turn your idea into a fully planned software project.
          </p>
        </div>

        <Card className="bg-secondary/5 border-border/10 shadow-2xl rounded-[2rem] overflow-hidden">
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>
              Describe your project, and our AI will generate the architecture and tasks for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Project Name
              </label>
              <Input
                placeholder="e.g., E-commerce Platform"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-secondary/30 border-0 focus-visible:ring-1 focus-visible:ring-border rounded-xl h-12 px-4"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                What are you building?
              </label>
              <Textarea
                placeholder="Describe your project features, goals, and requirements..."
                className="min-h-[150px] resize-none bg-secondary/30 border-0 focus-visible:ring-1 focus-visible:ring-border rounded-xl p-4"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!projectName || !projectDescription || isGenerating}
              className="w-full sm:w-auto rounded-xl"
            >
              {isGenerating ? "Generating..." : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Project
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>


      </div>
    </div>
  );
};

export default CreateProject;

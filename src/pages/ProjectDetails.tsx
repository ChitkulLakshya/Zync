/**
 * @fileoverview ProjectDetails.tsx
 * @module ProjectDetails
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
 * @license Proprietary and Confidential
 * ============================================================================
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Circle, Server, Layout, Database, Share2, Plus, GripVertical, GitCommit, ExternalLink, Kanban, Trash2, Bot, MoreVertical, Settings, MessageSquare, Wrench, FolderKanban } from 'lucide-react';
import { Github } from '@/components/ui/GithubIcon';;
import { API_BASE_URL, SOCKET_BASE_URL, getFullUrl } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { sendMessage as socketSendMessage } from "@/services/chatSocketService";
import { useTaskUpdates } from "@/hooks/use-task-updates";
import KanbanBoard from "@/components/workspace/KanbanBoard";
import { ActivityGraph } from "@/components/views/ActivityGraph";
import { io } from "socket.io-client";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Project {
  id: string;
  name: string;
  description: string;
  ownerUid?: string;
  architecture: {
    highLevel: string;
    frontend: {
      structure: string;
      pages: string[];
      components: string[];
      routing: string;
    };
    backend: {
      structure: string;
      apis: string[];
      controllers: string[];
      services: string[];
      authFlow: string;
    };
    database: {
      design: string;
      collections: string[];
      relationships: string;
    };
    apiFlow: string;
    integrations: string[];
  };
  steps: Step[];
  ownerId: string;
  githubRepoName?: string;
  githubRepoOwner?: string;
}

interface Task {
  _id: string;
  id: string;
  title: string;
  description: string;
  status: "Pending" | "In Progress" | "Active" | "Completed";
  assignedTo?: string;
  assignedToName?: string;
  commitInfo?: {
    message: string;
    url: string;
    author: string;
    timestamp: string;
  };
  createdBy?: string;
}

interface Step {
  _id: string;
  id: string;
  title: string;
  description: string;
  status: "Pending" | "In Progress" | "Completed";
  type: string;
  page: string;
  assignedTo?: string;
  tasks: Task[];
}


const MOCK_USERS = [
  { uid: "admin1", name: "Admin User", email: "admin@zync.com" },
  { uid: "dev1", name: "Frontend Dev", email: "frontend@zync.com" },
  { uid: "dev2", name: "Backend Dev", email: "backend@zync.com" },
  { uid: auth.currentUser?.uid || "current", name: auth.currentUser?.displayName || "You", email: auth.currentUser?.email },
].filter((v, i, a) => a.findIndex(t => (t.uid === v.uid)) === i);

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = (location.state as { from?: string } | null)?.from || "/dashboard/workspace";
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);


  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<{ stepId: string, task: Task } | null>(null);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);


  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [selectedStepId, setSelectedStepId] = useState<string>("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);


  // What: State to track if an architecture analysis is currently running.
  // Why: Disables the "Analyze Architecture" button to prevent redundant requests and displays a loading state.
  const [isAnalyzing, setIsAnalyzing] = useState(false);


  // What: Async function to request an AI-driven architecture analysis for the project.
  // Why: Allows the user to dynamically generate or update the project's technical architecture based on its current state.
  const handleAnalyzeArchitecture = async () => {
    // What: Guard clause ensuring both a project and an authenticated user exist.
    // Why: Prevents execution if the required context is missing, avoiding runtime errors.
    if (!project || !auth.currentUser) {return;}
    
    // What: Sets the analyzing state to true.
    // Why: Triggers the loading UI in the component.
    setIsAnalyzing(true);
    try {
      // What: Retrieves the current user's Firebase ID token.
      // Why: Needed to authenticate the API request on the backend.
      const token = await auth.currentUser.getIdToken();
      
      // What: Sends a POST request to the analyze-architecture endpoint.
      // Why: Instructs the backend to perform the heavy lifting of analyzing the project.
      const response = await fetch(`${API_BASE_URL}/api/projects/${project.id}/analyze-architecture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // What: Checks if the response status is not OK (e.g., 400 or 500).
      // Why: Throws an error to be caught by the catch block below if the server request failed.
      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      // What: Parses the JSON response to get the updated project data.
      // Why: We need the newly analyzed architecture to display in the UI.
      const updatedProject = await response.json();
      
      // What: Updates the local project state.
      // Why: Causes the component to re-render with the new architecture details.
      setProject(updatedProject);
      
      // What: Shows a success toast notification.
      // Why: Provides positive feedback to the user that the analysis succeeded.
      toast.success("Architecture analysis complete!");
    } catch (error) {
      // What: Logs the error to the console and shows an error toast.
      // Why: Helps developers debug and informs the user that something went wrong.
      console.error("Analysis Error:", error);
      toast.error("Failed to analyze architecture. Please try again.");
    } finally {
      // What: Resets the analyzing state to false, regardless of success or failure.
      // Why: Ensures the UI returns to an interactive state after the operation finishes.
      setIsAnalyzing(false);
    }
  };


  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedShareUser, setSelectedShareUser] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShareProject = async () => {
    if (!selectedShareUser || !project || !auth.currentUser) {return;}
    setIsSharing(true);
    try {
      const receiver = users.find(u => u.uid === selectedShareUser);
      if (!receiver) {throw new Error("User not found");}

      const chatId = [auth.currentUser.uid, receiver.uid].sort().join("_");
      socketSendMessage({
        chatId,
        receiverId: receiver.uid,
        senderName: auth.currentUser.displayName || "Unknown",
        senderPhotoURL: auth.currentUser.photoURL || undefined,
        text: `Start collaborating on project "${project.name}"`,
        type: 'project-invite',
        projectId: project.id,
        projectName: project.name,
        projectOwnerId: project.ownerId,
      });

      setIsShareDialogOpen(false);
      toast.success(`Invite sent to ${receiver.displayName}`);


      const event = new CustomEvent('ZYNC-open-chat', { detail: receiver });
      window.dispatchEvent(event);

    } catch (error) {
      console.error("Share failed", error);
      toast.error("Failed to share project");
    } finally {
      setIsSharing(false);
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchUsers = async () => {
    try {
      if (!currentUser) {return;}
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchProject = async () => {
    try {


      const options: any = {};
      if (currentUser) {
        const token = await currentUser.getIdToken();
        options.headers = { Authorization: `Bearer ${token}` };
      }
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, options);
      if (!response.ok) {throw new Error("Project not found");}
      const data = await response.json();
      setProject(data);


      if (data.githubRepoName && data.githubRepoOwner && currentUser) {
        const token = await currentUser.getIdToken();
        try {
          const readmeRes = await fetch(`${API_BASE_URL}/api/github/readme?owner=${data.githubRepoOwner}&repo=${data.githubRepoName}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (readmeRes.ok) {
            const text = await readmeRes.text();
            setReadmeContent(text);
          }
        } catch (err) {
          console.error("Failed to fetch README", err);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && currentUser) {
      fetchProject();
      fetchUsers();
    }
  }, [id, currentUser]);

  useEffect(() => {

    const socket = io(SOCKET_BASE_URL || API_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('taskUpdated', (data) => {
      console.log('Task Updated Event:', data);
      toast.success(`Task ${data.taskId} completed via commit!`);

      setProject((prevProject) => {
        if (!prevProject) {return null;}

        const newSteps = prevProject.steps.map(step => {
          const newTasks = step.tasks.map(task => {
            if (task.id === data.taskId || task._id === data.taskId) {
              return {
                ...task,
                status: data.status
              } as Task;
            }
            return task;
          });
          return { ...step, tasks: newTasks };
        });

        return { ...prevProject, steps: newSteps };
      });
    });


    socket.on('projectUpdate', (data: any) => {

      if (data.projectId && (data.projectId === id)) {
        console.log("Received live project update");
        setProject(data.project);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);


  const fetchProjectRef = useRef(fetchProject);
  fetchProjectRef.current = fetchProject;

  useTaskUpdates({
    userId: currentUser?.uid,
    projectIds: id ? [id] : [],
    onTaskChange: useCallback((_event: 'created' | 'updated' | 'deleted' | 'assigned') => {

      fetchProjectRef.current();
    }, []),
  });

  const handleTaskUpdate = async (stepId: string, taskId: string, updates: any) => {
    console.log("handleTaskUpdate called with:", { stepId, taskId, updates });
    if (!project) {
      console.error("Project not loaded in handleTaskUpdate");
      return;
    }


    const stepIndex = project.steps.findIndex(s => s._id === stepId || s.id === stepId);
    if (stepIndex === -1) {return;}

    const taskIndex = project.steps[stepIndex].tasks.findIndex(t => t._id === taskId || t.id === taskId);
    if (taskIndex === -1) {return;}


    const newSteps = [...project.steps];
    const newStep = { ...newSteps[stepIndex] };
    const newTasks = [...newStep.tasks];


    const updatedTask = { ...newTasks[taskIndex], ...updates };
    newTasks[taskIndex] = updatedTask;
    newStep.tasks = newTasks;
    newSteps[stepIndex] = newStep;

    setProject({ ...project, steps: newSteps });

    try {
      const step = project.steps[stepIndex];
      const realStepId = step._id || step.id;
      const realTaskId = step.tasks[taskIndex]._id || step.tasks[taskIndex].id;

      if (!realStepId || !realTaskId) {return;}

      await fetch(`${API_BASE_URL}/api/projects/${project.id}/steps/${realStepId}/tasks/${realTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          assignedBy: auth.currentUser?.displayName || 'Admin'
        })
      });
    } catch (error) {
      console.error("Failed to update task", error);
      fetchProject();
      toast.error("Failed to update task");
    }
  };


  const handleDeleteTask = async (stepId: string, taskId: string) => {
    if (!project) {return;}


    const newSteps = project.steps.map(step => {
      if (step._id === stepId || step.id === stepId) {
        return {
          ...step,
          tasks: step.tasks.filter(t => t._id !== taskId && t.id !== taskId)
        };
      }
      return step;
    });

    setProject({ ...project, steps: newSteps });

    try {
      const step = project.steps.find(s => s._id === stepId || s.id === stepId);
      if (!step) {return;}

      const realStepId = step._id;


      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${project.id}/steps/${realStepId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {throw new Error("Failed to delete");}
      toast.success("Task deleted");
    } catch (error) {
      console.error("Delete failed", error);
      toast.error("Failed to delete task");
      fetchProject();
    }
  };

  const openAssignmentDialog = (stepId: string, task: Task) => {
    setSelectedTaskForAssignment({ stepId, task });
    setSelectedUserId(task.assignedTo || null);
    setIsAssignmentDialogOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedTaskForAssignment || !project) {return;}
    setIsSubmittingAssignment(true);

    const { stepId, task } = selectedTaskForAssignment;
    const assignedUser = users.find(u => u.uid === selectedUserId);
    const assignedToName = assignedUser ? (assignedUser.displayName || assignedUser.email) : undefined;

    await handleTaskUpdate(stepId, task._id || task.id, {
      assignedTo: selectedUserId,
      assignedToName: assignedToName
    });

    setIsSubmittingAssignment(false);
    setIsAssignmentDialogOpen(false);
    toast.success(selectedUserId ? `Assigned to ${assignedToName}` : "Task Unassigned");
  };

  const handleCreateTask = async () => {
    if (!project || !newTaskTitle || !selectedStepId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreatingTask(true);
    try {
      const assignedUser = users.find(u => u.uid === selectedAssigneeId);
      const assignedToName = assignedUser ? (assignedUser.displayName || assignedUser.email) : undefined;

      const response = await fetch(`${API_BASE_URL}/api/projects/${project.id}/steps/${selectedStepId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription,
          assignedTo: selectedAssigneeId,
          assignedToName: assignedToName,
          assignedBy: auth.currentUser?.displayName || 'Admin'
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      const updatedProject = await response.json();
      setProject(updatedProject);
      toast.success("Task created successfully");
      setIsCreateTaskDialogOpen(false);


      setNewTaskTitle("");
      setNewTaskDescription("");
      setSelectedStepId("");
      setSelectedAssigneeId(null);
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setIsCreatingTask(false);
    }
  };


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading project details…</div>;
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="bg-red-500/10 p-4 rounded-full w-fit mx-auto">
            <FolderKanban className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Project Not Found</h1>
          <p className="text-muted-foreground">
            The project you are looking for does not exist or has been deleted.
          </p>
          <Button onClick={() => navigate(backPath)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = (project.ownerUid || project.ownerId) === auth.currentUser?.uid;
  const isGitHubProject = !!(project.githubRepoName && project.githubRepoOwner);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {}
      <header className="border-b border-border/10 bg-card/50 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">Project Architecture & Plan</p>
          </div>
          <div className="ml-auto flex gap-2">
            {isOwner && (
              <Button variant="outline" size="sm" onClick={() => setIsShareDialogOpen(true)}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <Tabs defaultValue="architecture" className="flex flex-col">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 mb-6">
            <TabsTrigger value="architecture" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-6 pb-2">
              Architecture
            </TabsTrigger>
            {!isGitHubProject && (
              <TabsTrigger value="steps" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-6 pb-2">
                Development Steps
              </TabsTrigger>
            )}
            <TabsTrigger value="board" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-6 pb-2">
              Task Board
            </TabsTrigger>
          </TabsList>

          <TabsContent value="architecture" className="flex-1 space-y-6">
            {}
            {readmeContent && (
              <Card>
                <CardHeader>
                  <CardTitle>Project README</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                    <div className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {readmeContent}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {}
            {isGitHubProject && !project.architecture?.highLevel && (
              <Card>
                <CardHeader>
                  <CardTitle>Architecture Analysis</CardTitle>
                  <CardDescription>Generate a comprehensive architecture breakdown using AI.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleAnalyzeArchitecture}
                    disabled={isAnalyzing}
                    className="w-full sm:w-auto"
                  >
                    {isAnalyzing ? "Analyzing..." : (
                      <>
                        <Server className="mr-2 h-4 w-4" />
                        Generate Architecture with AI
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {}
            {(project.architecture?.highLevel || (!isGitHubProject)) && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {}
                <Card className="col-span-full">
                  <CardHeader>
                    <CardTitle>High-Level Architecture</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{project.architecture?.highLevel || "No high-level architecture generated."}</p>
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">API Flow</h4>
                      <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md">
                        {project.architecture?.apiFlow || "N/A"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {}
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2">
                    <Layout className="h-5 w-5 text-blue-500" />
                    <CardTitle>Frontend</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Structure</h4>
                      <p className="text-xs text-muted-foreground">{project.architecture?.frontend?.structure || "N/A"}</p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Pages</h4>
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        {(project.architecture?.frontend?.pages || []).map((page, i) => (
                          <li key={i}>{page}</li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Components</h4>
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        {(project.architecture?.frontend?.components || []).map((comp, i) => (
                          <li key={i}>{comp}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {}
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2">
                    <Server className="h-5 w-5 text-green-500" />
                    <CardTitle>Backend</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Structure</h4>
                      <p className="text-xs text-muted-foreground">{project.architecture?.backend?.structure || "N/A"}</p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-1">APIs</h4>
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        {(project.architecture?.backend?.apis || []).map((api, i) => (
                          <li key={i}>{api}</li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Services</h4>
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        {(project.architecture?.backend?.services || []).map((svc, i) => (
                          <li key={i}>{svc}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {}
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2">
                    <Database className="h-5 w-5 text-orange-500" />
                    <CardTitle>Database</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Design</h4>
                      <p className="text-xs text-muted-foreground">{project.architecture?.database?.design || "N/A"}</p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Collections</h4>
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        {(project.architecture?.database?.collections || []).map((col, i) => (
                          <li key={i}>{col}</li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Relationships</h4>
                      <p className="text-xs text-muted-foreground">{project.architecture?.database?.relationships || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="board" className="flex-1 p-4">
            <KanbanBoard
              steps={project.steps}
              onUpdateTask={handleTaskUpdate}
              users={users}
              currentUser={auth.currentUser}
              isOwner={isOwner}
              readOnly={true}
              onDeleteTask={handleDeleteTask}
            />
          </TabsContent>

          {!isGitHubProject && (
            <TabsContent value="steps" className="flex-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Development Plan</CardTitle>
                  <CardDescription>Step-by-step implementation guide</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {project.steps.map((step, index) => (
                      <div key={step.id || index} className="border border-border/10 rounded-lg p-4 bg-card/50 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-background">{index + 1}</Badge>
                            <h3 className="font-semibold">{step.title}</h3>
                          </div>
                          <Badge variant="secondary">{step.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

                        <div className="space-y-3 pl-4 border-l-2 border-muted ml-2">
                          {step.tasks && step.tasks.map((task) => (
                            <div key={task.id || task._id} className="flex items-start gap-3 group">
                              <Checkbox
                                id={task.id}
                                checked={task.status === "Completed"}
                                onCheckedChange={(checked) => handleTaskUpdate(step._id, task._id, { status: checked ? "Completed" : "Pending" })}
                                disabled={!isAdmin && task.assignedTo !== auth.currentUser?.uid}
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <label
                                    htmlFor={task.id}
                                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${task.status === "Completed" ? "line-through text-muted-foreground" : ""}`}
                                  >
                                    {task.title}
                                  </label>
                                </div>
                                <p className="text-xs text-muted-foreground">{task.description}</p>

                                {task.commitInfo && (
                                  <div className="mt-2 text-xs bg-muted/50 p-2 rounded border border-border/50 flex items-center gap-2">
                                    <GitCommit className="w-3 h-3 text-foreground" />
                                    <span className="font-mono text-foreground truncate max-w-[200px]">{task.commitInfo.message}</span>
                                    <span className="text-muted-foreground">- {task.commitInfo.author}</span>
                                    {task.commitInfo.url && (
                                      <a href={task.commitInfo.url} target="_blank" rel="noopener noreferrer" className="ml-auto hover:text-foreground">
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-4 mt-2">
                                  {}
                                  {isOwner ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs border border-dashed gap-2"
                                      onClick={() => openAssignmentDialog(step._id, task)}
                                    >
                                      {task.assignedTo ? (
                                        <>
                                          <div className="w-4 h-4 rounded-full overflow-hidden bg-secondary">
                                            {(() => {
                                              const assignedUser = users.find(u => u.uid === task.assignedTo);
                                              return assignedUser ? (
                                                <img src={getFullUrl(assignedUser.photoURL)} className="w-full h-full object-cover" />
                                              ) : (
                                                <div className="w-full h-full bg-foreground/20" />
                                              )
                                            })()}
                                          </div>
                                          <span>{task.assignedToName || users.find(u => u.uid === task.assignedTo)?.displayName || 'Unknown'}</span>
                                        </>
                                      ) : (
                                        <><span>Assign</span></>
                                      )}
                                    </Button>
                                  ) : (
                                    <div className="flex items-center gap-2 px-2 h-7 text-xs border border-transparent">
                                      {task.assignedTo ? (
                                        <>
                                          <div className="w-4 h-4 rounded-full overflow-hidden bg-secondary">
                                            {(() => {
                                              const assignedUser = users.find(u => u.uid === task.assignedTo);
                                              return assignedUser ? (
                                                <img src={getFullUrl(assignedUser.photoURL)} className="w-full h-full object-cover" />
                                              ) : (
                                                <div className="w-full h-full bg-foreground/20" />
                                              )
                                            })()}
                                          </div>
                                          <span className="text-muted-foreground">{task.assignedToName || users.find(u => u.uid === task.assignedTo)?.displayName || 'Unknown'}</span>
                                        </>
                                      ) : (
                                        <span className="text-muted-foreground italic">Unassigned</span>
                                      )}
                                    </div>
                                  )}

                                  {}
                                  <Select
                                    value={task.status}
                                    onValueChange={(val) => handleTaskUpdate(step._id, task._id, { status: val })}
                                  >
                                    <SelectTrigger className={`w-[110px] h-7 text-xs border-0 ${task.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      task.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground'
                                      }`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Pending">Pending</SelectItem>
                                      <SelectItem value="In Progress">In Progress</SelectItem>
                                      <SelectItem value="Completed">Completed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!step.tasks || step.tasks.length === 0) && (
                            <div className="text-sm text-muted-foreground italic">No specific tasks generated for this step.</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

        </Tabs>
      </main>

      {/* Assignment Dialog */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>
              Select a team member to assign "<strong>{selectedTaskForAssignment?.task.title}</strong>" to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            <div className="space-y-2">
              <div
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedUserId === null ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}
                onClick={() => setSelectedUserId(null)}
              >
                <Checkbox
                  checked={selectedUserId === null}
                  onCheckedChange={() => setSelectedUserId(null)}
                  id="unassign"
                />
                <div className="flex-1">
                  <label htmlFor="unassign" className="text-sm font-medium leading-none cursor-pointer">
                    Unassigned
                  </label>
                </div>
              </div>

              {users.map((user) => (
                <div
                  key={user.uid}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedUserId === user.uid ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}
                  onClick={() => setSelectedUserId(user.uid)}
                >
                  <Checkbox
                    checked={selectedUserId === user.uid}
                    onCheckedChange={() => setSelectedUserId(user.uid)}
                    id={user.uid}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getFullUrl(user.photoURL)} />
                    <AvatarFallback>{user.displayName?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <label htmlFor={user.uid} className="text-sm font-medium leading-none cursor-pointer">
                      {user.displayName || user.email}
                    </label>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(false)} disabled={isSubmittingAssignment}>
              Cancel
            </Button>
            <Button onClick={handleAssignSubmit} disabled={isSubmittingAssignment}>
              {isSubmittingAssignment ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to your project plan and assign it to a team member.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">Task Title *</label>
              <input
                id="title"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g., Implement Authentication"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Details about the task..."
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Project Step *</label>
                <Select value={selectedStepId} onValueChange={setSelectedStepId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Step" />
                  </SelectTrigger>
                  <SelectContent>
                    {project.steps.map((step) => (
                      <SelectItem key={step._id || step.id} value={step._id || step.id}>
                        {step.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Assign To</label>
                <Select value={selectedAssigneeId || "unassigned"} onValueChange={(val) => setSelectedAssigneeId(val === "unassigned" ? null : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.uid} value={user.uid}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={getFullUrl(user.photoURL)} />
                            <AvatarFallback>{user.displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{user.displayName || user.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)} disabled={isCreatingTask}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={isCreatingTask || !newTaskTitle || !selectedStepId}>
              {isCreatingTask ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Project</DialogTitle>
            <DialogDescription>
              Select a user to invite to <strong>{project.name}</strong>. They will receive an invite in their chat.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            <div className="space-y-2">
              {users.filter(u => u.uid !== auth.currentUser?.uid).map((user) => (
                <div
                  key={user.uid}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedShareUser === user.uid ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}
                  onClick={() => setSelectedShareUser(user.uid)}
                >
                  <Checkbox
                    checked={selectedShareUser === user.uid}
                    onCheckedChange={() => setSelectedShareUser(user.uid)}
                    id={`share-${user.uid}`}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getFullUrl(user.photoURL)} />
                    <AvatarFallback>{user.displayName?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <label htmlFor={`share-${user.uid}`} className="text-sm font-medium leading-none cursor-pointer">
                      {user.displayName || user.email}
                    </label>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)} disabled={isSharing}>
              Cancel
            </Button>
            <Button onClick={handleShareProject} disabled={isSharing || !selectedShareUser}>
              {isSharing ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ProjectDetails;

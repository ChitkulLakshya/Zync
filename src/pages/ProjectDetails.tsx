import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle2, Circle, Server, Layout, Database, Share2, Plus, GripVertical, GitCommit, ExternalLink, Kanban, Trash2, Github, Bot, MoreVertical, Settings, MessageSquare, Wrench } from "lucide-react";
import { API_BASE_URL, getFullUrl } from "@/lib/utils";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
  _id: string;
  name: string;
  description: string;
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

// Mock users for assignment - In real app, fetch from API
const MOCK_USERS = [
  { uid: "admin1", name: "Admin User", email: "admin@ZYNC.com" },
  { uid: "dev1", name: "Frontend Dev", email: "frontend@ZYNC.com" },
  { uid: "dev2", name: "Backend Dev", email: "backend@ZYNC.com" },
  { uid: auth.currentUser?.uid || "current", name: auth.currentUser?.displayName || "You", email: auth.currentUser?.email },
].filter((v, i, a) => a.findIndex(t => (t.uid === v.uid)) === i);

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);

  // Assignment State
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<{ stepId: string, task: Task } | null>(null);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  // Task Creation State
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [selectedStepId, setSelectedStepId] = useState<string>("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // New state for analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Handle Architecture Analysis
  const handleAnalyzeArchitecture = async () => {
    if (!project) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${project._id}/analyze-architecture`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const updatedProject = await response.json();
      setProject(updatedProject);
      toast.success("Architecture analysis complete!");
    } catch (error) {
      console.error("Analysis Error:", error);
      toast.error("Failed to analyze architecture. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Share State
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedShareUser, setSelectedShareUser] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShareProject = async () => {
    if (!selectedShareUser || !project || !auth.currentUser) return;
    setIsSharing(true);
    try {
      const receiver = users.find(u => u.uid === selectedShareUser);
      if (!receiver) throw new Error("User not found");

      const chatId = [auth.currentUser.uid, receiver.uid].sort().join("_");
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || "Unknown",
        receiverId: receiver.uid,
        text: `Start collaborating on project "${project.name}"`,
        type: 'project-invite',
        projectId: project._id,
        projectName: project.name,
        projectOwnerId: project.ownerId,
        timestamp: serverTimestamp(),
        seen: false,
        delivered: false
      });

      setIsShareDialogOpen(false);
      toast.success(`Invite sent to ${receiver.displayName}`);

      // Redirect to Chat
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
      if (!currentUser) return;
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
      // Project might be public or require auth, assuming public for now or headerless ok? 
      // If projects are protected too, we need token here too.
      // Assuming public for read now as per previous code, but good to add token if user exists
      const options: any = {};
      if (currentUser) {
        const token = await currentUser.getIdToken();
        options.headers = { Authorization: `Bearer ${token}` };
      }
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, options);
      if (!response.ok) throw new Error("Project not found");
      const data = await response.json();
      setProject(data);

      // Fetch README if it's a GitHub project
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
    // Connect to Socket.io
    const socket = io(API_BASE_URL);

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('taskUpdated', (data) => {
      console.log('Task Updated Event:', data);
      toast.success(`Task ${data.taskId} completed via commit!`);

      setProject((prevProject) => {
        if (!prevProject) return null;

        const newSteps = prevProject.steps.map(step => {
          const newTasks = step.tasks.map(task => {
            // Check against both id (display ID) and _id (database ID)
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

    // Listen for full project updates (e.g. from task moves/edits elsewhere)
    socket.on('projectUpdate', (data: any) => {
      if (data.projectId && (data.projectId === id || (project && data.projectId === project._id))) {
        console.log("Received live project update");
        setProject(data.project);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [project, id]); // Re-bind if project/id changes to ensure correct ID check

  const handleTaskUpdate = async (stepId: string, taskId: string, updates: any) => {
    console.log("handleTaskUpdate called with:", { stepId, taskId, updates });
    if (!project) {
      console.error("Project not loaded in handleTaskUpdate");
      return;
    }

    // Find indices first
    const stepIndex = project.steps.findIndex(s => s._id === stepId || s.id === stepId);
    if (stepIndex === -1) return;

    const taskIndex = project.steps[stepIndex].tasks.findIndex(t => t._id === taskId || t.id === taskId);
    if (taskIndex === -1) return;

    // Create deep copy for immutability to trigger re-renders
    const newSteps = [...project.steps];
    const newStep = { ...newSteps[stepIndex] };
    const newTasks = [...newStep.tasks];

    // Optimistic Update
    const updatedTask = { ...newTasks[taskIndex], ...updates };
    newTasks[taskIndex] = updatedTask;
    newStep.tasks = newTasks;
    newSteps[stepIndex] = newStep;

    setProject({ ...project, steps: newSteps });

    try {
      const step = project.steps[stepIndex];
      const realStepId = step._id;
      const realTaskId = step.tasks[taskIndex]._id;

      if (!realStepId || !realTaskId) return;

      await fetch(`${API_BASE_URL}/api/projects/${project._id}/steps/${realStepId}/tasks/${realTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          assignedBy: auth.currentUser?.displayName || 'Admin'
        })
      });
    } catch (error) {
      console.error("Failed to update task", error);
      fetchProject(); // Revert on failure by refetching
      toast.error("Failed to update task");
    }
  };



  const handleDeleteTask = async (stepId: string, taskId: string) => {
    if (!project) return;

    // Optimistic UI Update
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
      if (!step) return;
      // Need real IDs for API
      const realStepId = step._id;
      // We can use the passed taskId if we assume it's the real one, but safer to have the real one
      // The passed taskId should be the real _id from the UI interaction

      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${project._id}/steps/${realStepId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Task deleted");
    } catch (error) {
      console.error("Delete failed", error);
      toast.error("Failed to delete task");
      fetchProject(); // Revert
    }
  };

  const openAssignmentDialog = (stepId: string, task: Task) => {
    setSelectedTaskForAssignment({ stepId, task });
    setSelectedUserId(task.assignedTo || null);
    setIsAssignmentDialogOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedTaskForAssignment || !project) return;
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

      const response = await fetch(`${API_BASE_URL}/api/projects/${project._id}/steps/${selectedStepId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if needed, assuming generic public/internal for now based on existing fetchProject
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

      // Reset form
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
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const isOwner = project.ownerId === auth.currentUser?.uid;
  const isGitHubProject = !!(project.githubRepoName && project.githubRepoOwner);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
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
            <TabsTrigger value="architecture" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 pb-2">
              Architecture
            </TabsTrigger>
            {!isGitHubProject && (
              <TabsTrigger value="steps" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 pb-2">
                Development Steps
              </TabsTrigger>
            )}
            <TabsTrigger value="board" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 pb-2">
              Task Board
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="team" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 pb-2">
                Team & Assignments
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="architecture" className="flex-1 space-y-6">
            {/* README Section */}
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

            {/* Architecture Generation Button */}
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
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Repository...
                      </>
                    ) : (
                      <>
                        <Server className="mr-2 h-4 w-4" />
                        Generate Architecture with AI
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Architecture Cards (Only show if generated) */}
            {(project.architecture?.highLevel || (!isGitHubProject)) && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* High Level */}
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

                {/* Frontend */}
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

                {/* Backend */}
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

                {/* Database */}
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
                      <div key={step.id || index} className="border rounded-lg p-4 bg-card/50">
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
                                    <GitCommit className="w-3 h-3 text-primary" />
                                    <span className="font-mono text-primary truncate max-w-[200px]">{task.commitInfo.message}</span>
                                    <span className="text-muted-foreground">- {task.commitInfo.author}</span>
                                    {task.commitInfo.url && (
                                      <a href={task.commitInfo.url} target="_blank" rel="noopener noreferrer" className="ml-auto hover:text-primary">
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-4 mt-2">
                                  {/* Assignment using Dialog */}
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
                                                <div className="w-full h-full bg-primary/20" />
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
                                                <div className="w-full h-full bg-primary/20" />
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

                                  {/* Status Dropdown */}
                                  <Select
                                    value={task.status}
                                    onValueChange={(val) => handleTaskUpdate(step._id, task._id, { status: val })}
                                  >
                                    <SelectTrigger className={`w-[110px] h-7 text-xs border-0 ${task.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                                      task.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'
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

          {isOwner && (
            <TabsContent value="team" className="flex-1">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Team Assignments</CardTitle>
                    <CardDescription>Manage task assignments for {project.name}</CardDescription>
                  </div>
                  <Button onClick={() => setIsCreateTaskDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Task
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ActivityGraph
                    tasks={project.steps.flatMap(s => s.tasks || [])}
                    users={users}
                  />
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                      {project.steps.flatMap(step =>
                        (step.tasks || []).map(task => ({ ...task, stepName: step.title, stepId: step._id }))
                      ).map((task, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {/* Delete Action */}
                              {(auth.currentUser && (isOwner || task.createdBy === auth.currentUser.uid)) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Delete this task?")) {
                                      handleDeleteTask(task.stepId, task._id);
                                    }
                                  }}
                                  className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mr-2"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <span className="font-medium">{task.title}</span>
                              <Badge variant="outline">{task.stepName}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 min-w-[150px] justify-end">
                              {task.assignedTo ? (
                                <>
                                  <Avatar className="h-6 w-6">
                                    {(() => {
                                      const u = users.find((user) => user.uid === task.assignedTo);
                                      return <AvatarImage src={getFullUrl(u?.photoURL)} />;
                                    })()}
                                    <AvatarFallback>{task.assignedToName?.substring(0, 2) || "U"}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{task.assignedToName || "Unknown"}</span>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Unassigned</span>
                              )}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => openAssignmentDialog(task.stepId, task)}>
                              {task.assignedTo ? "Reassign" : "Assign User"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
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
              {isSubmittingAssignment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Assignment
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
              {isCreatingTask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
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
              {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ProjectDetails;

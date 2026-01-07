import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle2, Circle, Server, Layout, Database, Share2, Plus, GripVertical, GitCommit, ExternalLink, Kanban } from "lucide-react";
import { API_BASE_URL } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import KanbanBoard from "@/components/workspace/KanbanBoard";
import { io } from "socket.io-client";
import { toast } from "sonner";

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
}

interface Task {
  _id: string; 
  id: string;
  title: string;
  description: string;
  status: "Pending" | "In Progress" | "Completed";
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
    { uid: "admin1", name: "Admin User", email: "admin@zync.com" },
    { uid: "dev1", name: "Frontend Dev", email: "frontend@zync.com" },
    { uid: "dev2", name: "Backend Dev", email: "backend@zync.com" },
    { uid: auth.currentUser?.uid || "current", name: auth.currentUser?.displayName || "You", email: auth.currentUser?.email },
].filter((v,i,a)=>a.findIndex(t=>(t.uid===v.uid))===i);

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true); 

  const fetchProject = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`);
        if (!response.ok) throw new Error("Project not found");
        const data = await response.json();
        setProject(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (id) fetchProject();
  }, [id]);

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

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleTaskUpdate = async (stepId: string, taskId: string, updates: any) => {
      if (!project) return;
      
      const newProject = { ...project };
      const step = newProject.steps.find(s => s._id === stepId || s.id === stepId);
      if (step) {
          const task = step.tasks.find(t => t._id === taskId || t.id === taskId);
          if (task) {
              Object.assign(task, updates);
              setProject(newProject);
          }
      }

      try {
          const realStepId = step?._id;
          const realTaskId = step?.tasks.find(t => t.id === taskId || t._id === taskId)?._id; 

          if(!realStepId || !realTaskId) return;

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
          fetchProject();
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
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden">
        <Tabs defaultValue="architecture" className="h-full flex flex-col">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 mb-6">
            <TabsTrigger value="architecture" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 pb-2">
              Architecture
            </TabsTrigger>
            <TabsTrigger value="steps" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 pb-2">
              Development Steps
            </TabsTrigger>
            <TabsTrigger value="board" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 pb-2">
              Task Board
            </TabsTrigger>
            <TabsTrigger value="team" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 pb-2">
              Team & Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="architecture" className="flex-1 overflow-auto">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* High Level */}
              <Card className="col-span-full">
                <CardHeader>
                  <CardTitle>High-Level Architecture</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{project.architecture.highLevel}</p>
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">API Flow</h4>
                    <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md">
                      {project.architecture.apiFlow}
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
                    <p className="text-xs text-muted-foreground">{project.architecture.frontend.structure}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Pages</h4>
                    <ul className="list-disc list-inside text-xs text-muted-foreground">
                      {project.architecture.frontend.pages.map((page, i) => (
                        <li key={i}>{page}</li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Components</h4>
                    <ul className="list-disc list-inside text-xs text-muted-foreground">
                      {project.architecture.frontend.components.map((comp, i) => (
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
                    <p className="text-xs text-muted-foreground">{project.architecture.backend.structure}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-1">APIs</h4>
                    <ul className="list-disc list-inside text-xs text-muted-foreground">
                      {project.architecture.backend.apis.map((api, i) => (
                        <li key={i}>{api}</li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Services</h4>
                    <ul className="list-disc list-inside text-xs text-muted-foreground">
                      {project.architecture.backend.services.map((svc, i) => (
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
                    <p className="text-xs text-muted-foreground">{project.architecture.database.design}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Collections</h4>
                    <ul className="list-disc list-inside text-xs text-muted-foreground">
                      {project.architecture.database.collections.map((col, i) => (
                        <li key={i}>{col}</li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Relationships</h4>
                    <p className="text-xs text-muted-foreground">{project.architecture.database.relationships}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="board" className="flex-1 overflow-auto h-full p-4">
             <KanbanBoard 
                steps={project.steps} 
                onUpdateTask={handleTaskUpdate} 
                users={MOCK_USERS}
             />
          </TabsContent>

          <TabsContent value="steps" className="flex-1 overflow-auto">
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
                                                     {/* Assignment Dropdown */}
                                                     <Select 
                                                        value={task.assignedTo || "unassigned"} 
                                                        onValueChange={(val) => handleTaskUpdate(step._id, task._id, { 
                                                            assignedTo: val === "unassigned" ? null : val,
                                                            assignedToName: val === "unassigned" ? null : MOCK_USERS.find(u => u.uid === val)?.name
                                                        })}
                                                        disabled={!isAdmin}
                                                     >
                                                        <SelectTrigger className="w-[140px] h-7 text-xs">
                                                            <SelectValue placeholder="Assignee" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                                            {MOCK_USERS.map(user => (
                                                                <SelectItem key={user.uid} value={user.uid}>{user.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                     </Select>
                                                     
                                                     {/* Status Dropdown */}
                                                     <Select 
                                                        value={task.status} 
                                                        onValueChange={(val) => handleTaskUpdate(step._id, task._id, { status: val })}
                                                     >
                                                        <SelectTrigger className={`w-[110px] h-7 text-xs border-0 ${
                                                            task.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 
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

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>Assign tasks and manage team members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                  Team management features coming soon.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProjectDetails;

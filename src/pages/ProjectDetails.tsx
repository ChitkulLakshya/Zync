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
import { ArrowLeft, Loader2, CheckCircle2, Circle, Server, Layout, Database, Share2 } from "lucide-react";

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
  steps: {
    id: string;
    title: string;
    description: string;
    status: "Pending" | "In Progress" | "Completed";
    type: string;
    page: string;
    assignedTo?: string;
  }[];
}

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/projects/${id}`);
        if (!response.ok) throw new Error("Project not found");
        const data = await response.json();
        setProject(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProject();
  }, [id]);

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

          <TabsContent value="steps" className="flex-1 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Development Plan</CardTitle>
                <CardDescription>Step-by-step guide to build your project</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-6 pb-6">
                  <div className="space-y-4">
                    {project.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-secondary/20 transition-colors">
                        <div className="mt-1">
                          {step.status === "Completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">{step.title}</h4>
                            <Badge variant="outline">{step.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="bg-secondary px-2 py-1 rounded">Page: {step.page}</span>
                            {step.assignedTo ? (
                              <span className="flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback>U</AvatarFallback>
                                </Avatar>
                                Assigned to {step.assignedTo}
                              </span>
                            ) : (
                              <span className="text-orange-500 cursor-pointer hover:underline">Unassigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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

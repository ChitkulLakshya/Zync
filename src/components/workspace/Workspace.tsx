import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/utils";
import { FolderGit2, Plus, ArrowRight, Loader2, Calendar, User, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Project {
  _id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
}

interface WorkspaceProps {
    onNavigate: (section: string) => void;
    onSelectProject: (id: string) => void;
    currentUser: any;
}

const Workspace = ({ onNavigate, onSelectProject, currentUser }: WorkspaceProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const deleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent card click
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProjects(projects.filter(p => p._id !== projectId));
        toast({
          title: "Project deleted",
          description: " The project has been successfully removed.",
        });
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project.",
        variant: "destructive",
      });
    }
  };

  // Load projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const ownerQuery = currentUser ? `?ownerId=${currentUser.uid}` : '';
        const response = await fetch(`${API_BASE_URL}/api/projects${ownerQuery}`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [currentUser]);

  if (loading) {
      return (
          <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 h-full">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">My Workspace</h2>
                <p className="text-muted-foreground mt-1 text-lg">
                    Manage your AI-generated projects and assignments.
                </p>
            </div>
            <Button onClick={() => onNavigate("New Project")} size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                New Project
            </Button>
        </div>

        {projects.length === 0 ? (
            <Card className="border-dashed border-2 bg-secondary/20">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <FolderGit2 className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">
                        Get started by creating your first AI-powered project. Describe your idea and let us build the architecture.
                    </p>
                    <Button onClick={() => onNavigate("New Project")}>
                        Create your first project
                    </Button>
                </CardContent>
            </Card>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                    <Card key={project._id} className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-primary" onClick={() => onSelectProject(project._id)}>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="mb-2">Project</Badge>
                                {project.ownerId === currentUser?.uid && (
                                  <Badge variant="secondary" className="text-xs">Owner</Badge>
                                )}
                            </div>
                            <CardTitle className="text-xl line-clamp-1 group-hover:text-primary transition-colors">
                                {project.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2 min-h-[40px]">
                                {project.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-3">
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>Created {format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <span>By {project.ownerId === currentUser?.uid ? 'You' : 'Team'}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-3 border-t bg-secondary/10 flex gap-2">
                             <Button 
                                variant="ghost" 
                                className="flex-1 justify-between hover:bg-transparent px-0 text-primary"
                            >
                                View Architecture
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            {project.ownerId === currentUser?.uid && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => deleteProject(e, project._id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default Workspace;

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { API_BASE_URL, getFullUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FolderGit2, Plus, ArrowRight, Loader2, Calendar, User, Trash2, Pin, FileText, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { fetchNotes, Note } from '../../api/notes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Github, Loader2 as Spinner, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Project {
  _id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  githubRepoName?: string;
  githubRepoOwner?: string;
  isTrackingActive?: boolean;
}

interface WorkspaceProps {
  onNavigate: (section: string) => void;
  onSelectProject: (id: string) => void;
  onOpenNote?: (id: string) => void;
  currentUser: any;
  usersList?: any[];
}

const Workspace = ({ onNavigate, onSelectProject, onOpenNote, currentUser, usersList = [] }: WorkspaceProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // GitHub Linking State
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [selectedProjectForLink, setSelectedProjectForLink] = useState<Project | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [linkingRepo, setLinkingRepo] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle GitHub Installation Callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const installationId = params.get('installation_id');

    if (installationId && currentUser) {
      const connectGitHub = async () => {
        try {
          const user = auth.currentUser;
          const token = user ? await user.getIdToken() : null;

          await fetch(`${API_BASE_URL}/api/github/install`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ installationId })
          });

          toast({
            title: "GitHub Connected",
            description: "App installation verified successfully."
          });

          // Remove query param
          navigate(location.pathname, { replace: true });
        } catch (error) {
          console.error("Failed to save installation ID", error);
        }
      };
      connectGitHub();
    }
  }, [location.search, currentUser, navigate]);

  const handleOpenLinkModal = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setSelectedProjectForLink(project);
    setRepoModalOpen(true);
    setLoadingRepos(true);
    setSearchTerm("");

    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      console.log("Fetching repos with token:", token ? token.substring(0, 10) + "..." : "null", "User:", user?.uid);

      if (!token) {
        toast({ title: "Authentication Error", description: "You are not signed in.", variant: "destructive" });
        setLoadingRepos(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/github/user-repos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 400) {
        // Not connected or App not installed
        const data = await response.json();
        if (data.notInstalled) {
          // Redirect to App Installation
          window.location.href = `https://github.com/apps/zync-meet/installations/new`;
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        setRepos(data);
      } else {
        throw new Error("Failed to fetch repos");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to fetch repositories. Please ensure Zync is installed on your GitHub.",
        variant: "destructive"
      });
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleLinkRepo = async (repo: any) => {
    if (!selectedProjectForLink) return;
    setLinkingRepo(true);
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      const response = await fetch(`${API_BASE_URL}/api/projects/${selectedProjectForLink._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          githubRepoName: repo.name,
          githubRepoOwner: repo.owner.login,
          isTrackingActive: true
        })
      });

      if (response.ok) {
        const updatedProject = await response.json();
        setProjects(projects.map(p => p._id === updatedProject._id ? updatedProject : p));
        setRepoModalOpen(false);
        toast({
          title: "Success",
          description: `Linked ${repo.full_name} to project.`
        });
      } else {
        throw new Error("Failed to link");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to link repository.",
        variant: "destructive"
      });
    } finally {
      setLinkingRepo(false);
    }
  }


  const handleUnlinkRepo = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (!confirm(`Unlink ${project.githubRepoName} from this project?`)) return;

    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      const response = await fetch(`${API_BASE_URL}/api/projects/${project._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          githubRepoName: null,
          githubRepoOwner: null,
          isTrackingActive: false
        })
      });

      if (response.ok) {
        const updatedProject = await response.json();
        setProjects(projects.map(p => p._id === updatedProject._id ? updatedProject : p));
        toast({ title: "Success", description: "Repository unlinked." });
      } else {
        throw new Error("Failed to unlink");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to unlink repository.", variant: "destructive" });
    }
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    const loadData = async () => {
      try {
        const ownerQuery = currentUser ? `?ownerId=${currentUser.uid}` : '';
        const [projectsRes, notes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/projects${ownerQuery}`),
          currentUser ? fetchNotes(currentUser.uid) : Promise.resolve([])
        ]);

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(data);
        }

        if (notes && Array.isArray(notes)) {
          setPinnedNotes(notes.filter(n => n.isPinned));
        }

      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 h-full">
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

        {/* Pinned Notes Widget */}
        {pinnedNotes.length > 0 && (
          <div>
            <div className="flex items-center mb-4">
              <h3 className="text-xl font-semibold">Pinned Notes</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pinnedNotes.map(note => (
                <Card
                  key={note._id}
                  className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
                  onClick={() => onOpenNote && onOpenNote(note._id)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <Pin className="w-4 h-4 text-orange-500 fill-orange-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <h4 className="font-semibold truncate">{note.title}</h4>
                    <p className="text-xs text-muted-foreground overflow-hidden h-4 mt-1">
                      {format(new Date(note.updatedAt), "MMM d, yyyy")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

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
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
                      {project.ownerId === currentUser?.uid ? (
                        <span>By You</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>By</span>
                          <div className="flex items-center gap-1 bg-secondary/50 pr-2 pl-1 py-0.5 rounded-full">
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={getFullUrl(usersList?.find(u => u.uid === project.ownerId)?.photoURL)} />
                              <AvatarFallback className="text-[8px]">
                                {usersList?.find(u => u.uid === project.ownerId)?.displayName?.substring(0, 2) || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-xs">
                              {usersList?.find(u => u.uid === project.ownerId)?.displayName || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {!project.githubRepoName && project.ownerId === currentUser?.uid && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 gap-2 border-dashed hover:border-solid hover:bg-secondary/50"
                      onClick={(e) => handleOpenLinkModal(e, project)}
                    >
                      <Github className="w-3 h-3" />
                      Link GitHub
                    </Button>
                  )}
                  {project.githubRepoName && (
                    <div className="flex items-center gap-2 mt-3 p-2 bg-secondary/30 rounded-md text-xs group/repo relative pr-8">
                      <Github className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate flex-1">{project.githubRepoOwner}/{project.githubRepoName}</span>

                      {project.ownerId === currentUser?.uid && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 absolute right-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleUnlinkRepo(e, project)}
                          title="Unlink Repository"
                        >
                          <Unlink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
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

      {/* GitHub Link Modal */}
      <Dialog open={repoModalOpen} onOpenChange={setRepoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link GitHub Repository</DialogTitle>
            <DialogDescription>
              Select a repository to link to <strong>{selectedProjectForLink?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="h-[200px] overflow-y-auto border rounded-md p-2 space-y-1">
              {loadingRepos ? (
                <div className="flex h-full items-center justify-center">
                  <Spinner className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : repos.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground p-4">
                  <p>No repositories found.</p>
                  <a href="https://github.com/apps/zync-meet/installations/new" target="_blank" rel="noreferrer" className="text-primary hover:underline mt-2 block">
                    Install Zync App on GitHub
                  </a>
                </div>
              ) : (
                filteredRepos.map(repo => (
                  <div
                    key={repo.id}
                    onClick={() => handleLinkRepo(repo)}
                    className="flex items-center justify-between p-2 hover:bg-secondary rounded-md cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium text-sm truncate">{repo.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{repo.full_name}</span>
                    </div>
                    {selectedProjectForLink?.githubRepoName === repo.name && <Badge>Linked</Badge>}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workspace;

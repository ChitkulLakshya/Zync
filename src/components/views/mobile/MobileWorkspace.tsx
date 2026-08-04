import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus, FolderGit2, ArrowRight, Calendar, Trash2,
  Search, Loader2, X,
} from 'lucide-react';
import { format } from 'date-fns';
import { auth } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/utils';
import { useProjects, useProjectMutations } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';
import { Github as GithubIcon } from '@/components/ui/GithubIcon';

interface Project {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  ownerId: string;
  ownerUid?: string;
  owner?: { uid: string; displayName: string; photoURL?: string | null } | null;
  team?: string[];
  createdAt: string;
  githubRepoName?: string;
  githubRepoOwner?: string;
}

interface MobileWorkspaceProps {
  currentUser: any;
  onNavigate?: (section: string) => void;
  onSelectProject: (id: string) => void;
}

const getProjectId = (p: Project) => p._id || p.id || '';
const getRepoOwnerLogin = (repo: any) => repo?.owner?.login || repo?.owner || repo?.full_name?.split('/')[0] || '';
const makeRepoKey = (owner: string, name: string) => `${owner}/${name}`.toLowerCase();
const normalizeRepoList = (data: any): any[] => {
  if (Array.isArray(data)) {return data;}
  if (Array.isArray(data?.repos)) {return data.repos;}
  return [];
};

const MobileWorkspace = ({ currentUser, onSelectProject }: MobileWorkspaceProps) => {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { data: projects = [], isLoading } = useProjects();
  const { deleteProject, linkGitHub, createProject, createProjectWithNewRepo } = useProjectMutations();

  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [selectedProjectForLink, setSelectedProjectForLink] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoLoadState, setRepoLoadState] = useState<
    'idle' | 'ok' | 'not-connected' | 'not-installed' | 'suspended' | 'no-repo-access' | 'error'
  >('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<any[]>([]);

  // New repo form state
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [creating, setCreating] = useState(false);

  const isProjectOwner = (p: Project) => (p.ownerUid || p.ownerId) === currentUser?.uid;

  const loadRepos = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    setLoadingRepos(true);
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      if (!token) { setRepoLoadState('error'); return; }

      const response = await fetch(
        `${API_BASE_URL}/api/github/user-repos${force ? '?refresh=1' : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json().catch(() => ({}));
      const list = normalizeRepoList(data);
      setRepos(list);

      if (response.ok) {
        setRepoLoadState(list.length === 0 ? 'no-repo-access' : 'ok');
        return;
      }
      if (data?.notInstalled) {setRepoLoadState('not-installed');}
      else if (data?.notConnected) {setRepoLoadState('not-connected');}
      else if (data?.suspended) {setRepoLoadState('suspended');}
      else {setRepoLoadState('error');}
    } catch {
      setRepoLoadState('error');
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  const handleOpenCreateSheet = async () => {
    setCreateSheetOpen(true);
    setSearchTerm('');
    setSelectedRepos([]);
    setNewRepoName('');
    setNewRepoDesc('');
    await loadRepos({ force: true });
  };

  const handleOpenLinkSheet = async (project: Project) => {
    setSelectedProjectForLink(project);
    setLinkSheetOpen(true);
    setSearchTerm('');
    await loadRepos({ force: true });
  };

  const handleLinkRepo = async (repo: any) => {
    if (!selectedProjectForLink) {return;}
    try {
      const ownerLogin = getRepoOwnerLogin(repo);
      await linkGitHub({
        projectId: getProjectId(selectedProjectForLink),
        repoData: { githubRepoName: repo.name, githubRepoOwner: ownerLogin },
      });
      toast({ title: 'Success', description: `Linked ${repo.full_name} to project.` });
      setLinkSheetOpen(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to link repository.', variant: 'destructive' });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const isConfirmed = await confirm({
      title: 'Remove Project',
      description: 'Are you sure you want to remove this project from your workspace? This will only unlink it from Zync; your GitHub repository will NOT be deleted.',
      checkboxLabel: 'I confirm I want to remove this project',
    });
    if (!isConfirmed) {return;}
    try {
      await deleteProject(projectId);
      toast({ title: 'Project Unlinked', description: 'The project has been removed from Zync.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete project.', variant: 'destructive' });
    }
  };

  const handleCreateNewRepo = async () => {
    if (!newRepoName.trim()) {
      toast({ title: 'Validation', description: 'Repository name is required.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await createProjectWithNewRepo({
        name: newRepoName.trim(),
        description: newRepoDesc,
        ownerId: currentUser?.uid,
        isPrivate,
      });
      toast({ title: 'Project Created', description: `${newRepoName} has been created and linked.` });
      setCreateSheetOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to create project.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleImportRepos = async () => {
    if (selectedRepos.length === 0) {return;}
    setCreating(true);
    try {
      for (const repo of selectedRepos) {
        const ownerLogin = getRepoOwnerLogin(repo);
        await createProject({
          name: repo.name,
          description: repo.description || '',
          ownerId: currentUser?.uid,
          githubRepoName: repo.name,
          githubRepoOwner: ownerLogin,
        });
      }
      toast({ title: 'Projects Created', description: `${selectedRepos.length} project(s) imported.` });
      setCreateSheetOpen(false);
      setSelectedRepos([]);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to import repositories.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const toggleRepoSelection = (repo: any) => {
    setSelectedRepos(prev =>
      prev.some(r => r.id === repo.id) ? prev.filter(r => r.id !== repo.id) : [...prev, repo]
    );
  };

  const searchMatchedRepos = repos.filter((repo: any) =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const workspaceRepoKeys = new Set(
    projects
      .filter((p: any) => p?.githubRepoName && p?.githubRepoOwner)
      .map((p: any) => makeRepoKey(p.githubRepoOwner, p.githubRepoName))
  );
  const addProjectRepos = searchMatchedRepos.filter((repo: any) => {
    const key = makeRepoKey(getRepoOwnerLogin(repo), repo?.name);
    return !workspaceRepoKeys.has(key);
  });

  const renderRepoStateMessage = () => {
    if (loadingRepos) {
      return (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading repositories…
        </div>
      );
    }
    if (repos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground p-4 py-8">
          {repoLoadState === 'not-installed' ? (
            <>
              <p className="mb-2">The Zync GitHub App is not installed.</p>
              <a href="https://github.com/apps/ZYNC-meet/installations/new" target="_blank" rel="noreferrer" className="text-foreground hover:underline">Install Zync App on GitHub</a>
            </>
          ) : repoLoadState === 'not-connected' ? (
            <p>Please connect your GitHub account first.</p>
          ) : repoLoadState === 'suspended' ? (
            <p>The Zync GitHub App installation is suspended.</p>
          ) : repoLoadState === 'no-repo-access' ? (
            <>
              <p className="mb-2">No repositories accessible. Grant the Zync App access on GitHub.</p>
              <a href="https://github.com/apps/ZYNC-meet/installations/new" target="_blank" rel="noreferrer" className="text-foreground hover:underline">Manage permissions</a>
            </>
          ) : repoLoadState === 'error' ? (
            <p>Could not load repositories. Please try again.</p>
          ) : (
            <p>No repositories found.</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading workspace…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pl-4 pr-14 py-3 shrink-0">
        <div>
          <h2 className="text-lg font-semibold">My Workspace</h2>
          <p className="text-xs text-muted-foreground">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" className="gap-2" onClick={handleOpenCreateSheet}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
              <FolderGit2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Create your first project or import a GitHub repository.
            </p>
            <Button size="sm" onClick={handleOpenCreateSheet}>
              <Plus className="w-4 h-4 mr-1" /> Add Project
            </Button>
          </div>
        ) : (
          projects.map((project: Project) => (
            <Card
              key={getProjectId(project)}
              className="border border-border/10 shadow-sm active:scale-[0.98] transition-transform"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[10px] mb-1">Project</Badge>
                  {isProjectOwner(project) && (
                    <Badge variant="secondary" className="text-[10px]">Owner</Badge>
                  )}
                </div>
                <CardTitle
                  className="text-base line-clamp-1 cursor-pointer"
                  onClick={() => onSelectProject(getProjectId(project))}
                >
                  {project.name}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {project.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
                </div>

                {project.githubRepoName ? (
                  <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-md text-xs mb-2">
                    <GithubIcon className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate flex-1">{project.githubRepoOwner}/{project.githubRepoName}</span>
                  </div>
                ) : isProjectOwner(project) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-dashed text-xs h-8 mb-2"
                    onClick={() => handleOpenLinkSheet(project)}
                  >
                    <GithubIcon className="w-3 h-3" /> Link GitHub
                  </Button>
                ) : null}

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-between text-xs h-8"
                    onClick={() => onSelectProject(getProjectId(project))}
                  >
                    Open <ArrowRight className="w-3 h-3" />
                  </Button>
                  {isProjectOwner(project) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteProject(getProjectId(project))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Project Sheet */}
      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Create Project</SheetTitle>
            <SheetDescription>Create a new project or import a GitHub repository.</SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/10 shrink-0">
            <h2 className="font-semibold text-lg">Add Project</h2>
          </div>

          <Tabs defaultValue="import" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mt-3 shrink-0">
              <TabsTrigger value="import" className="flex-1 text-xs">Import Existing</TabsTrigger>
              <TabsTrigger value="new" className="flex-1 text-xs">New Repository</TabsTrigger>
            </TabsList>

            {/* Import Tab */}
            <TabsContent value="import" className="flex-1 flex flex-col overflow-hidden mt-0">
              <div className="px-4 py-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search repositories…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1">
                {renderRepoStateMessage()}
                {repos.length > 0 && addProjectRepos.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    All matching repositories are already in your workspace.
                  </div>
                )}
                {addProjectRepos.map((repo: any) => {
                  const isChecked = selectedRepos.some(r => r.id === repo.id);
                  return (
                    <div
                      key={repo.id}
                      onClick={() => toggleRepoSelection(repo)}
                      className="flex items-center gap-3 p-2.5 rounded-lg active:bg-secondary/50 cursor-pointer"
                    >
                      <Checkbox checked={isChecked} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{repo.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {repo.full_name || repo.owner}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedRepos.length > 0 && (
                <div className="px-4 py-3 border-t border-border/10 shrink-0">
                  <Button className="w-full" disabled={creating} onClick={handleImportRepos}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Import {selectedRepos.length} project{selectedRepos.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* New Repo Tab */}
            <TabsContent value="new" className="flex-1 overflow-y-auto px-4 py-3 space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-sm">Repository Name</Label>
                <Input
                  placeholder="my-awesome-project"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Description (optional)</Label>
                <Input
                  placeholder="A brief description…"
                  value={newRepoDesc}
                  onChange={(e) => setNewRepoDesc(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Private Repository</p>
                  <p className="text-xs text-muted-foreground">Only you and collaborators can see it</p>
                </div>
                <Checkbox
                  checked={isPrivate}
                  onChange={() => setIsPrivate(!isPrivate)}
                />
              </div>
              <Button className="w-full" disabled={creating || !newRepoName.trim()} onClick={handleCreateNewRepo}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Project
              </Button>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Link GitHub Sheet */}
      <Sheet open={linkSheetOpen} onOpenChange={setLinkSheetOpen}>
        <SheetContent side="bottom" className="h-[75vh] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Link GitHub Repository</SheetTitle>
            <SheetDescription>Select a repository to link to this project.</SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/10 shrink-0">
            <h2 className="font-semibold text-lg">Link Repository</h2>
          </div>

          <div className="px-4 py-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1">
            {renderRepoStateMessage()}
            {repos.length > 0 && searchMatchedRepos.map((repo: any) => (
              <div
                key={repo.id}
                onClick={() => handleLinkRepo(repo)}
                className="flex items-center gap-3 p-2.5 rounded-lg active:bg-secondary/50 cursor-pointer"
              >
                <GithubIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{repo.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{repo.full_name || repo.owner}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileWorkspace;

/**
 * @fileoverview Workspace.tsx
 * @module Workspace
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
import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { API_BASE_URL, getFullUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FolderGit2, Plus, ArrowRight, Calendar, User, Trash2, Pin, FileText, Search, CheckSquare, Loader2 } from 'lucide-react';
import { Github } from '@/components/ui/GithubIcon';
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useProjects, useProjectMutations } from "@/hooks/useProjects";
import { usePinnedNotes } from "@/hooks/useNotes";
import TaskAssignmentDrawer from "@/components/workspace/TaskAssignmentDrawer";

interface Project {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  ownerId: string;
  ownerUid?: string;
  owner?: {
    uid: string;
    displayName: string;
    photoURL?: string | null;
  } | null;
  team?: string[];
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

const Workspace = ({ onSelectProject, onOpenNote, currentUser, usersList = [] }: WorkspaceProps) => {
  const { toast } = useToast();
  
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: pinnedNotes = [], isLoading: notesLoading } = usePinnedNotes();
  const {
    deleteProject,
    linkGitHub,
    createProject,
    createProjectWithNewRepo,
    isCreating: creatingProject,
    isDeleting: deletingProject,
  } = useProjectMutations();

  const loading = projectsLoading || notesLoading;

  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [selectedProjectForLink, setSelectedProjectForLink] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  // WHAT: The real reason the repo list is empty.
  // WHY: An empty list is NOT proof that the GitHub App is missing. Showing the
  // install prompt for a transient fetch failure was the long-standing bug.
  const [repoLoadState, setRepoLoadState] = useState<
    'idle' | 'ok' | 'not-connected' | 'not-installed' | 'suspended' | 'no-repo-access' | 'error'
  >('idle');
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<any[]>([]);
  const [creatingProjects, setCreatingProjects] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectPrivate, setNewProjectPrivate] = useState(true);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState<Project | null>(null);
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [activeCollaborators, setActiveCollaborators] = useState<any[]>([]);
  const [availableTeamMembers, setAvailableTeamMembers] = useState<any[]>([]);
  const [githubAppNotInstalled, setGithubAppNotInstalled] = useState(false);
  const [loadingAssignableUsers, setLoadingAssignableUsers] = useState(false);
  const [invitingCollaborator, setInvitingCollaborator] = useState(false);
  const [assigningTask, setAssigningTask] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);

  useEffect(() => {
    const newId = sessionStorage.getItem('newlyCreatedProjectId');
    if (newId) {
      setNewProjectId(newId);
      sessionStorage.removeItem('newlyCreatedProjectId');
      const timeout = setTimeout(() => {
        setNewProjectId(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, []);

  const queryClient = useQueryClient();

  const hasSynced = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const syncProjects = async () => {
      if (!currentUser || hasSynced.current) {return;}
      hasSynced.current = true;
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/api/projects/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (isMounted && (data.updatedCount > 0 || data.deletedCount > 0)) {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
          }
        }
      } catch (err) {
        console.error("Failed to sync GitHub projects", err);
      }
    };
    syncProjects();
    return () => { isMounted = false; };
  }, [queryClient, currentUser]);

  const location = useLocation();
  const navigate = useNavigate();

  const normalizeRepoList = (payload: any) => {
    if (Array.isArray(payload)) {return payload;}
    if (Array.isArray(payload?.repos)) {return payload.repos;}
    if (Array.isArray(payload?.repositories)) {return payload.repositories;}
    return [];
  };

  const getRepoOwnerLogin = (repo: any) => {
    if (!repo) { return ""; }
    if (typeof repo.owner === "string") { return repo.owner; }
    if (repo.owner?.login) { return repo.owner.login; }
    if (repo.full_name && typeof repo.full_name === "string" && repo.full_name.includes("/")) {
      return repo.full_name.split("/")[0];
    }
    return "";
  };

  const makeRepoKey = (owner?: string | null, name?: string | null) =>
    `${String(owner || "").trim().toLowerCase()}/${String(name || "").trim().toLowerCase()}`;

  const getProjectId = (project: Project | null | undefined) => project?._id || project?.id || "";

  /**
   * WHAT: Loads the GitHub repositories the Zync App can access.
   * WHY: Single source of truth for repo loading so the "install the app"
   * prompt is only ever shown when the backend explicitly reports
   * `notInstalled`. Previously any failure left `repos` empty and the UI
   * wrongly concluded the app was missing.
   */
  const loadRepos = async ({ force = false }: { force?: boolean } = {}) => {
    setLoadingRepos(true);
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      if (!token) {
        setRepoLoadState('error');
        return;
      }

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

      // Only the backend may declare the app missing, and it only does so when
      // GitHub itself confirms it.
      if (data?.notInstalled) {
        setRepoLoadState('not-installed');
      } else if (data?.notConnected) {
        setRepoLoadState('not-connected');
      } else if (data?.suspended) {
        setRepoLoadState('suspended');
      } else {
        setRepoLoadState('error');
      }
    } catch (err) {
      console.error('Failed to load GitHub repositories', err);
      setRepoLoadState('error');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleOpenLinkModal = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setSelectedProjectForLink(project);
    setRepoModalOpen(true);
    setSearchTerm("");

    // Always force-refresh: a stale cache from a previous open (or from
    // before a repo was created/deleted) must not show the wrong state.
    await loadRepos({ force: true });
  };

  const handleLinkRepo = async (repo: any) => {
    if (!selectedProjectForLink) {return;}
    try {
      const ownerLogin = getRepoOwnerLogin(repo);
      await linkGitHub({
        projectId: getProjectId(selectedProjectForLink),
        repoData: {
          githubRepoName: repo.name,
          githubRepoOwner: ownerLogin
        }
      });
      setRepoModalOpen(false);
      toast({ title: "Success", description: `Linked ${repo.full_name} to project.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to link repository.", variant: "destructive" });
    }
  };

  const handleOpenCreateModal = async () => {
    setCreateModalOpen(true);
    setSearchTerm("");
    setSelectedRepos([]);
    // Always force-refresh so a stale cache from a previous open (or from
    // before a repo was created/deleted) doesn't show the wrong state.
    await loadRepos({ force: true });
  };

  const handleCreateProjectFromRepo = async (repo: any) => {
    try {
      const ownerLogin = getRepoOwnerLogin(repo);
      await createProject({
        name: repo.name,
        description: repo.description,
        ownerId: currentUser?.uid,
        githubRepoName: repo.name,
        githubRepoOwner: ownerLogin
      });
      setCreateModalOpen(false);
      toast({ title: "Success", description: `Project ${repo.name} created successfully.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create project.", variant: "destructive" });
    }
  };

  const handleCreateMultipleProjects = async () => {
    if (selectedRepos.length === 0) {return;}
    setCreatingProjects(true);
    try {
      for (const repo of selectedRepos) {
        const ownerLogin = getRepoOwnerLogin(repo);
        await createProject({
          name: repo.name,
          description: repo.description,
          ownerId: currentUser?.uid,
          githubRepoName: repo.name,
          githubRepoOwner: ownerLogin
        });
      }
      setCreateModalOpen(false);
      toast({ title: "Success", description: `${selectedRepos.length} project(s) created successfully.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create projects.", variant: "destructive" });
    } finally {
      setCreatingProjects(false);
    }
  };

  const handleCreateNewProject = async () => {
    if (!newProjectName.trim()) {
      toast({ title: "Error", description: "Project name is required.", variant: "destructive" });
      return;
    }
    setCreatingProjects(true);
    try {
      await createProjectWithNewRepo({
        name: newProjectName.trim(),
        description: newProjectDescription.trim(),
        isPrivate: newProjectPrivate,
      });
      setCreateModalOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectPrivate(true);
      toast({ title: "Success", description: `Project ${newProjectName} created successfully.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create project.", variant: "destructive" });
    } finally {
      setCreatingProjects(false);
    }
  };

  const toggleRepoSelection = (repo: any) => {
    setSelectedRepos(prev => {
      const isSelected = prev.some(r => r.id === repo.id);
      if (isSelected) {
        return prev.filter(r => r.id !== repo.id);
      } else {
        return [...prev, repo];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedRepos.length === addProjectRepos.length) {
      setSelectedRepos([]);
    } else {
      setSelectedRepos([...addProjectRepos]);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) { return; }

    try {
      await deleteProject(projectId);
      toast({ title: "Project deleted", description: "The project has been successfully removed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" });
    }
  };

  const handleOpenArchitecture = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const projectId = getProjectId(project);
    if (!projectId) { return; }
    onSelectProject(projectId);
  };

  const fetchCollaboratorData = async (projectId: string) => {
    setLoadingAssignableUsers(true);
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/collaborator-assignees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.message || "Failed to fetch collaborator assignees");
      }

      const data = await response.json();
      setActiveCollaborators(Array.isArray(data?.activeCollaborators) ? data.activeCollaborators : []);
      setAvailableTeamMembers(Array.isArray(data?.availableTeamMembers) ? data.availableTeamMembers : []);
      setGithubAppNotInstalled(!!data?.githubAppNotInstalled);
    } catch (error) {
      console.error("Failed to load users for task assignment", error);
      toast({ title: "Error", description: "Failed to load collaborator data.", variant: "destructive" });
    } finally {
      setLoadingAssignableUsers(false);
    }
  };

  const handleOpenTaskDrawer = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setSelectedProjectForTask(project);
    setTaskName("");
    setTaskDescription("");
    setSelectedAssigneeId(null);
    setActiveCollaborators([]);
    setAvailableTeamMembers([]);
    setGithubAppNotInstalled(false);
    setTaskDrawerOpen(true);

    const projectId = getProjectId(project);
    if (projectId) {
      await fetchCollaboratorData(projectId);
    }
  };

  const handleInviteCollaborator = async (userId: string) => {
    if (!selectedProjectForTask) { return; }
    setInvitingCollaborator(true);

    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      const projectId = getProjectId(selectedProjectForTask);
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/invite-collaborator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.message || "Failed to invite collaborator");
      }

      const data = await response.json();
      toast({ title: "Invite Sent", description: data?.message || "Repository invitation sent." });

      if (selectedProjectForTask) {
        const projectId = getProjectId(selectedProjectForTask);
        if (projectId) {
          await fetchCollaboratorData(projectId);
        }
      }
    } catch (error: any) {
      console.error("Invite collaborator error:", error);
      toast({ title: "Invite Failed", description: error?.message || "Could not send invite.", variant: "destructive" });
    } finally {
      setInvitingCollaborator(false);
    }
  };

  const handleSelectAssignee = (userId: string) => {
    setSelectedAssigneeId((prev) => (prev === userId ? null : userId));
  };

  const handleSubmitTaskAssignment = async () => {
    if (!selectedProjectForTask) { return; }

    const trimmedName = taskName.trim();
    if (!trimmedName) {
      toast({ title: "Validation Error", description: "Task Name is required.", variant: "destructive" });
      return;
    }

    if (!selectedAssigneeId) {
      toast({ title: "Validation Error", description: "Select one assignee.", variant: "destructive" });
      return;
    }

    setAssigningTask(true);
    try {
      const projectId = getProjectId(selectedProjectForTask);
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      const response = await fetch(`${API_BASE_URL}/api/tasks/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          taskName: trimmedName,
          description: taskDescription,
          assignedUserId: selectedAssigneeId,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.message || "Failed to assign task");
      }

      toast({
        title: "Task assigned",
        description: `Task has been assigned successfully.`,
      });

      setTaskDrawerOpen(false);
      setSelectedProjectForTask(null);
      setTaskName("");
      setTaskDescription("");
      setSelectedAssigneeId(null);
    } catch (error: any) {
      console.error("Task assignment error:", error);
      toast({
        title: "Assignment Failed",
        description: error?.message || "Could not assign task.",
        variant: "destructive",
      });
    } finally {
      setAssigningTask(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const installationId = params.get('installation_id');
    const autoOpenCreate = params.get('action') === 'create_project';

    if (autoOpenCreate) {
      handleOpenCreateModal();
      navigate(location.pathname, { replace: true });
    }

    if (installationId && currentUser) {
      const connectGitHub = async () => {
        try {
          const user = auth.currentUser;
          const token = user ? await user.getIdToken() : null;

          const res = await fetch(`${API_BASE_URL}/api/github/install`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ installationId })
          });

          if (!res.ok) {
            throw new Error(`API returned ${res.status}`);
          }

          toast({ title: "GitHub Connected", description: "App installation verified successfully." });
          handleOpenCreateModal();
        } catch (error) {
          console.error("Failed to save installation ID", error);
        } finally {
          navigate(location.pathname, { replace: true });
        }
      };
      connectGitHub();
    }
  }, [location.search, currentUser, navigate, toast]);

  const safeRepos = Array.isArray(repos) ? repos : normalizeRepoList(repos);

  const searchMatchedRepos = safeRepos.filter((repo: any) =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const workspaceRepoKeys = new Set(
    projects
      .filter((p: any) => p?.githubRepoName && p?.githubRepoOwner)
      .map((p: any) => makeRepoKey(p.githubRepoOwner, p.githubRepoName))
  );

  const addProjectRepos = searchMatchedRepos.filter((repo: any) => {
    const ownerLogin = getRepoOwnerLogin(repo);
    const key = makeRepoKey(ownerLogin, repo?.name);
    return !workspaceRepoKeys.has(key);
  });

  const linkRepos = searchMatchedRepos;

  const getProjectOwnerUid = (project: Project) => project.ownerUid || project.ownerId;
  const isProjectOwner = (project: Project) => getProjectOwnerUid(project) === currentUser?.uid;
  const canAssignTaskForProject = (project: Project) => isProjectOwner(project);
  const getOwnerProfile = (project: Project) => {
    const ownerUid = getProjectOwnerUid(project);
    const ownerFromPayload = project.owner;
    const fallbackUser = usersList?.find((u: any) => u.uid === ownerUid);

    return {
      uid: ownerUid,
      displayName:
        ownerFromPayload?.displayName ||
        fallbackUser?.displayName ||
        (isProjectOwner(project) ? "You" : "Unknown"),
      photoURL: ownerFromPayload?.photoURL || fallbackUser?.photoURL || (isProjectOwner(project) ? currentUser?.photoURL : null),
    };
  };

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground flex items-center justify-center h-full">Loading workspace...</div>;
  }
  return (
    <div className="flex-1 p-6 md:p-8 h-full bg-transparent overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>

            <p className="text-muted-foreground mt-1 text-lg">
              Manage your AI-generated projects and assignments.
            </p>
          </div>
          <Button onClick={handleOpenCreateModal} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Add Project
          </Button>
        </div>

        {}
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
                      <FileText className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
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
          <Card className="border-dashed border-2 border-border/20 bg-secondary/10">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-6">
                <FolderGit2 className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Get started by creating your first AI-powered project. Describe your idea and let us build the architecture.
              </p>
              <Button onClick={handleOpenCreateModal}>
                Add your first project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={getProjectId(project)} className="group hover:shadow-lg transition-all duration-200 border border-border/10 shadow-sm hover:border-border/30">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="mb-2">Project</Badge>
                    {isProjectOwner(project) && (
                      <Badge variant="secondary" className="text-xs">Owner</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl line-clamp-1 group-hover:text-foreground transition-colors flex items-center gap-2">
                    {project.name}
                    {newProjectId === getProjectId(project) && (
                      <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 text-[10px] uppercase px-1.5 py-0">
                        New
                      </Badge>
                    )}
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
                      <div className="flex items-center gap-2" title={`Owner: ${getOwnerProfile(project).displayName}`}>
                        <span>Owner</span>
                        <div className="flex items-center gap-1 bg-secondary/50 pr-2 pl-1 py-0.5 rounded-full">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={getFullUrl(getOwnerProfile(project).photoURL || undefined)} />
                            <AvatarFallback className="text-[9px]">
                              {getOwnerProfile(project).displayName?.substring(0, 2)?.toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-xs max-w-[90px] truncate">
                            {isProjectOwner(project) ? 'You' : getOwnerProfile(project).displayName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {!project.githubRepoName && isProjectOwner(project) && (
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
                    <div className="flex items-center gap-2 mt-3 p-2 bg-secondary/30 rounded-md text-xs">
                      <Github className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate flex-1">{project.githubRepoOwner}/{project.githubRepoName}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-3 border-t bg-secondary/10 flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1 justify-between hover:bg-transparent px-0 text-foreground"
                    onClick={(e) => handleOpenArchitecture(e, project)}
                  >
                    View Architecture
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  {canAssignTaskForProject(project) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={(e) => handleOpenTaskDrawer(e, project)}
                      title="Assign Task"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </Button>
                  )}
                  {isProjectOwner(project) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deletingProject}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        const projectId = getProjectId(project);
                        if (projectId) {
                          handleDeleteProject(e, projectId);
                        }
                      }}
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

      {}
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
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading repositories…
                </div>
              ) : repos.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground p-4">
                  {repoLoadState === 'not-installed' ? (
                    <>
                      <p>The Zync GitHub App is not installed on your account.</p>
                      <a href="https://github.com/apps/ZYNC-meet/installations/new" target="_blank" rel="noreferrer" className="text-foreground hover:underline mt-2 block">
                        Install Zync App on GitHub
                      </a>
                    </>
                  ) : repoLoadState === 'not-connected' ? (
                    <p>Please connect your GitHub account first.</p>
                  ) : repoLoadState === 'suspended' ? (
                    <p>The Zync GitHub App installation is suspended. Re-enable it on GitHub.</p>
                  ) : repoLoadState === 'no-repo-access' ? (
                    <>
                      <p>No repositories accessible. Grant the Zync App access to repositories on GitHub.</p>
                      <a href="https://github.com/apps/ZYNC-meet/installations/new" target="_blank" rel="noreferrer" className="text-foreground hover:underline mt-2 block">
                        Manage App permissions on GitHub
                      </a>
                    </>
                  ) : repoLoadState === 'error' ? (
                    <p>Could not load repositories. Please try again.</p>
                  ) : (
                    <p>No repositories found.</p>
                  )}
                </div>
              ) : (
                linkRepos.map((repo: any) => (
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

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col min-h-[500px]">
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
            <DialogDescription>
              Create a new project or import existing GitHub repositories.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="create" className="w-full mt-4 flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-[400px] grid-cols-2 mx-auto">
              <TabsTrigger value="create">Create New</TabsTrigger>
              <TabsTrigger value="import">Import Existing</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 relative overflow-hidden mt-4 min-h-0">
            <TabsContent value="create" className="data-[state=active]:flex flex-col absolute inset-0 m-0 outline-none">
              <div className="space-y-4 max-w-lg mx-auto w-full pt-4 overflow-y-auto pb-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input id="project-name" placeholder="e.g. My Awesome App" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-desc">Description (optional)</Label>
                  <Input id="project-desc" placeholder="Brief description of your project" value={newProjectDescription} onChange={e => setNewProjectDescription(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox id="private-repo" checked={newProjectPrivate} onCheckedChange={(checked) => setNewProjectPrivate(checked as boolean)} />
                  <Label htmlFor="private-repo" className="cursor-pointer text-sm font-normal">Create as Private Repository on GitHub</Label>
                </div>
              </div>
              <div className="mt-auto pt-4 pb-2 flex justify-end gap-2 border-t z-10 bg-background">
                <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateNewProject} disabled={creatingProjects || !newProjectName.trim()}>
                   {creatingProjects ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="import" className="data-[state=active]:flex flex-col absolute inset-0 m-0 outline-none">
              <div className="flex flex-col md:flex-row gap-6 py-4 flex-1 min-h-0 overflow-hidden">
            {/* Left Pane - Repository Selection */}
            <div className="flex-1 flex flex-col border border-border/10 rounded-xl overflow-hidden bg-background shadow-sm min-h-0">
              <div className="p-3 border-b border-border/10 bg-secondary/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="select-all" 
                    checked={addProjectRepos.length > 0 && selectedRepos.length === addProjectRepos.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Check all
                  </label>
                </div>
                <div className="relative w-full md:w-auto flex-1 md:max-w-[200px]">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-8 h-8 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {loadingRepos ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading repositories…
                      </div>
                  ) : repos.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground p-4">
                        {repoLoadState === 'not-installed' ? (
                          <>
                            <p>The Zync GitHub App is not installed on your account.</p>
                            <a href="https://github.com/apps/ZYNC-meet/installations/new" target="_blank" rel="noreferrer" className="text-foreground hover:underline mt-2 block">
                              Install Zync App on GitHub
                            </a>
                          </>
                        ) : repoLoadState === 'not-connected' ? (
                          <p>Please connect your GitHub account first.</p>
                        ) : repoLoadState === 'suspended' ? (
                          <p>The Zync GitHub App installation is suspended. Re-enable it on GitHub.</p>
                        ) : repoLoadState === 'no-repo-access' ? (
                          <>
                            <p>No repositories accessible. Grant the Zync App access to repositories on GitHub.</p>
                            <a href="https://github.com/apps/ZYNC-meet/installations/new" target="_blank" rel="noreferrer" className="text-foreground hover:underline mt-2 block">
                              Manage App permissions on GitHub
                            </a>
                          </>
                        ) : repoLoadState === 'error' ? (
                          <p>Could not load repositories. Please try again.</p>
                        ) : (
                          <p>No repositories found.</p>
                        )}
                      </div>
                  ) : addProjectRepos.length === 0 ? (
                      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
                        All matching repositories are already added to your workspace.
                      </div>
                  ) : (
                      addProjectRepos.map((repo: any) => {
                        const isChecked = selectedRepos.some(r => r.id === repo.id);
                        return (
                          <div
                            key={repo.id}
                            onClick={() => toggleRepoSelection(repo)}
                            className={`flex items-center justify-between p-2 rounded-md border border-transparent cursor-pointer transition-colors ${isChecked ? 'bg-secondary border-border' : 'hover:bg-secondary/50'}`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden pr-2">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${repo.private ? 'bg-orange-500' : 'bg-green-500'}`} />
                              <div className="flex flex-col flex-1 overflow-hidden">
                                <span className="font-medium text-sm truncate leading-none">
                                  {repo.name} 
                                  <span className="text-xs text-muted-foreground font-normal ml-1 hidden sm:inline-block truncate">
                                    {repo.full_name}
                                  </span>
                                </span>
                              </div>
                            </div>
                            <Checkbox 
                              checked={isChecked}
                              onCheckedChange={() => toggleRepoSelection(repo)}
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        );
                      })
                  )}
              </div>
            </div>

            {/* Right Pane - Selected Repos */}
            <div className="flex-1 flex flex-col border border-border/10 rounded-xl overflow-hidden bg-secondary/5 shadow-sm relative">
              <div className="p-3 border-b border-border/10 bg-secondary/10">
                <span className="text-sm text-muted-foreground">{selectedRepos.length} checked</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {selectedRepos.length === 0 ? (
                  <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground text-center">
                    Nothing selected yet.
                  </div>
                ) : (
                  selectedRepos.map(repo => (
                    <div key={`selected-${repo.id}`} className="flex items-center justify-between p-2 rounded-md bg-background border border-border/10 shadow-sm">
                      <div className="flex items-center gap-2 overflow-hidden flex-1 pr-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${repo.private ? 'bg-orange-500' : 'bg-green-500'}`} />
                        <span className="font-medium text-sm truncate">{repo.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-60 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => toggleRepoSelection(repo)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>


          <div className="mt-2 border-t pt-4 pb-2 flex justify-end gap-2 z-10 bg-background">
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateMultipleProjects} disabled={selectedRepos.length === 0 || creatingProjects} className="min-w-[100px]">
                  {creatingProjects ? "Creating..." : "Import"}
              </Button>
          </div>
            </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <TaskAssignmentDrawer
        open={taskDrawerOpen}
        onOpenChange={setTaskDrawerOpen}
        project={selectedProjectForTask ? { id: getProjectId(selectedProjectForTask), name: selectedProjectForTask.name } : null}
        taskName={taskName}
        onTaskNameChange={setTaskName}
        taskDescription={taskDescription}
        onTaskDescriptionChange={setTaskDescription}
        activeCollaborators={activeCollaborators}
        availableTeamMembers={availableTeamMembers}
        selectedUserId={selectedAssigneeId}
        onSelectUser={handleSelectAssignee}
        onInviteCollaborator={handleInviteCollaborator}
        onSubmit={handleSubmitTaskAssignment}
        isSubmitting={assigningTask}
        isLoadingUsers={loadingAssignableUsers}
        isInvitingCollaborator={invitingCollaborator}
        githubAppNotInstalled={githubAppNotInstalled}
      />
    </div>
  );
};

export default Workspace;

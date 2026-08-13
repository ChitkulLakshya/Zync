/**
 * @fileoverview MyProjectsView.tsx
 * @module MyProjectsView
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
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, GitCommit, Search, ExternalLink, Calendar, GitPullRequest, Box, RefreshCw, Star, GitFork, Link as LinkIcon } from 'lucide-react';
import { Github } from '@/components/ui/GithubIcon';;
import { format, parseISO } from "date-fns";
import { API_BASE_URL } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { GithubAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/hooks/useMe";
import { useGitHubRepos } from "@/hooks/useGitHubData";
import { useProjects } from "@/hooks/useProjects";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Go: "#00ADD8",
  Rust: "#dea584",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Shell: "#89e051",
  Lua: "#000080",
  Jupyter: "#DA5B0B",
  "Jupyter Notebook": "#DA5B0B",
};

const MyProjectsView = ({ currentUser }: { currentUser: any }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: userData, isLoading: userLoading } = useMe();
  const isConnected = userData?.githubIntegration?.connected;

  const { data: projects = [] } = useProjects();
  const [editingRepo, setEditingRepo] = useState<any>(null);
  const [editForm, setEditForm] = useState({ description: '', homepage: '', topics: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [page, setPage] = useState(1);
  const { 
    data: reposData, 
    isLoading: reposLoading 
  } = useGitHubRepos(!!isConnected, page);

  const repos = reposData?.repos || [];
  const hasNextPage = reposData?.hasNextPage || false;

  const loading = userLoading || reposLoading;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [cardsPerRow, setCardsPerRow] = useState<3 | 4 | 5>(() => {
    const saved = localStorage.getItem("zync-projects-cards-per-row");
    if (saved === "4") { return 4; }
    if (saved === "5") { return 5; }
    return 3;
  });

  const [connecting, setConnecting] = useState(false);

  const gridColsClass =
    cardsPerRow === 5
      ? "xl:grid-cols-5"
      : cardsPerRow === 4
        ? "xl:grid-cols-4"
        : "xl:grid-cols-3";

  const cardsPerRowIndex = cardsPerRow === 3 ? 0 : cardsPerRow === 4 ? 1 : 2;
  const cardsPerRowFromIndex = (index: number): 3 | 4 | 5 => {
    if (index <= 0) { return 3; }
    if (index === 1) { return 4; }
    return 5;
  };

  const handleCardsPerRowChange = (next: 3 | 4 | 5) => {
    setCardsPerRow(next);
    localStorage.setItem("zync-projects-cards-per-row", String(next));
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const provider = new GithubAuthProvider();
      provider.addScope('repo');
      provider.addScope('read:user');

      const result = await signInWithPopup(auth, provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken;

      if (githubToken && result.user) {
        const firebaseToken = await result.user.getIdToken();
        await fetch(`${API_BASE_URL}/api/github/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${firebaseToken}` },
          body: JSON.stringify({ accessToken: githubToken, username: result.user.displayName || 'unknown' })
        });

        toast({ title: "GitHub Connected!", description: "Your repositories are now linked." });


        queryClient.invalidateQueries({ queryKey: ['me'] });
        queryClient.invalidateQueries({ queryKey: ['github'] });
      }
    } catch (error: any) {
      console.error("GitHub connect error:", error);
      toast({ title: "Connection Failed", description: error.message || "Could not connect to GitHub.", variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const getFilteredAndSortedRepos = (filterType: string) => {
    let result = repos.filter(repo => {

      if (filterType === "all") { return true; }
      if (filterType === "workspace") { return projects.some((p: any) => p.githubRepoName === repo.name && p.githubRepoOwner === repo.owner.login); }
      if (filterType === "collaborator") { return userData?.githubIntegration?.username && repo.owner.login !== userData.githubIntegration.username; }
      return repo.visibility === filterType;
    });


    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(lower) ||
        r.description?.toLowerCase().includes(lower) ||
        r.language?.toLowerCase().includes(lower)
      );
    }


    result.sort((a, b) => {
      if (sortBy === "stars") { return b.stargazers_count - a.stargazers_count; }
      if (sortBy === "forks") { return b.forks_count - a.forks_count; }
      if (sortBy === "name") { return a.name.localeCompare(b.name); }

      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return result;
  };

  if (!userData) {
    if (!userLoading) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-4">
           <h2 className="text-xl font-bold">Session Error</h2>
           <p className="text-muted-foreground">Your user profile could not be found in the database. Please log out and log back in to restore your session.</p>
        </div>
      );
    }
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading GitHub projects…</div>
    );
  }


  if (!isConnected) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="rounded-2xl border border-border/10 bg-card/50 backdrop-blur-xl p-8">
          <Github className="h-16 w-16" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-bold">Link your GitHub Projects</h2>
          <p className="text-muted-foreground">
            Connect your GitHub account to access and manage your repositories directly within Zync.
          </p>
        </div>
        <Button size="lg" onClick={handleConnect} disabled={connecting} className="gap-2">
          {!connecting && <Github className="h-5 w-5" />}
          {connecting ? "Connecting..." : "Link GitHub Projects"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full p-6 md:p-8 space-y-8 h-full flex flex-col relative z-10 bg-transparent">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">

          <p className="text-muted-foreground">
            Manage your GitHub repositories and projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 bg-card/50 text-foreground border-border/10 backdrop-blur-md">
            <Github className="h-3 w-3" />
            Connected as {userData.githubIntegration?.username || "GitHub User"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            className="pl-9 bg-card/50 border-border/10 backdrop-blur-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] bg-card/50 border-border/10 backdrop-blur-md">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-card/50 border-border/10 backdrop-blur-xl">
            <SelectItem value="updated">Last Updated</SelectItem>
            <SelectItem value="stars">Most Stars</SelectItem>
            <SelectItem value="forks">Most Forks</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">Loading projects...</div>
      ) : (
        <Tabs defaultValue="all" className="w-full space-y-6">
          <div className="flex items-center justify-between gap-3">
            <TabsList className="bg-card/50 border border-border/10 backdrop-blur-md rounded-xl">
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="public">Public</TabsTrigger>
              <TabsTrigger value="private">Private</TabsTrigger>
              <TabsTrigger value="collaborator">Collaborators</TabsTrigger>
            </TabsList>

            <div className="hidden md:flex items-center rounded-full border border-border/10 bg-card/50 px-2 py-1 backdrop-blur-md">
              <div className="relative w-[60px] h-5">
                <div className="absolute left-[10px] right-[10px] top-1/2 h-px -translate-y-1/2 bg-foreground/20" />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-border/10 bg-foreground shadow-none transition-all duration-200"
                  style={{ left: `${4 + (cardsPerRowIndex * 20)}px` }}
                />
                {[0, 1, 2].map((index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Set ${cardsPerRowFromIndex(index)} columns`}
                    onClick={() => handleCardsPerRowChange(cardsPerRowFromIndex(index))}
                    className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/50 hover:bg-foreground transition-colors"
                    style={{ left: `${10 + (index * 20)}px` }}
                  />
                ))}
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={cardsPerRowIndex}
                  onChange={(e) => handleCardsPerRowChange(cardsPerRowFromIndex(Number(e.target.value)))}
                  className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                />
              </div>
            </div>
          </div>

          {["workspace", "all", "public", "private", "collaborator"].map((filterType) => {
            const displayRepos = getFilteredAndSortedRepos(filterType);

            return (
              <TabsContent key={filterType} value={filterType} className="mt-0">
                <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-8 pb-8`}>
                  {displayRepos.map((repo) => (
                    <Card key={repo.id} className="flex flex-col h-full min-h-[280px] bg-card/50 border-border/10 backdrop-blur-md hover:border-border/20 transition-all hover:bg-card/80 rounded-2xl">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <CardTitle className="text-xl md:text-2xl font-semibold truncate pr-2">
                            <a href={repo.html_url} target="_blank" rel="noreferrer" className="hover:underline">
                              {repo.name}
                            </a>
                          </CardTitle>
                          <Badge variant="secondary" className="capitalize text-sm font-normal px-3 py-1 bg-card/50 border border-border/10 text-foreground">
                            {repo.visibility}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
                            <AvatarFallback>{repo.owner.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {repo.owner.login}
                          </span>
                        </div>
                        <CardDescription className="line-clamp-3 text-base mt-2">
                          {repo.description || "No description provided"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 py-4">
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {repo.language && (
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || '#8b949e' }} />
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            {repo.stargazers_count}
                          </span>
                          <span className="flex items-center gap-2">
                            <GitFork className="h-4 w-4" />
                            {repo.forks_count}
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-4 border-t border-border/10 bg-transparent">
                        <div className="text-sm text-muted-foreground w-full flex justify-between items-center">
                          <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                          <div className="flex gap-2">
                            {(() => {
                              const linkedProject = projects.find((p: any) => p.githubRepoName === repo.name && p.githubRepoOwner === repo.owner.login);
                              if (linkedProject) {
                                return (
                                  <Button variant="default" size="sm" className="h-8" onClick={() => {
                                    navigate(`/dashboard/workspace/project/${linkedProject.id || linkedProject._id}`, {
                                      state: { from: '/dashboard/projects' },
                                    });
                                  }}>
                                    Open Workspace
                                  </Button>
                                );
                              }
                              return null;
                            })()}
                            {repo.owner.login === userData.githubIntegration.username && (
                               <Button variant="outline" size="sm" className="h-8 bg-card/50 text-foreground" onClick={() => {
                                 setEditingRepo(repo);
                                 setEditForm({
                                   description: repo.description || '',
                                   homepage: repo.homepage || '',
                                   topics: repo.topics?.join(', ') || ''
                                 });
                               }}>Edit Settings</Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={repo.html_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                  {displayRepos.length === 0 && (
                    <div className="col-span-full text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-4">
                        <Github className="h-12 w-12 text-muted-foreground/50" />
                        <h3 className="text-xl font-medium">No repositories found</h3>
                        <p>
                          {searchTerm
                            ? `No ${filterType} repositories match your search.`
                            : filterType === "all"
                              ? "It looks like you haven't created any repositories yet."
                              : `No ${filterType} repositories found.`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {isConnected && !loading && (repos.length > 0 || page > 1) && (
        <div className="flex justify-center items-center gap-4 py-8">
          <Button 
            variant="outline" 
            className="bg-card/50 border-border/10 backdrop-blur-md hover:bg-card/80 rounded-xl"
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm font-medium">Page {page}</span>
          <Button 
            variant="outline" 
            className="bg-card/50 border-border/10 backdrop-blur-md hover:bg-card/80 rounded-xl"
            disabled={!hasNextPage} 
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
      <Dialog open={!!editingRepo} onOpenChange={(open) => !open && setEditingRepo(null)}>
        <DialogContent className="sm:max-w-[425px] bg-card/90 backdrop-blur-xl border-border/10 text-foreground">
          {editingRepo && (
            <>
              <DialogHeader>
                <DialogTitle>Repository Settings</DialogTitle>
                <DialogDescription>
                  Update the settings for {editingRepo.name} on GitHub.
                </DialogDescription>
              </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Description (max 350 chars)</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={editForm.description}
                  maxLength={350}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Repository description..."
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Website URL</label>
                <Input
                  className="bg-background/50"
                  value={editForm.homepage}
                  onChange={(e) => setEditForm({ ...editForm, homepage: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Topics (comma separated, max 20)</label>
                <Input
                  className="bg-background/50"
                  value={editForm.topics}
                  onChange={(e) => setEditForm({ ...editForm, topics: e.target.value })}
                  placeholder="react, typescript, frontend"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRepo(null)} disabled={isSaving}>Cancel</Button>
              <Button disabled={isSaving} onClick={async () => {
                setIsSaving(true);
                try {
                  const topicsArray = editForm.topics.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                  const token = await auth.currentUser?.getIdToken();
                  const res = await fetch(`${API_BASE_URL}/api/github/repos/${editingRepo.owner.login}/${editingRepo.name}/settings`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      description: editForm.description,
                      homepage: editForm.homepage,
                      topics: topicsArray
                    })
                  });
                  if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Failed to update settings');
                  }
                  toast({ title: 'Success', description: 'Repository settings updated!' });
                  setEditingRepo(null);
                  queryClient.invalidateQueries({ queryKey: ['github'] });
                  queryClient.invalidateQueries({ queryKey: ['projects'] });
                } catch (err: any) {
                  toast({ title: 'Error', description: err.message, variant: 'destructive' });
                } finally {
                  setIsSaving(false);
                }
              }}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProjectsView;

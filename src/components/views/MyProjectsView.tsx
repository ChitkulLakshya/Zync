import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, GitCommit, Github, Search, ExternalLink, Calendar, GitPullRequest, Box, RefreshCw, Star, GitFork, Link as LinkIcon } from "lucide-react";
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

const MyProjectsView = ({ currentUser }: { currentUser: any }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: userData, isLoading: userLoading } = useMe();
  const isConnected = userData?.githubIntegration?.connected;

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

          {["all", "public", "private", "collaborator"].map((filterType) => {
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
                              <span className="w-3 h-3 rounded-full bg-primary" />
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={repo.html_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
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
    </div>
  );
};

export default MyProjectsView;

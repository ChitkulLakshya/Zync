/// <reference types="vite/client" />
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Github, Loader2, Link as LinkIcon, ExternalLink, Star, GitFork, Search } from "lucide-react";
import { API_BASE_URL } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MongoUser {
  uid: string;
  integrations?: {
    github?: {
      connected: boolean;
      username?: string;
    };
  };
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  visibility: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

const MyProjectsView = ({ currentUser }: { currentUser: any }) => {
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [userData, setUserData] = useState<MongoUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("updated");

  const { toast } = useToast();

  // Fetch full user data including integrations
  const fetchUserData = async () => {
    try {
      if (!currentUser?.uid) return;
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        // Silent failure or retry?
        console.warn("Failed to fetch user data for GitHub check");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  // Fetch Repositories
  useEffect(() => {
    const fetchRepos = async () => {
      if (userData?.integrations?.github?.connected) {
        setLoading(true);
        try {
          const token = await currentUser.getIdToken();
          const response = await fetch(`${API_BASE_URL}/api/github/repos`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setRepos(data.repos || data);
          } else {
            toast({
              title: "Error",
              description: "Failed to fetch repositories. Please try again.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error fetching repos:", error);
          toast({
            title: "Network Error",
            description: "Could not connect to GitHub API.",
            variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      }
    };

    if (userData) {
      fetchRepos();
    }
  }, [userData, currentUser, toast]);

  const handleConnect = () => {
    toast({
      title: "GitHub Connection",
      description: "Please sign out and sign in again with GitHub to connect your repositories, or check Settings.",
    });
  };

  const getFilteredAndSortedRepos = (filterType: string) => {
    let result = repos.filter(repo => {
      // Tab Filter
      if (filterType === "all") return true;
      if (filterType === "collaborator") return userData?.integrations?.github?.username && repo.owner.login !== userData.integrations.github.username;
      return repo.visibility === filterType;
    });

    // Search Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(lower) ||
        r.description?.toLowerCase().includes(lower) ||
        r.language?.toLowerCase().includes(lower)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "stars") return b.stargazers_count - a.stargazers_count;
      if (sortBy === "forks") return b.forks_count - a.forks_count;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      // Default: Updated
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return result;
  };

  if (!userData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = userData?.integrations?.github?.connected;

  if (!isConnected) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="rounded-full bg-secondary/30 p-8">
          <Github className="h-16 w-16" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-bold">Connect to GitHub</h2>
          <p className="text-muted-foreground">
            Link your GitHub account to access your repositories directly within ZYNC.
          </p>
        </div>
        <Button size="lg" onClick={handleConnect} className="gap-2">
          <Github className="h-5 w-5" />
          Connect GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">My Projects</h2>
          <p className="text-muted-foreground">
            Manage your GitHub repositories and projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
            <Github className="h-3 w-3" />
            Connected as {userData.integrations?.github?.username || "GitHub User"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Last Updated</SelectItem>
            <SelectItem value="stars">Most Stars</SelectItem>
            <SelectItem value="forks">Most Forks</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full space-y-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
            <TabsTrigger value="collaborator">Collaborators</TabsTrigger>
          </TabsList>

          {["all", "public", "private", "collaborator"].map((filterType) => {
            const displayRepos = getFilteredAndSortedRepos(filterType);

            return (
              <TabsContent key={filterType} value={filterType} className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-8">
                  {displayRepos.map((repo) => (
                    <Card key={repo.id} className="flex flex-col h-full hover:border-primary/50 transition-all hover:shadow-lg min-h-[280px]">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <CardTitle className="text-xl md:text-2xl font-semibold truncate pr-2">
                            <a href={repo.html_url} target="_blank" rel="noreferrer" className="hover:underline">
                              {repo.name}
                            </a>
                          </CardTitle>
                          <Badge variant="secondary" className="capitalize text-sm font-normal px-3 py-1">
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
                      <CardFooter className="pt-4 border-t bg-muted/10">
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
    </div>
  );
};

export default MyProjectsView;

/// <reference types="vite/client" />
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Loader2, Link as LinkIcon, ExternalLink, Star, GitFork } from "lucide-react";
import { API_BASE_URL } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
}

const VITE_GITHUB_CLIENT_ID = import.meta.env.VITE_VITE_GITHUB_CLIENT_ID;

const MyProjectsView = ({ currentUser }: { currentUser: any }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [userData, setUserData] = useState<MongoUser | null>(null); // Extended user data from MongoDB
  const { toast } = useToast();

  const code = searchParams.get("code");

  // Fetch full user data including integrations
  const fetchUserData = async () => {
    try {
      if (!currentUser?.uid) return;
      const token = await currentUser.getIdToken();
      // We assume there's an endpoint to get the full user profile or we use the generic one
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
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

  // Handle OAuth Callback
  useEffect(() => {
    const handleCallback = async () => {
      if (code && currentUser) {
        setConnecting(true);
        try {
          // Exchange code for token (force refresh to ensure validity)
          const token = await currentUser.getIdToken(true);
          const response = await fetch(`${API_BASE_URL}/api/github/callback`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ code })
          });

          const data = await response.json();

          if (!response.ok) throw new Error(data.message || "Failed to connect");

          toast({
            title: "GitHub Connected",
            description: `Successfully linked account: ${data.username}`,
          });

          // Refresh user data
          await fetchUserData();

          // Clear query params
          setSearchParams({});

        } catch (error: any) {
          console.error("Connection error:", error);
          toast({
            title: "Connection Failed",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setConnecting(false);
        }
      }
    };

    handleCallback();
  }, [code, currentUser]);

  // Fetch Repositories
  useEffect(() => {
    const fetchRepos = async () => {
      // user data integration check
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
            setRepos(data.repos || data); // Handle both wrapped and direct array
          } else {
            console.error("Failed to fetch repos");
          }
        } catch (error) {
          console.error("Error fetching repos:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (userData) {
      fetchRepos();
    }
  }, [userData]);


  const handleConnect = () => {
    // Generate GitHub OAuth URL
    // scope: repo,user
    const currentUrl = window.location.origin + "/dashboard/projects";
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${VITE_GITHUB_CLIENT_ID}&scope=repo,user&redirect_uri=${encodeURIComponent(currentUrl)}`;
    window.location.href = githubUrl;
  };

  if (!userData) { // Initial loading
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = userData?.integrations?.github?.connected;

  if (connecting) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h2 className="text-xl font-semibold">Linking your GitHub account...</h2>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="rounded-full bg-secondary/30 p-8">
          <Github className="h-16 w-16" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-bold">Connect to GitHub</h2>
          <p className="text-muted-foreground">
            Link your GitHub account to access your repositories directly within Zync.
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
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">My Projects</h2>
          <p className="text-muted-foreground">
            Manage your GitHub repositories and projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
            <Github className="h-3 w-3" />
            Connected as {userData.integrations.github.username}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-8">
          {repos.map((repo) => (
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
          {repos.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <div className="flex flex-col items-center gap-4">
                <Github className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-xl font-medium">No repositories found</h3>
                <p>It looks like you haven't created any repositories yet.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyProjectsView;

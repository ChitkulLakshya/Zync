import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Github } from 'lucide-react';
import { API_BASE_URL } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Repo {
  id: string;
  name: string;
  full_name: string;
}

export function RepositorySelector({ projectId, currentRepoIds = [] }: { projectId: string; currentRepoIds?: string[] }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const token = await import('@/lib/firebase').then(m => m.auth.currentUser?.getIdToken());
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/github/repos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (data.repos) {
        setRepos(data.repos);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error fetching repositories' });
    } finally {
      setLoading(false);
    }
  };

  const linkRepo = async () => {
    if (!selectedRepoId) return;
    setConnecting(true);
    try {
      const token = await import('@/lib/firebase').then(m => m.auth.currentUser?.getIdToken());
      
      const res = await fetch(`${API_BASE_URL}/api/link/link-repo`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ projectId, githubRepoId: selectedRepoId })
      });

      if (!res.ok) throw new Error('Failed to link');

      toast({ title: 'Success', description: 'Repository linked! Listening for commits.' });
      setSelectedRepoId('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to link repository' });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1 space-y-2">
        <label className="text-sm font-medium">Link GitHub Repository</label>
        <Select value={selectedRepoId} onValueChange={setSelectedRepoId} disabled={loading}>
          <SelectTrigger>
             <SelectValue placeholder={loading ? "Loading..." : "Select a repository"} />
          </SelectTrigger>
          <SelectContent>
            {repos.map(repo => (
              <SelectItem key={repo.id} value={repo.id}>
                {repo.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={linkRepo} disabled={!selectedRepoId || connecting}>
        {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
        Link
      </Button>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface MobileNewProjectProps {
  onProjectCreated?: (data: any) => void;
}

const MobileNewProject = ({ onProjectCreated }: MobileNewProjectProps) => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    if (!projectName.trim() || !projectDescription.trim()) {return;}
    setIsGenerating(true);
    try {
      const user = auth.currentUser;
      const ownerId = user ? user.uid : 'anonymous';
      const token = user ? await user.getIdToken() : '';

      const response = await fetch(`${API_BASE_URL}/api/generate-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: projectName, description: projectDescription, ownerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate project');
      }

      const data = await response.json();
      toast({ title: 'Project Created!', description: 'Your new project is ready.' });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      sessionStorage.setItem('newlyCreatedProjectId', data._id || data.id);

      if (onProjectCreated) {
        onProjectCreated(data);
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({ title: 'Generation Failed', description: error.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0 border-b border-border/10">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-semibold text-lg">New Project</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Create with AI</h1>
          <p className="text-sm text-muted-foreground">
            Describe your idea and we'll generate the architecture and tasks.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Project Name</Label>
            <Input
              placeholder="e.g., E-commerce Platform"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">What are you building?</Label>
            <Textarea
              placeholder="Describe your project features, goals, and requirements…"
              className="min-h-[140px] resize-none rounded-xl"
              value={projectDescription}
              onChange={e => setProjectDescription(e.target.value)}
            />
          </div>
        </div>

        <Button
          className="w-full h-11 rounded-xl gap-2"
          onClick={handleGenerate}
          disabled={!projectName.trim() || !projectDescription.trim() || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Create Project
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MobileNewProject;

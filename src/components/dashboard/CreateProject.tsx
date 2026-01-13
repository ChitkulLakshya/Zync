import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface CreateProjectProps {
  onProjectCreated: (projectData: any) => void;
}

const CreateProject = ({ onProjectCreated }: CreateProjectProps) => {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!projectName || !projectDescription) return;

    setIsGenerating(true);

    try {
      const user = auth.currentUser;
      const ownerId = user ? user.uid : "anonymous";

      const response = await fetch(`${API_BASE_URL}/api/generate-project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          ownerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate project");
      }

      const data = await response.json();

      toast({
        title: "Project Generated!",
        description: "Your architecture and tasks are ready.",
      });

      onProjectCreated(data);

    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Zync</h1>
          <p className="text-muted-foreground text-lg">
            Let's turn your idea into a fully planned software project.
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>
              Describe your project, and our AI will generate the architecture and tasks for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Project Name
              </label>
              <Input
                placeholder="e.g., E-commerce Platform"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                What are you building?
              </label>
              <Textarea
                placeholder="Describe your project features, goals, and requirements..."
                className="min-h-[150px] resize-none"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!projectName || !projectDescription || isGenerating}
              className="w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Architecture...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Project Plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
          <div className="p-4 rounded-lg bg-secondary/50">
            <span className="block font-semibold text-foreground mb-1">Architecture</span>
            Auto-generated tech stack
          </div>
          <div className="p-4 rounded-lg bg-secondary/50">
            <span className="block font-semibold text-foreground mb-1">Workflow</span>
            Step-by-step development plan
          </div>
          <div className="p-4 rounded-lg bg-secondary/50">
            <span className="block font-semibold text-foreground mb-1">Tasks</span>
            Automated task breakdown
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;

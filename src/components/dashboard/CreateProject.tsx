import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

interface CreateProjectProps {
  onProjectCreated: (projectData: any) => void;
}

const CreateProject = ({ onProjectCreated }: CreateProjectProps) => {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!projectName || !projectDescription) return;
    
    setIsGenerating(true);
    
    // Simulate AI Generation
    setTimeout(() => {
      setIsGenerating(false);
      onProjectCreated({
        name: projectName,
        description: projectDescription,
        // Mock generated data
        architecture: {
          frontend: "React + Vite + Tailwind",
          backend: "Node.js + Express",
          database: "MongoDB"
        },
        tasks: [
          { id: 1, title: "Setup Project Structure", status: "pending" },
          { id: 2, title: "Configure Database", status: "pending" },
          { id: 3, title: "Implement Authentication", status: "pending" }
        ]
      });
    }, 2000);
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

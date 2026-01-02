import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { auth } from "@/lib/firebase"; // Assuming firebase auth is set up
import { API_BASE_URL } from "@/lib/utils";

const NewProject = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !description) {
      toast({
        title: "Missing fields",
        description: "Please fill in both project name and description.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;
      const ownerId = user ? user.uid : "anonymous"; // Fallback for dev

      const response = await fetch(`${API_BASE_URL}/api/projects/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          ownerId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate project");
      }

      const data = await response.json();
      
      toast({
        title: "Project Created!",
        description: "AI has generated your project architecture.",
      });

      navigate(`/projects/${data._id}`);

    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Something went wrong while generating the project.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b p-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-xl font-semibold">Create New Project</h1>
      </div>
      
      <div className="container mx-auto max-w-4xl py-10 px-6">
        <div className="grid gap-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Let's build something amazing</h2>
            <p className="text-muted-foreground mt-2 text-lg">
              Describe your project idea, and our AI will generate a complete architecture and development plan for you.
            </p>
          </div>

          <Card className="border-none shadow-none bg-transparent p-0">
            <CardContent className="p-0">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  <Label htmlFor="name" className="text-base">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., E-commerce Platform, Task Manager"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="h-12 text-lg"
                  />
                </div>
                
                <div className="space-y-4">
                  <Label htmlFor="description" className="text-base">Project Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your project in detail. What features does it have? Who is it for?"
                    className="min-h-[300px] text-lg p-4 resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" size="lg" className="px-8" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Architecture...
                      </>
                    ) : (
                      "Generate Project Plan"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewProject;

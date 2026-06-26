import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CreateProject from "@/components/dashboard/CreateProject";

const NewProject = () => {
  // What: Hook to access the React Router navigation function.
  // Why: We need this to programmatically navigate the user back to the previous page or forward to the newly created project.
  const navigate = useNavigate();

  return (
    // What: Main container for the new project page with full minimum height and background theme color.
    // Why: Ensures the page spans the entire viewport height and adheres to the app's aesthetic theme.
    <div className="min-h-screen bg-background">
      {/* What: Header section containing the back button and page title.
          Why: Provides context to the user and a clear way to cancel the creation process and return. */}
      <div className="border-b border-border/10 bg-background/50 backdrop-blur-xl p-4 flex items-center gap-4">
        {/* What: Button that navigates one step back in history when clicked.
            Why: An intuitive UI element for returning to the previous screen without using the browser back button. */}
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-xl font-semibold">Create New Project</h1>
      </div>

      {/* What: Content container with maximum width constraints and padding.
          Why: Centers the project creation form and ensures it doesn't stretch too wide on large screens. */}
      <div className="container mx-auto max-w-4xl py-10 px-6">
        {/* What: The main CreateProject form component.
            Why: Abstracts the complex form logic away from the page, passing a callback to navigate to the new project's ID once creation succeeds. */}
        <CreateProject onProjectCreated={(data) => navigate(`/projects/${data.id}`)} />
      </div>
    </div>
  );
};

export default NewProject;

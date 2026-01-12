import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CreateProject from "@/components/dashboard/CreateProject";

const NewProject = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b p-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-xl font-semibold">Create New Project</h1>
      </div>

      <div className="container mx-auto max-w-4xl py-10 px-6">
        <CreateProject onProjectCreated={(data) => navigate(`/projects/${data._id}`)} />
      </div>
    </div>
  );
};

export default NewProject;

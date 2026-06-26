// Imports the Link component from React Router to enable client-side navigation without full page reloads.
import { Link } from "react-router-dom";
// Imports a set of specific icons from the lucide-react library to visually enhance the feature list.
import { ArrowRight, CheckSquare, MessageSquare, CalendarDays, FolderKanban } from "lucide-react";
// Imports the standard button UI component for consistent styling and interactions.
import { Button } from "@/components/ui/button";
// Imports the Card layout components to structure the feature list items cleanly.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Defines an array of feature objects to dynamically render the "Why Zync" section on the mobile landing page.
const features = [
  {
    title: "Workspace",
    description: "Track projects and architecture in one place.",
    icon: FolderKanban,
  },
  {
    title: "Tasks",
    description: "Assign and monitor task progress quickly.",
    icon: CheckSquare,
  },
  {
    title: "Chat & Meet",
    description: "Collaborate with your team in real time.",
    icon: MessageSquare,
  },
  {
    title: "Calendar",
    description: "Stay aligned with deadlines and meetings.",
    icon: CalendarDays,
  },
];

// Defines the main functional component for the mobile landing/index page.
const IndexMobile = () => {
  return (
    // Wraps the entire page in a container with a transparent background, ensuring it fits the mobile viewport height.
    <div className="min-h-screen bg-transparent px-4 py-5">
      {/* Centers the content and limits its maximum width for optimal reading on phones. */}
      <div className="mx-auto w-full max-w-sm space-y-5">
        
        {/* Renders the top navigation bar containing the logo and login link. */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <>
                {/* Renders the white logo variant specifically for light mode, hiding it in dark mode. */}
                <img src="/zync-white.webp" alt="Zync" className="h-9 w-9 rounded-lg object-contain block dark:hidden" />
                {/* Renders the dark logo variant specifically for dark mode, hiding it in light mode. */}
                <img src="/zync-dark.webp" alt="Zync" className="h-9 w-9 rounded-lg object-contain hidden dark:block" />
            </>
            <span className="text-lg font-semibold text-foreground">Zync</span>
          </div>
          {/* Provides a quick link to the login page for returning users. */}
          <Link to="/login" className="text-sm text-foreground">
            Login
          </Link>
        </div>

        {/* Renders the primary hero section with the main call-to-action buttons. */}
        <section className="space-y-2.5">
          <h1 className="text-[30px] leading-tight font-bold tracking-tight text-foreground">
            Build Faster With Your Team
          </h1>
          <p className="text-sm text-muted-foreground">
            Planning, tasks, chat, notes, and progress in one mobile-ready workspace.
          </p>
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {/* Renders the primary signup button to encourage new user conversion. */}
            <Button asChild className="w-full">
              <Link to="/signup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {/* Renders a secondary button for users who might already be logged in to jump straight to their dashboard. */}
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard">Open Dashboard</Link>
            </Button>
          </div>
        </section>

        {/* Renders the feature list mapping over the pre-defined features array. */}
        <section className="space-y-2.5 pb-4">
          {features.map((feature) => {
            // Extracts the specific icon component for this feature.
            const Icon = feature.icon;
            return (
              // Wraps each feature in a Card component with a subtle glassmorphism effect (backdrop-blur).
              <Card key={feature.title} className="bg-card/50 backdrop-blur-xl border-border/10 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-foreground" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {feature.description}
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </div>
  );
};

// Exports the component as default for router integration.
export default IndexMobile;

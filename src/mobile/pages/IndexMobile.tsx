import { Link } from "react-router-dom";
import { ArrowRight, CheckSquare, MessageSquare, CalendarDays, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const IndexMobile = () => {
  return (
    <div className="min-h-screen bg-transparent px-4 py-5">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <>
                <img src="/zync-white.webp" alt="Zync" className="h-9 w-9 rounded-lg object-contain block dark:hidden" />
                <img src="/zync-dark.webp" alt="Zync" className="h-9 w-9 rounded-lg object-contain hidden dark:block" />
            </>
            <span className="text-lg font-semibold text-foreground">Zync</span>
          </div>
          <Link to="/login" className="text-sm text-foreground">
            Login
          </Link>
        </div>

        <section className="space-y-2.5">
          <h1 className="text-[30px] leading-tight font-bold tracking-tight text-foreground">
            Build Faster With Your Team
          </h1>
          <p className="text-sm text-muted-foreground">
            Planning, tasks, chat, notes, and progress in one mobile-ready workspace.
          </p>
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            <Button asChild className="w-full">
              <Link to="/signup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard">Open Dashboard</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-2.5 pb-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
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

export default IndexMobile;

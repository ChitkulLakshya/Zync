import { useState } from "react";
import {
    Home,
    Users,
    Calendar as CalendarIcon,
    FileText,
    CheckSquare,
    Video,
    Plus,
    FolderKanban,
    ArrowRight,
    Github,
    User
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * MobilePreview - A self-contained mobile mockup for the landing page.
 * Designed to match the actual Zync mobile app UI as closely as possible.
 */
const MobilePreview = () => {
    const [activeTab, setActiveTab] = useState("home");

    // Mock Projects (matching actual Workspace style)
    const mockProjects = [
        {
            id: 1,
            name: "Zync Dashboard",
            description: "Main dashboard with GitHub integration.",
            created: "Jan 15",
            owner: true,
            githubRepo: "zync-dashboard"
        },
        {
            id: 2,
            name: "Mobile App",
            description: "Cross-platform mobile application.",
            created: "Jan 10",
            owner: true,
            githubRepo: null
        },
    ];

    const mockTasks = [
        { id: 1, title: "Review PR #142", priority: "high", done: false },
        { id: 2, title: "Update docs", priority: "medium", done: true },
        { id: 3, title: "Fix calendar bug", priority: "low", done: false },
    ];

    const mockPeople = [
        { id: 1, name: "Alex Johnson", role: "Admin", status: "online", avatar: "AJ" },
        { id: 2, name: "Sarah Chen", role: "Developer", status: "online", avatar: "SC" },
        { id: 3, name: "Mike Wilson", role: "Designer", status: "away", avatar: "MW" },
    ];

    return (
        <div className="w-[280px] h-[560px] bg-background rounded-[2.5rem] border-4 border-foreground/10 shadow-2xl overflow-hidden flex flex-col relative">
            {/* Phone Notch */}
            <div className="bg-background pt-2 pb-1 flex justify-center">
                <div className="w-20 h-5 bg-foreground/10 rounded-full" />
            </div>

            {/* Header */}
            <header className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-background">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-xs">Z</span>
                    </div>
                    <span className="font-semibold text-sm">ZYNC</span>
                </div>
                <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">YU</AvatarFallback>
                </Avatar>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto pb-20">
                {activeTab === "home" && (
                    <div className="p-3 space-y-3">
                        {/* Header matching Workspace */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-foreground">My Workspace</h2>
                                <p className="text-[9px] text-muted-foreground">Your projects</p>
                            </div>
                            <Button size="sm" className="h-6 text-[9px] px-2">
                                <Plus className="w-3 h-3" />
                            </Button>
                        </div>

                        {/* Project Cards - Matching actual mobile Workspace */}
                        {mockProjects.map(project => (
                            <Card
                                key={project.id}
                                className="border-l-4 border-l-primary"
                            >
                                <CardHeader className="p-3 pb-2">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="text-[7px] px-1 py-0 h-3">Project</Badge>
                                        {project.owner && (
                                            <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3">Owner</Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-[11px] line-clamp-1">
                                        {project.name}
                                    </CardTitle>
                                    <CardDescription className="text-[8px] line-clamp-1">
                                        {project.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-3 pt-0">
                                    <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
                                        <CalendarIcon className="w-2.5 h-2.5" />
                                        <span>{project.created}</span>
                                        <User className="w-2.5 h-2.5 ml-2" />
                                        <span>You</span>
                                    </div>
                                    {project.githubRepo && (
                                        <div className="flex items-center gap-1 mt-1.5 p-1 bg-secondary/30 rounded text-[8px]">
                                            <Github className="w-2.5 h-2.5" />
                                            <span className="truncate">{project.githubRepo}</span>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="p-2 pt-1.5 border-t bg-secondary/10">
                                    <Button
                                        variant="ghost"
                                        className="flex-1 justify-between hover:bg-transparent px-0 text-primary h-4 text-[8px]"
                                    >
                                        View Architecture
                                        <ArrowRight className="w-2.5 h-2.5" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === "people" && (
                    <div className="p-3 space-y-3">
                        <h2 className="text-sm font-bold text-foreground">People</h2>
                        {mockPeople.map(person => (
                            <Card key={person.id} className="p-2.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="relative">
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{person.avatar}</AvatarFallback>
                                        </Avatar>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card ${person.status === "online" ? "bg-task-green" : "bg-task-yellow"
                                            }`} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-medium text-foreground">{person.name}</div>
                                        <div className="text-[8px] text-muted-foreground">{person.role}</div>
                                    </div>
                                    <Badge variant={person.status === "online" ? "default" : "secondary"} className="text-[7px] px-1 py-0">
                                        {person.status}
                                    </Badge>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === "calendar" && (
                    <div className="p-3 space-y-3">
                        <h2 className="text-sm font-bold text-foreground">January 2026</h2>
                        <Card className="p-2.5">
                            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                                    <div key={i} className="text-[8px] text-muted-foreground font-medium py-0.5">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5 text-center">
                                {[...Array(35)].map((_, i) => {
                                    const day = i - 3;
                                    const isToday = day === 19;
                                    const hasEvent = [5, 12, 19, 22].includes(day);
                                    return (
                                        <div
                                            key={i}
                                            className={`aspect-square flex flex-col items-center justify-center rounded text-[9px] ${day < 1 || day > 31 ? "text-muted-foreground/20" :
                                                    isToday ? "bg-primary text-primary-foreground font-medium" :
                                                        "text-foreground"
                                                }`}
                                        >
                                            {day >= 1 && day <= 31 && (
                                                <>
                                                    {day}
                                                    {hasEvent && !isToday && <div className="w-0.5 h-0.5 rounded-full bg-task-orange mt-0.5" />}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                        <Card className="p-2.5 border-l-2 border-l-task-orange">
                            <div className="text-[10px] font-medium text-foreground">Sprint Planning</div>
                            <div className="text-[8px] text-muted-foreground">Jan 22 · 10:00 AM</div>
                        </Card>
                    </div>
                )}

                {activeTab === "tasks" && (
                    <div className="p-3 space-y-3">
                        <h2 className="text-sm font-bold text-foreground">My Tasks</h2>
                        {mockTasks.map(task => (
                            <Card key={task.id} className={`p-2.5 ${task.done ? "opacity-60" : ""}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${task.done ? "bg-task-green border-task-green" : "border-muted-foreground/30"
                                        }`}>
                                        {task.done && <CheckSquare className="w-2 h-2 text-white" />}
                                    </div>
                                    <span className={`text-[10px] flex-1 ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                        {task.title}
                                    </span>
                                    <Badge variant={task.priority === "high" ? "destructive" : "secondary"} className="text-[7px] px-1 py-0">
                                        {task.priority}
                                    </Badge>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === "meet" && (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                            <Video className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Video Meetings</h3>
                        <p className="text-[9px] text-muted-foreground mb-3">Connect with your team</p>
                        <Button size="sm" className="text-[10px] h-7 px-3">
                            <Plus className="w-3 h-3 mr-1" /> New Meeting
                        </Button>
                    </div>
                )}
            </main>

            {/* Bottom Navigation - Matching actual mobile nav */}
            <nav className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/40 px-2 py-1.5">
                <div className="flex items-center justify-between">
                    {[
                        { id: "home", icon: Home, label: "Home" },
                        { id: "people", icon: Users, label: "People" },
                        { id: "calendar", icon: CalendarIcon, label: "Cal" },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center justify-center p-1 min-w-[36px] transition-colors ${activeTab === item.id ? "text-primary" : "text-muted-foreground"
                                }`}
                        >
                            <item.icon className="w-4 h-4" strokeWidth={activeTab === item.id ? 2.5 : 2} />
                            <span className="text-[7px] mt-0.5">{item.label}</span>
                        </button>
                    ))}

                    {/* Center FAB */}
                    <div className="relative -top-3">
                        <button className="w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center ring-2 ring-background">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {[
                        { id: "tasks", icon: CheckSquare, label: "Tasks" },
                        { id: "meet", icon: Video, label: "Meet" },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center justify-center p-1 min-w-[36px] transition-colors ${activeTab === item.id ? "text-primary" : "text-muted-foreground"
                                }`}
                        >
                            <item.icon className="w-4 h-4" strokeWidth={activeTab === item.id ? 2.5 : 2} />
                            <span className="text-[7px] mt-0.5">{item.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default MobilePreview;

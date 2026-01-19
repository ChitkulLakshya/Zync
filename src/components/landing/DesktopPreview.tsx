import { useState } from "react";
import {
    Home,
    FolderKanban,
    Calendar,
    CheckSquare,
    FileText,
    Clock,
    Users,
    Video,
    Settings,
    Star,
    Search,
    Bell,
    Plus,
    ChevronDown,
    ArrowRight,
    Github,
    Calendar as CalendarIcon,
    User
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    ContributionGraph,
    ContributionGraphBlock,
    ContributionGraphCalendar,
    ContributionGraphFooter,
    ContributionGraphLegend,
    ContributionGraphTotalCount,
} from "@/components/kibo-ui/contribution-graph";
import { eachDayOfInterval, formatISO } from "date-fns";

/**
 * DesktopPreview - A self-contained desktop mockup for the landing page.
 * Designed to match the actual Zync app UI as closely as possible.
 */
const DesktopPreview = () => {
    const [activeSection, setActiveSection] = useState("My Workspace");

    // Mock Projects (matching actual Workspace style)
    const mockProjects = [
        {
            id: 1,
            name: "Zync Dashboard",
            description: "Main dashboard application with GitHub integration and team collaboration features.",
            created: "Jan 15, 2026",
            owner: true,
            githubRepo: "ChitkulLakshya/zync-dashboard"
        },
        {
            id: 2,
            name: "Mobile App",
            description: "Cross-platform mobile application for iOS and Android.",
            created: "Jan 10, 2026",
            owner: true,
            githubRepo: null
        },
        {
            id: 3,
            name: "API Gateway",
            description: "Central API gateway for microservices architecture.",
            created: "Jan 5, 2026",
            owner: false,
            githubRepo: "team/api-gateway"
        },
    ];

    const sidebarItems = [
        { icon: Home, label: "Dashboard" },
        { icon: FolderKanban, label: "My Workspace" },
        { icon: Calendar, label: "Calendar" },
        { icon: Star, label: "Design" },
        { icon: CheckSquare, label: "Tasks" },
        { icon: FileText, label: "Notes" },
        { icon: Clock, label: "Activity" },
        { icon: Users, label: "People" },
        { icon: Video, label: "Meet" },
        { icon: Settings, label: "Settings" },
    ];

    // Generate deterministic mock data for Kibo UI graph
    const yearStart = new Date(2026, 0, 1);
    const yearEnd = new Date(2026, 11, 31);
    const days = eachDayOfInterval({ start: yearStart, end: yearEnd });

    const graphData = days.map((date) => {
        const dateStr = formatISO(date, { representation: "date" });
        // Deterministic random-like pattern based on date
        const dayNum = date.getDate() + date.getMonth() * 30;
        const seed = (dayNum * 17) % 100;
        const count = seed < 40 ? 0 : seed < 70 ? 2 : seed < 90 ? 5 : 12;
        // Calculate level based on count
        const level = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;
        return {
            date: dateStr,
            count,
            level,
        };
    });

    return (
        <div className="w-full aspect-[16/10] bg-background rounded-lg border border-border/50 overflow-hidden flex shadow-xl">
            {/* Sidebar - Using standard theme colors now */}
            <aside className="w-48 bg-muted/40 border-r border-border flex flex-col hidden md:flex shrink-0">
                {/* Logo */}
                <div className="p-3 border-b border-border h-12 flex items-center">
                    <div className="flex items-center px-1">
                        <img
                            src="/zync-dark.webp"
                            alt="Zync"
                            className="h-9 w-auto dark:hidden block"
                        />
                        <img
                            src="/zync-white.webp"
                            alt="Zync"
                            className="h-9 w-auto hidden dark:block"
                        />
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto custom-scrollbar">
                    {sidebarItems.map(item => (
                        <button
                            key={item.label}
                            onClick={() => setActiveSection(item.label)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${activeSection === item.label
                                ? "bg-secondary text-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                }`}
                        >
                            <item.icon className="w-3.5 h-3.5" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* User */}
                <div className="p-2 border-t border-border">
                    <div className="flex items-center gap-2 p-1.5 rounded-md hover:bg-secondary/50 cursor-pointer">
                        <Avatar className="w-6 h-6 border border-border">
                            <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">YU</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium text-foreground truncate">Your Name</div>
                            <div className="text-[9px] text-muted-foreground truncate">Premium</div>
                        </div>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background">
                {/* Top Bar */}
                <header className="h-10 border-b border-border/50 flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm">
                    <Input
                        placeholder="Search..."
                        className="h-6 w-36 text-[10px] bg-secondary/50 border-none"
                    />
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                            <Bell className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {activeSection === "My Workspace" && (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            {/* Header - Matching actual Workspace */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-bold tracking-tight text-foreground">My Workspace</h2>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Manage your AI-generated projects and assignments.
                                    </p>
                                </div>
                                <Button size="sm" className="h-7 text-[10px] gap-1 px-3">
                                    <Plus className="w-3 h-3" /> Add Project
                                </Button>
                            </div>

                            {/* Project Cards - Matching actual style */}
                            <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
                                {mockProjects.map(project => (
                                    <Card
                                        key={project.id}
                                        className="group hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-primary flex flex-col"
                                    >
                                        <CardHeader className="p-3 pb-2 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">Project</Badge>
                                                {project.owner && (
                                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">Owner</Badge>
                                                )}
                                            </div>
                                            <CardTitle className="text-xs font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                                                {project.name}
                                            </CardTitle>
                                            <CardDescription className="text-[10px] line-clamp-2 min-h-[30px]">
                                                {project.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-0 flex-1 flex flex-col justify-end">
                                            <div className="flex flex-col gap-1.5 text-[9px] text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarIcon className="w-3 h-3" />
                                                    <span>Created {project.created}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3" />
                                                    <span>{project.owner ? "By You" : "By Team Member"}</span>
                                                </div>
                                            </div>
                                            {project.githubRepo ? (
                                                <div className="flex items-center gap-1.5 mt-2.5 p-1.5 bg-secondary/30 rounded text-[9px] group/repo border border-transparent hover:border-border transition-colors">
                                                    <Github className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{project.githubRepo}</span>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full mt-2.5 h-7 text-[9px] gap-1.5 border-dashed"
                                                >
                                                    <Github className="w-3 h-3" />
                                                    Link GitHub
                                                </Button>
                                            )}
                                        </CardContent>
                                        <CardFooter className="p-2 border-t bg-secondary/10 mt-auto">
                                            <Button
                                                variant="ghost"
                                                className="flex-1 justify-between hover:bg-transparent px-1 text-primary h-6 text-[9px] w-full"
                                            >
                                                View Architecture
                                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeSection === "Dashboard" && (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            {/* GitHub Profile Card */}
                            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-14 w-14 border-2 border-background shadow-md">
                                            <AvatarFallback className="text-sm bg-primary/20 text-primary font-bold">GH</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold">Your GitHub</span>
                                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary">
                                                    <Github className="h-3 w-3 mr-1" />
                                                    @username
                                                </Badge>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1 max-w-sm line-clamp-1">
                                                Full stack developer passionate about building tools.
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-semibold text-foreground">128</span> followers
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-semibold text-foreground">45</span> repos
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Contribution Graph - Kibo UI */}
                            <Card className="p-4 overflow-hidden">
                                <ContributionGraph data={graphData} blockSize={9} blockMargin={2} blockRadius={1}>
                                    <div className="flex items-center justify-between mb-3">
                                        <ContributionGraphTotalCount className="text-xs font-semibold" />
                                        <span className="text-[10px] text-muted-foreground font-medium">2026</span>
                                    </div>

                                    {/* Container with overflow handling for the graph */}
                                    <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
                                        <ContributionGraphCalendar>
                                            {({ activity, dayIndex, weekIndex }) => (
                                                <ContributionGraphBlock
                                                    key={`${weekIndex}-${dayIndex}`}
                                                    activity={activity}
                                                    dayIndex={dayIndex}
                                                    weekIndex={weekIndex}
                                                />
                                            )}
                                        </ContributionGraphCalendar>
                                    </div>

                                    <ContributionGraphFooter className="mt-2 pt-2 border-t">
                                        <span className="text-[9px] text-muted-foreground">Learn how we count contributions</span>
                                        <ContributionGraphLegend className="scale-75 origin-right" />
                                    </ContributionGraphFooter>
                                </ContributionGraph>
                            </Card>
                        </div>
                    )}

                    {activeSection === "Calendar" && (
                        <div className="space-y-4 max-w-lg mx-auto">
                            <h2 className="text-base font-bold">Calendar</h2>
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium">January 2026</span>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-xs">←</Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-xs">→</Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {["S", "M", "T", "W", "T", "F", "S"].map(d => (
                                        <div key={d} className="text-[9px] text-muted-foreground font-medium">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center">
                                    {[...Array(35)].map((_, i) => {
                                        const day = i - 3;
                                        const isToday = day === 19;
                                        const hasEvent = [5, 12, 22].includes(day);
                                        return (
                                            <div
                                                key={i}
                                                className={`aspect-square flex flex-col items-center justify-center rounded text-[10px] cursor-pointer transition-colors ${day < 1 || day > 31 ? "text-muted-foreground/20" :
                                                    isToday ? "bg-primary text-primary-foreground font-medium" :
                                                        "text-foreground hover:bg-secondary"
                                                    }`}
                                            >
                                                {day >= 1 && day <= 31 && (
                                                    <>
                                                        {day}
                                                        {hasEvent && !isToday && <div className="w-1 h-1 rounded-full bg-task-orange mt-0.5" />}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeSection === "People" && (
                        <div className="space-y-4 max-w-2xl mx-auto">
                            <h2 className="text-base font-bold">People</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { name: "Alex Johnson", role: "Admin", status: "online", avatar: "AJ" },
                                    { name: "Sarah Chen", role: "Developer", status: "online", avatar: "SC" },
                                    { name: "Mike Wilson", role: "Designer", status: "away", avatar: "MW" },
                                    { name: "Emily Davis", role: "Developer", status: "offline", avatar: "ED" },
                                ].map(person => (
                                    <Card key={person.name} className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{person.avatar}</AvatarFallback>
                                                </Avatar>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card ${person.status === "online" ? "bg-task-green" : person.status === "away" ? "bg-task-yellow" : "bg-muted"
                                                    }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-medium text-foreground">{person.name}</div>
                                                <div className="text-[9px] text-muted-foreground">{person.role}</div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Default for other sections */}
                    {!["My Workspace", "Dashboard", "Calendar", "People"].includes(activeSection) && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-10 h-10 bg-secondary/50 rounded-full flex items-center justify-center mb-2">
                                {sidebarItems.find(i => i.label === activeSection)?.icon && (
                                    (() => {
                                        const Icon = sidebarItems.find(i => i.label === activeSection)!.icon;
                                        return <Icon className="w-5 h-5 text-muted-foreground" />;
                                    })()
                                )}
                            </div>
                            <h3 className="text-xs font-semibold text-foreground">{activeSection}</h3>
                            <p className="text-[10px] text-muted-foreground mt-1">This module is part of the Zync ecosystem.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DesktopPreview;

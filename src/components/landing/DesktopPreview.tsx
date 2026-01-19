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
        <div className="w-full aspect-[16/10] bg-background rounded-lg border border-border/50 overflow-hidden flex shadow-2xl relative">
            {/* Sidebar - Matching actual app */}
            <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col hidden md:flex shrink-0">
                {/* Logo */}
                <div className="p-4 border-b border-sidebar-border h-14 flex items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                            <span className="text-primary-foreground font-bold text-sm">Z</span>
                        </div>
                        <span className="font-bold text-sidebar-foreground text-sm tracking-tight">ZYNC</span>
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto custom-scrollbar">
                    {sidebarItems.map(item => (
                        <button
                            key={item.label}
                            onClick={() => setActiveSection(item.label)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${activeSection === item.label
                                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                }`}
                        >
                            <item.icon className={`w-4 h-4 ${activeSection === item.label ? "text-sidebar-primary" : "opacity-70"}`} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* User */}
                <div className="p-3 border-t border-sidebar-border">
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-accent/50 cursor-pointer transition-colors">
                        <Avatar className="w-7 h-7 border border-sidebar-border/50">
                            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">YU</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-sidebar-foreground truncate">Your Name</div>
                            <div className="text-[10px] text-sidebar-foreground/50 truncate">Premium Plan</div>
                        </div>
                        <ChevronDown className="w-3 h-3 text-sidebar-foreground/50" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background relative z-0">
                {/* Top Bar */}
                <header className="h-14 border-b border-border/50 flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="h-9 w-64 pl-9 bg-secondary/50 border-none text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-4 w-px bg-border/50 mx-1" />
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                            <Bell className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground md:hidden">
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
                    {activeSection === "My Workspace" && (
                        <div className="space-y-6 max-w-6xl mx-auto">
                            {/* Header - Matching actual Workspace */}
                            <div className="flex items-center justify-between animate-fade-in-up">
                                <div>
                                    <h2 className="text-3xl font-bold tracking-tight text-foreground">My Workspace</h2>
                                    <p className="text-muted-foreground mt-1">
                                        Manage your AI-generated projects and assignments.
                                    </p>
                                </div>
                                <Button size="default" className="gap-2 shadow-sm font-medium">
                                    <Plus className="w-4 h-4" /> Add Project
                                </Button>
                            </div>

                            {/* Project Cards - Matching actual style */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {mockProjects.map(project => (
                                    <Card
                                        key={project.id}
                                        className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-primary flex flex-col animate-scale-in"
                                    >
                                        <CardHeader className="pb-3 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <Badge variant="outline" className="font-normal py-0.5">Project</Badge>
                                                {project.owner && (
                                                    <Badge variant="secondary" className="font-normal py-0.5">Owner</Badge>
                                                )}
                                            </div>
                                            <CardTitle className="text-xl font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                                                {project.name}
                                            </CardTitle>
                                            <CardDescription className="text-sm line-clamp-2 min-h-[40px]">
                                                {project.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pb-3 flex-1 flex flex-col justify-end">
                                            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="w-4 h-4" />
                                                    <span>Created {project.created}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4" />
                                                    <span>{project.owner ? "By You" : "By Team Member"}</span>
                                                </div>
                                            </div>
                                            {project.githubRepo ? (
                                                <div className="flex items-center gap-2 mt-4 p-2.5 bg-secondary/30 rounded-md text-xs group/repo max-w-full border border-transparent hover:border-border transition-colors">
                                                    <Github className="w-4 h-4 flex-shrink-0" />
                                                    <span className="truncate font-medium">{project.githubRepo}</span>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full mt-4 h-9 gap-2 border-dashed text-muted-foreground hover:text-foreground"
                                                >
                                                    <Github className="w-4 h-4" />
                                                    Link GitHub
                                                </Button>
                                            )}
                                        </CardContent>
                                        <CardFooter className="pt-3 border-t bg-secondary/10 mt-auto">
                                            <div
                                                className="flex items-center justify-between w-full text-sm font-medium text-primary cursor-pointer group/btn"
                                            >
                                                View Architecture
                                                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                            </div>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeSection === "Dashboard" && (
                        <div className="space-y-6 max-w-5xl mx-auto">
                            {/* GitHub Profile Card */}
                            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative animate-fade-in-up">
                                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                                <CardContent className="p-8 relative">
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                                        <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                                            <AvatarFallback className="text-2xl bg-primary/20 font-bold text-primary">GH</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-2 text-center sm:text-left">
                                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                                <h1 className="text-3xl font-bold">Your GitHub</h1>
                                                <Badge variant="secondary" className="px-2.5 py-0.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer">
                                                    <Github className="h-3.5 w-3.5 mr-1.5" />
                                                    @username
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground text-base max-w-lg">
                                                Full stack developer passionate about building tools that help people work better together.
                                            </p>
                                            <div className="flex items-center justify-center sm:justify-start gap-6 mt-4 pt-2">
                                                <div className="flex items-center gap-2">
                                                    <strong className="text-lg">128</strong>
                                                    <span className="text-muted-foreground">followers</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <strong className="text-lg">45</strong>
                                                    <span className="text-muted-foreground">repos</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Contribution Graph - Kibo UI */}
                            <Card className="p-6 animate-fade-in-up animate-delay-100">
                                <ContributionGraph data={graphData} blockSize={12} blockMargin={3} blockRadius={2}>
                                    <div className="flex items-center justify-between mb-6">
                                        <ContributionGraphTotalCount className="text-base font-semibold" />
                                        <span className="text-sm text-muted-foreground font-medium">2026</span>
                                    </div>

                                    {/* Container with overflow handling for the graph */}
                                    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
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

                                    <ContributionGraphFooter className="mt-4 pt-4 border-t">
                                        <span className="text-xs text-muted-foreground">Learn how we count contributions</span>
                                        <ContributionGraphLegend className="scale-100 origin-right" />
                                    </ContributionGraphFooter>
                                </ContributionGraph>
                            </Card>
                        </div>
                    )}

                    {activeSection === "Calendar" && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <h2 className="text-2xl font-bold">Calendar</h2>
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-lg font-semibold">January 2026</span>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8">←</Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">→</Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-2 text-center mb-4">
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                                        <div key={d} className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-2 text-center">
                                    {[...Array(35)].map((_, i) => {
                                        const day = i - 3;
                                        const isToday = day === 19;
                                        const hasEvent = [5, 12, 22].includes(day);
                                        return (
                                            <div
                                                key={i}
                                                className={`aspect-square flex flex-col items-center justify-center rounded-md text-sm cursor-pointer transition-all duration-200 ${day < 1 || day > 31 ? "text-muted-foreground/20" :
                                                    isToday ? "bg-primary text-primary-foreground font-medium shadow-md scale-105" :
                                                        "text-foreground hover:bg-secondary hover:scale-105"
                                                    }`}
                                            >
                                                {day >= 1 && day <= 31 && (
                                                    <>
                                                        {day}
                                                        {hasEvent && !isToday && <div className="w-1.5 h-1.5 rounded-full bg-task-orange mt-1.5" />}
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
                        <div className="space-y-6 max-w-4xl mx-auto">
                            <h2 className="text-2xl font-bold">People</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { name: "Alex Johnson", role: "Admin", status: "online", avatar: "AJ" },
                                    { name: "Sarah Chen", role: "Developer", status: "online", avatar: "SC" },
                                    { name: "Mike Wilson", role: "Designer", status: "away", avatar: "MW" },
                                    { name: "Emily Davis", role: "Developer", status: "offline", avatar: "ED" },
                                ].map(person => (
                                    <Card key={person.name} className="p-4 hover:shadow-md transition-all cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar className="w-12 h-12 border-2 border-background shadow-sm group-hover:border-primary/20 transition-colors">
                                                    <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">{person.avatar}</AvatarFallback>
                                                </Avatar>
                                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${person.status === "online" ? "bg-task-green" : person.status === "away" ? "bg-task-yellow" : "bg-muted"
                                                    }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-base font-semibold text-foreground">{person.name}</div>
                                                <div className="text-sm text-muted-foreground">{person.role}</div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Settings className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Default for other sections */}
                    {!["My Workspace", "Dashboard", "Calendar", "People"].includes(activeSection) && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center animate-pulse">
                                {sidebarItems.find(i => i.label === activeSection)?.icon && (
                                    (() => {
                                        const Icon = sidebarItems.find(i => i.label === activeSection)!.icon;
                                        return <Icon className="w-10 h-10 text-muted-foreground/50" />;
                                    })()
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-foreground">{activeSection}</h3>
                                <p className="text-muted-foreground mt-2">This module is part of the Zync ecosystem.</p>
                            </div>
                            <Button variant="outline" className="mt-4">
                                Explore Features
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DesktopPreview;

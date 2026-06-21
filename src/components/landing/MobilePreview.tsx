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
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";


const MobilePreview = () => {
    const [activeTab, setActiveTab] = useState("home");
    const [hasInteracted, setHasInteracted] = useState(false);


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

    const mockNotes = [
        { id: 1, title: "Project Requirements", date: "2h ago" },
        { id: 2, title: "Meeting Minutes", date: "Yesterday" },
        { id: 3, title: "Design Ideas", date: "Jan 12" },
    ];

    return (
        <div 
            className="relative mx-auto bg-black border-[#d4d4d8] dark:border-[#27272a] border-4 p-1.5 rounded-[3rem] h-[650px] w-[300px] shadow-[0_24px_80px_rgba(0,0,0,0.15)] ring-1 ring-black/5 dark:ring-white/10"
            onPointerDown={() => setHasInteracted(true)}
        >
            {/* Dynamic Island (iPhone 16/17 Pro Max) */}
            <div className="w-[90px] h-[26px] bg-black top-[12px] rounded-full left-1/2 -translate-x-1/2 absolute z-30 flex items-center justify-between px-2.5">
                <div className="w-[8px] h-[8px] rounded-full bg-[#111] shadow-inner border border-white/10 flex items-center justify-center">
                    <div className="w-[3px] h-[3px] rounded-full bg-blue-500/40" />
                </div>
                <div className="w-[8px] h-[8px] rounded-full bg-[#111] shadow-inner border border-white/10" />
            </div>
            
            {/* Titanium Side Buttons */}
            {/* Action Button */}
            <div className="h-[22px] w-[3px] bg-[#a1a1aa] dark:bg-[#3f3f46] absolute -left-[7px] top-[95px] rounded-l-md"></div>
            {/* Volume Up */}
            <div className="h-[42px] w-[3px] bg-[#a1a1aa] dark:bg-[#3f3f46] absolute -left-[7px] top-[135px] rounded-l-md"></div>
            {/* Volume Down */}
            <div className="h-[42px] w-[3px] bg-[#a1a1aa] dark:bg-[#3f3f46] absolute -left-[7px] top-[190px] rounded-l-md"></div>
            {/* Power Button */}
            <div className="h-[64px] w-[3px] bg-[#a1a1aa] dark:bg-[#3f3f46] absolute -right-[7px] top-[160px] rounded-r-md"></div>
            
            {/* Screen Content */}
            <div className="rounded-[2.6rem] overflow-hidden w-full h-full bg-background flex flex-col relative shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">

                {/* Header */}
                <header className="flex items-center justify-between px-5 pt-12 pb-3 border-b border-border/10 bg-background/60 backdrop-blur-md z-10 relative">
                    <div className="flex items-center">
                        <>
                            <img
                                src="/zync-white.webp"
                                alt="Zync"
                                className="h-8 w-auto rounded-lg block dark:hidden"
                            />
                            <img
                                src="/zync-dark.webp"
                                alt="Zync"
                                className="h-8 w-auto rounded-lg hidden dark:block"
                            />
                        </>
                    </div>
                    <Avatar className="w-6 h-6 border-0">
                        <AvatarFallback className="text-[10px] bg-foreground text-background">YU</AvatarFallback>
                    </Avatar>
                </header>

                {}
                <main className="flex-1 overflow-y-auto pb-20">
                    {activeTab === "home" && (
                        <div className="p-3 space-y-3">
                            {}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-bold text-foreground">My Workspace</h2>
                                    <p className="text-[9px] text-muted-foreground">Your projects</p>
                                </div>
                                <Button size="sm" className="h-6 text-[9px] px-2">
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>

                            {mockProjects.map(project => (
                                <Card
                                    key={project.id}
                                    className="bg-secondary/5 border-border/10 rounded-2xl overflow-hidden"
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
                                    <CardFooter className="p-2 pt-1.5 border-t border-border/10 bg-secondary/5">
                                        <Button
                                            variant="ghost"
                                            className="flex-1 justify-between hover:bg-transparent px-0 text-foreground h-4 text-[8px]"
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
                                <Card key={person.id} className="p-2.5 bg-secondary/5 border-border/10 rounded-2xl">
                                    <div className="flex items-center gap-2.5">
                                        <div className="relative">
                                            <Avatar className="w-8 h-8">
                                                <AvatarFallback className="text-[9px] bg-foreground/5 text-foreground">{person.avatar}</AvatarFallback>
                                            </Avatar>
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background ${person.status === "online" ? "bg-task-green" : "bg-task-yellow"
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
                            <Card className="p-2.5 bg-secondary/5 border-border/10 rounded-2xl">
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
                                                    isToday ? "bg-primary text-foreground-foreground font-medium" :
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
                            <Card className="p-2.5 bg-secondary/5 border-border/10 rounded-2xl flex items-center gap-3">
                                <div className="w-1 h-8 bg-task-orange rounded-full" />
                                <div>
                                    <div className="text-[10px] font-medium text-foreground">Sprint Planning</div>
                                    <div className="text-[8px] text-muted-foreground">Jan 22 · 10:00 AM</div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === "notes" && (
                        <div className="p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-foreground">Notes</h2>
                                <Button size="sm" className="h-6 text-[9px] px-2">
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                            {mockNotes.map(note => (
                                <Card key={note.id} className="p-2.5 bg-secondary/5 border-border/10 rounded-2xl">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-foreground border border-border/10">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-medium text-foreground">{note.title}</div>
                                            <div className="text-[8px] text-muted-foreground">{note.date}</div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {activeTab === "tasks" && (
                        <div className="p-3 space-y-3">
                            <h2 className="text-sm font-bold text-foreground">My Tasks</h2>
                            {mockTasks.map(task => (
                                <Card key={task.id} className={`p-2.5 bg-secondary/5 border-border/10 rounded-2xl ${task.done ? "opacity-60" : ""}`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${task.done ? "bg-foreground border-foreground" : "border-muted-foreground/30"
                                            }`}>
                                            {task.done && <CheckSquare className="w-2 h-2 text-background" />}
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
                            <div className="w-12 h-12 bg-secondary/20 border border-border/10 rounded-full flex items-center justify-center mb-3">
                                <Video className="w-6 h-6 text-foreground" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground mb-1">Video Meetings</h3>
                            <p className="text-[9px] text-muted-foreground mb-3">Connect with your team</p>
                            <Button size="sm" className="text-[10px] h-7 px-3">
                                <Plus className="w-3 h-3 mr-1" /> New Meeting
                            </Button>
                        </div>
                    )}
                </main>

                {/* Bottom Navigation */}
                <nav className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/10 px-2 py-1.5">
                    <div className="flex items-center justify-between">
                        {[
                            { id: "home", icon: Home, label: "Home" },
                            { id: "people", icon: Users, label: "People" },
                            { id: "calendar", icon: CalendarIcon, label: "Cal" },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex flex-col items-center justify-center p-1 min-w-[36px] transition-colors ${activeTab === item.id ? "text-foreground" : "text-muted-foreground"
                                    }`}
                            >
                                <item.icon className="w-4 h-4" strokeWidth={activeTab === item.id ? 2.5 : 2} />
                                <span className="text-[7px] mt-0.5">{item.label}</span>
                            </button>
                        ))}

                        <div className="relative -top-3">
                            <button className="w-9 h-9 rounded-full bg-foreground text-background shadow-lg flex items-center justify-center ring-2 ring-background">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {[
                            { id: "notes", icon: FileText, label: "Notes" },
                            { id: "tasks", icon: CheckSquare, label: "Tasks" },
                            { id: "meet", icon: Video, label: "Meet" },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex flex-col items-center justify-center p-1 min-w-[36px] transition-colors ${activeTab === item.id ? "text-foreground" : "text-muted-foreground"
                                    }`}
                            >
                                <item.icon className="w-4 h-4" strokeWidth={activeTab === item.id ? 2.5 : 2} />
                                <span className="text-[7px] mt-0.5">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>
            </div>
            
            {/* Floating Interactive Badge (Disappears on interaction) */}
            <AnimatePresence>
                {!hasInteracted && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 20 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        className="absolute bottom-22 -left-30 z-[100] px-5 py-2.5 rounded-full bg-surface-glass-regular backdrop-blur-thick border border-black/10 dark:border-white/10 shadow-elevation3 flex items-center gap-2 pointer-events-none whitespace-nowrap"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span className="text-[11px] font-semibold tracking-wide text-foreground/90 shadow-sm">
                            Interactive Preview
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MobilePreview;

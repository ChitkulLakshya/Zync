import React from "react";
import { ArrowRight, MessageSquare, FolderKanban, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const DashboardHome = ({ onNavigate }: { onNavigate: (section: string) => void }) => {
    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
            {/* Content Container */}
            <div className="relative z-10 max-w-5xl w-full flex flex-col items-center text-center space-y-12">

                {/* Header Content */}
                <div className="space-y-6">
                    {/* Logo/Brand */}
                    <div className="flex items-center justify-center gap-2 mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "0ms", animationFillMode: "forwards" }}>
                        <span className="text-xl font-bold tracking-widest uppercase">ZYNC</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent pb-2 opacity-0 animate-fade-in-up" style={{ animationDelay: "150ms", animationFillMode: "forwards" }}>
                        Unified Workspace for <br />
                        High-Performance Teams
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
                        Connect, Collaborate, and Conquer projects with Zync's all-in-one platform.
                        Chat, Video, Tasks, and Calendar in a single interface.
                    </p>

                    <div className="pt-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "500ms", animationFillMode: "forwards" }}>
                        <Button
                            size="lg"
                            className="rounded-full px-8 py-6 text-base font-medium bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                            onClick={() => onNavigate("Dashboard")}
                        >
                            Get started
                        </Button>
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "700ms", animationFillMode: "forwards" }}>
                    {/* Card 1 */}
                    <div className="group relative p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent hover:from-white/20 transition-all duration-300">
                        <div className="h-full bg-zinc-950/80 backdrop-blur-md rounded-xl p-8 flex flex-col items-start border border-white/5 hover:border-white/10 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Real-Time Collaboration</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed">
                                Instant messaging and file sharing to keep everyone in sync. Never miss a beat with live updates.
                            </p>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="group relative p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent hover:from-white/20 transition-all duration-300">
                        <div className="h-full bg-zinc-950/80 backdrop-blur-md rounded-xl p-8 flex flex-col items-start border border-white/5 hover:border-white/10 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400">
                                <FolderKanban className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Project Management</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed">
                                Kanban-style task tracking to streamline workflows. Bridge the gap between planning and execution.
                            </p>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="group relative p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent hover:from-white/20 transition-all duration-300">
                        <div className="h-full bg-zinc-950/80 backdrop-blur-md rounded-xl p-8 flex flex-col items-start border border-white/5 hover:border-white/10 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-400">
                                <Globe className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Seamless Integration</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed">
                                Video calls and Calendar synced for effortless scheduling. Automated git operations included.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;

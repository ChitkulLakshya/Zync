import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Terminal, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GitCommandsDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: {
        id: string; // The DB ID or functional ID
        title: string;
        _id?: string; // The real ID used for tagging
        projectName?: string;
    } | null;
    project: {
        githubRepoOwner?: string;
        githubRepoName?: string;
    } | null;
}

const CommandBlock = ({ label, command, stepNumber }: { label: string, command: string, stepNumber: number }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(command);
        setCopied(true);
        toast.success("Command copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="group relative pl-6 pb-8 last:pb-0">
            {/* Timeline Line */}
            <div className="absolute left-[11px] top-7 bottom-0 w-px bg-border/20 group-last:hidden" />

            {/* Step Number Bubble */}
            <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-background border border-border/50 flex items-center justify-center text-[10px] font-mono text-muted-foreground z-10 shadow-sm">
                {stepNumber}
            </div>

            <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground tracking-tight">{label}</span>
            </div>

            <div
                className={cn(
                    "relative overflow-hidden rounded-md bg-[#0d0d0d] border border-white/5 shadow-2xl transition-all duration-200 group-hover:border-white/10",
                    "font-mono text-xs text-blue-200"
                )}
            >
                {/* Mac-style Window Dots (Decoration) */}
                <div className="absolute top-3 left-3 flex gap-1.5 opacity-50">
                    <div className="w-2 h-2 rounded-full bg-red-500/20" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                    <div className="w-2 h-2 rounded-full bg-green-500/20" />
                </div>

                <div className="p-4 pt-8 overflow-x-auto">
                    <span className="text-green-500 mr-2">$</span>
                    {command}
                </div>

                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleCopy}
                >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </Button>
            </div>
        </div>
    );
};

export const GitCommandsDrawer = ({ open, onOpenChange, task, project }: GitCommandsDrawerProps) => {
    if (!task) return null;

    // Slugify task title for branch name
    const slug = task.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 50);

    const branchName = `feature/${slug}`;
    const repoUrl = project?.githubRepoOwner && project?.githubRepoName
        ? `https://github.com/${project.githubRepoOwner}/${project.githubRepoName}.git`
        : "git remote add origin <your-repo-url>";

    // Ensure we use the robust ID for tagging
    const taskId = task._id || task.id;
    const commitMessage = `feat: ${task.title} [ZYNC-COMPLETE #${taskId}]`;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[480px] w-full p-0 flex flex-col bg-zinc-950/95 border-l border-white/5 backdrop-blur-xl">
                <SheetHeader className="p-6 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-md bg-blue-500/10 text-blue-400">
                            <Terminal className="w-4 h-4" />
                        </div>
                        <SheetTitle className="text-lg font-medium tracking-tight">Git Command Assistant</SheetTitle>
                    </div>
                    <SheetDescription className="text-zinc-400 text-xs">
                        Execute these commands in sequence to set up, work on, and sync
                        <span className="text-zinc-200 font-medium ml-1">"{task.title}"</span>.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1">
                    <div className="p-6 pt-8">
                        <div className="space-y-1">
                            <CommandBlock
                                stepNumber={1}
                                label="Clone Repository"
                                command={`git clone ${repoUrl}`}
                            />
                            <CommandBlock
                                stepNumber={2}
                                label="Create Feature Branch"
                                command={`git checkout -b ${branchName}`}
                            />
                            <CommandBlock
                                stepNumber={3}
                                label="Stage Changes"
                                command="git add ."
                            />
                            <CommandBlock
                                stepNumber={4}
                                label="Commit with Link"
                                command={`git commit -m "${commitMessage}"`}
                            />
                            <CommandBlock
                                stepNumber={5}
                                label="Push to Remote"
                                command={`git push origin ${branchName}`}
                            />
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                    <SheetClose asChild>
                        <Button variant="outline" className="w-full border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white text-zinc-400 transition-colors">
                            Done
                        </Button>
                    </SheetClose>
                </div>
            </SheetContent>
        </Sheet>
    );
};


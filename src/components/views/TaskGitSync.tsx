import React, { useState } from 'react';
import { Copy, Check, Github } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TaskGitSyncProps {
    taskId: string;
    className?: string;
}

export const TaskGitSync: React.FC<TaskGitSyncProps> = ({ taskId, className }) => {
    const [copied, setCopied] = useState(false);
    const commitTag = `[ZYNC-COMPLETE #${taskId}]`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(commitTag);
        setCopied(true);
        toast.success("Commit tag copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={cn("p-4 rounded-lg border border-border bg-card shadow-sm", className)}>
            <div className="flex items-center gap-2 mb-2">
                <Github className="w-4 h-4 text-foreground" />
                <h4 className="font-medium text-sm text-foreground">Sync with GitHub</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
                Include this tag in your commit message to automatically complete this task.
            </p>

            <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono text-foreground truncate border border-border/50 select-all">
                    {commitTag}
                </code>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="shrink-0 h-9 w-9"
                    title="Copy tag"
                >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
};

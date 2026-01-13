import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as Y from 'yjs';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { updateNote, Note } from '../../api/notes';
import { fetchProjects, createQuickTask, searchTasks, Project, TaskSearchResult } from '../../api/projects';
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  CheckSquare,
  Sparkles,
  Link as LinkIcon,
  Search,
  Calendar,
  Clock,
  User as UserIcon,
  SmilePlus
} from 'lucide-react';

import { SocketIOProvider } from '@/lib/SocketIOProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { useTheme } from "next-themes";

interface NoteEditorProps {
  note: Note;
  user: { uid: string; displayName?: string; email?: string };
  onUpdate: (note: Note) => void;
  className?: string;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, user, onUpdate, className }) => {
  const { resolvedTheme } = useTheme();
  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<'Saved' | 'Saving...'>('Saved');

  // Smart Feature States
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskLinkDialogOpen, setTaskLinkDialogOpen] = useState(false);
  const [selectedTaskText, setSelectedTaskText] = useState("");

  // Create Yjs Doc and Provider
  const doc = useMemo(() => new Y.Doc(), []);

  const provider = useMemo(() => {
    return new SocketIOProvider(note._id, doc, {
      name: user.displayName || user.email || 'Anonymous',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    });
  }, [note._id, doc, user]);

  useEffect(() => {
    return () => {
      provider.destroy();
      doc.destroy();
    }
  }, [provider, doc]);

  // Initialize editor with collaboration
  const editor = useCreateBlockNote({
    collaboration: {
      fragment: doc.getXmlFragment("document-store"),
      user: {
        name: user.displayName || user.email || 'Anonymous',
        color: provider.awareness.getLocalState()?.user.color || '#3b82f6',
      },
      provider: provider,
    },
    initialContent: note.content && Array.isArray(note.content) && note.content.length > 0
      ? note.content
      : undefined,
  });

  useEffect(() => {
    setTitle(note.title);
  }, [note.title]);

  // Load projects for smart features
  useEffect(() => {
    if (user.uid) {
      fetchProjects(user.uid).then(setProjects).catch(e => console.error(e));
    }
  }, [user.uid]);

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setStatus('Saving...');
    try {
      await updateNote(note._id, { title: newTitle });
      setStatus('Saved');
      onUpdate({ ...note, title: newTitle });
    } catch (error) {
      console.error("Failed to save title", error);
    }
  };

  // Debounced Save for Content
  const handleContentChange = useCallback(async () => {
    setStatus('Saving...');
    try {
      const blocks = editor.document;
      await updateNote(note._id, { content: blocks });
      setStatus('Saved');
    } catch (error) {
      console.error("Failed to save content", error);
      toast.error("Failed to save changes");
    }
  }, [editor, note._id]);

  // Smart Feature Handlers
  const openTaskCreation = () => {
    if (!editor) return;

    // Get text from current selection or current block
    const selection = editor.getTextCursorPosition();
    const block = selection.block;
    let text = "";

    // If we have content in the block, use it. 
    // Simplified: Just use the text content of the block where cursor is.
    if (block && block.content) {
      // Block content is array of InlineContent. Join text.
      // @ts-ignore
      text = block.content.map(c => c.text || "").join("");
    }

    if (!text) {
      toast.error("Please put cursor on a line with text");
      return;
    }

    setSelectedTaskText(text);
    setTaskDialogOpen(true);
  };

  const handleCreateTask = async (projectId: string) => {
    try {
      const result = await createQuickTask(projectId, selectedTaskText);
      toast.success("Task created in project!");
      setTaskDialogOpen(false);

      // Optional: Replace text with link or add badge
      // For now, simpler to just notify.
    } catch (e) {
      toast.error("Failed to create task");
    }
  };

  const handleInsertTaskLink = async (task: TaskSearchResult) => {
    if (!editor) return;

    const markdownLink = `[${task.title} (Task)](/projects/${task.projectId}?task=${task.id})`;
    // Insert at cursor
    editor.insertBlocks([
      {
        content: [
          {
            type: "text",
            text: task.title + " ",
            styles: { bold: true }
          },
          {
            type: "link",
            href: `/projects/${task.projectId}?task=${task.id}`,
            content: [{ type: "text", text: "🔗", styles: {} }]
          }
        ]
      }
    ], editor.getTextCursorPosition().block, "after");

    setTaskLinkDialogOpen(false);
  };

  if (!editor) {
    return <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Loading editor...</div>;
  }

  return (
    <div className={cn("flex flex-col h-full bg-zinc-100 dark:bg-black font-serif-elegant relative", className)}>

      {/* Main Edior Area - Single Scroll Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar h-full bg-zinc-100/50 dark:bg-black relative">

        {/* Modern Gradient Header - Scrollable */}
        <div className="relative w-full h-64 shrink-0 bg-gradient-to-r from-rose-100 to-teal-100 dark:bg-gradient-to-br dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 border-b border-black/5 dark:border-white/5 flex items-start justify-end p-6 shadow-sm dark:shadow-none">
          {/* Action Buttons Floating in Header */}
          <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide bg-white/60 dark:bg-neutral-900/80 backdrop-blur-md rounded-full px-4 py-2 border border-white/20 dark:border-white/10 shadow-sm">
            <Button variant="ghost" size="sm" className="h-7 px-3 text-xs gap-1.5 hover:bg-white/50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest" onClick={openTaskCreation}>
              <CheckSquare size={13} />
              To Task
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 hover:bg-white/50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest" onClick={() => setTaskLinkDialogOpen(true)}>
              <LinkIcon size={13} />
              Link Task
            </Button>
          </div>
          {/* Fade Out Blend to Background */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-zinc-100 dark:from-black to-transparent" />
        </div>

        <div className="max-w-4xl mx-auto px-6 sm:px-12 relative z-10 -mt-24 pb-24">

          {/* Main Document Sheet */}
          <div className="bg-paper-texture border border-stone-200 dark:border-neutral-800 shadow-xl dark:shadow-none min-h-[900px] p-12 sm:p-16 relative rounded-t-sm">

            {/* Title Section */}
            <div className="mb-10 border-b-2 border-slate-800/10 dark:border-white/10 pb-6">
              <input
                value={title}
                onChange={handleTitleChange}
                placeholder="Untitled"
                className="text-5xl font-bold font-serif-elegant outline-none bg-transparent w-full text-slate-800 dark:text-gray-200 placeholder:text-slate-300 dark:placeholder:text-gray-700 leading-tight tracking-tight text-left"
              />

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-y-2 gap-x-8 mt-6 max-w-md">
                <div className="flex items-center gap-3 text-slate-500 dark:text-gray-400">
                  <UserIcon size={14} strokeWidth={1.5} />
                  <span className="text-xs uppercase tracking-widest font-semibold">{user.displayName || "Author"}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-gray-400">
                  <Calendar size={14} strokeWidth={1.5} />
                  <span className="text-xs uppercase tracking-widest font-semibold">{new Date(note.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-gray-400">
                  {status === 'Saving...' ? (
                    <div className="flex items-center gap-2">
                      <Clock size={14} strokeWidth={1.5} className="animate-spin" />
                      <span className="text-xs uppercase tracking-widest font-semibold">Saving...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-700/70 dark:text-emerald-400/80">
                      <CheckCircle2 size={14} strokeWidth={1.5} />
                      <span className="text-xs uppercase tracking-widest font-semibold">Synced</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Editor Content */}
            <div className="relative font-serif-elegant text-slate-800 dark:text-gray-200 leading-relaxed text-lg">
              <BlockNoteView
                editor={editor}
                onChange={handleContentChange}
                theme={resolvedTheme === 'dark' ? "dark" : "light"}
                className="zync-editor-overrides"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Task</DialogTitle>
            <DialogDescription>
              Create a new task in Zync Project Management from this line.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 bg-muted/30 rounded-md text-sm italic mb-4 border border-border/50">
              "{selectedTaskText}"
            </div>
            <label className="text-sm font-medium mb-2 block">Select Project</label>
            <Command className="border rounded-md">
              <CommandInput placeholder="Search projects..." />
              <CommandList>
                <CommandEmpty>No projects found.</CommandEmpty>
                <CommandGroup>
                  {projects.map(p => (
                    <CommandItem key={p._id} onSelect={() => handleCreateTask(p._id)}>
                      {p.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Task Dialog */}
      <Dialog open={taskLinkDialogOpen} onOpenChange={setTaskLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Exisiting Task</DialogTitle>
          </DialogHeader>
          <TaskSearch user={user} onSelect={handleInsertTaskLink} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TaskSearch = ({ user, onSelect }: { user: any, onSelect: (task: TaskSearchResult) => void }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaskSearchResult[]>([]);

  useEffect(() => {
    if (query.length > 2) {
      const timer = setTimeout(async () => {
        const res = await searchTasks(query, user.uid);
        setResults(res);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [query, user.uid]);

  return (
    <Command className="border rounded-md">
      <CommandInput placeholder="Search tasks by title..." onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No tasks found.</CommandEmpty>
        <CommandGroup heading="Tasks">
          {results.map(task => (
            <CommandItem key={task.id} onSelect={() => onSelect(task)}>
              <div className="flex flex-col">
                <span>{task.title}</span>
                <span className="text-xs text-muted-foreground">{task.projectName} • {task.status}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

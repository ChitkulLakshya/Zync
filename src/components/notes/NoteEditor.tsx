import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import * as Y from 'yjs';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { updateNote, Note } from '../../services/notesService';
import { fetchProjects, createQuickTask, searchTasks, Project, TaskSearchResult } from '../../api/projects';
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  CheckSquare,
  Link as LinkIcon,
  Calendar,
  Clock,
  User as UserIcon,
} from 'lucide-react';

// import { SocketIOProvider } from '@/lib/SocketIOProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { useTheme } from "next-themes";

interface NoteEditorProps {
  note: Note;
  user: { uid: string; displayName?: string; email?: string };
  onUpdate: (note: Note) => void;
  className?: string;
}

// TaskSearch Component for Linking - Moved to top
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

const NoteEditor: React.FC<NoteEditorProps> = ({ note, user, onUpdate, className }) => {
  const { resolvedTheme } = useTheme();
  const [title, setTitle] = useState(note.title || '');
  const [status, setStatus] = useState<'Saved' | 'Saving...'>('Saved');

  // Smart Feature States
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskLinkDialogOpen, setTaskLinkDialogOpen] = useState(false);
  const [selectedTaskText, setSelectedTaskText] = useState("");

  // Initialize editor without collaboration (temporarily using Firestore for persistence only)
  // We useMemo the options with empty deps [] because we rely on the parent component 
  // to remount us (key={note.id}) when switching notes.
  // This prevents the editor from being recreated on every render (e.g. title updates), 
  // which causes "TextSelection endpoint" and "Node cannot be found" errors.
  const editorOptions = useMemo(() => ({
    initialContent: note.content && Array.isArray(note.content) && note.content.length > 0
      ? note.content
      : undefined,
  }), []); // Empty deps: only create once per mount

  const editor = useCreateBlockNote(editorOptions);

  /* 
  // Temporarily disabled Yjs/SocketIO as we migrated to Firestore.
  // We need a Firestore-based Yjs provider for true collaboration.
  const doc = useMemo(() => new Y.Doc(), []);
  const provider = useMemo(() => { ... }, [note.id, doc, user]);
  useEffect(() => { ... }, [provider, doc]);
  */

  useEffect(() => {
    setTitle(note.title || '');
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
      await updateNote(note.id, { title: newTitle });
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
      await updateNote(note.id, { content: blocks });
      setStatus('Saved');
    } catch (error) {
      console.error("Failed to save content", error);
      toast.error("Failed to save changes");
    }
  }, [editor, note.id]);

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
                id="note-title"
                name="title"
                value={title || ''}
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
                className="ZYNC-editor-overrides"
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
              Create a new task in ZYNC Project Management from this line.
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

// Memoize the component to prevent re-renders when note.content changes from Firestore updates.
// Since we only use initialContent on mount, subsequent content updates from the server 
// (which are mostly echoes of our own typing) shouldn't trigger re-renders of the editor wrapper.
export default React.memo(NoteEditor, (prev, next) => {
  // Return true if props are equal (DO NOT RE-RENDER)
  // Return false if props are different (RE-RENDER)

  const isSameNote = prev.note.id === next.note.id;
  const isSameTitle = prev.note.title === next.note.title;
  const isSameUser = prev.user.uid === next.user.uid;

  // We explicitly ignore 'note.content', 'note.updatedAt', and 'note.folderId' for re-rendering purposes
  // as they don't affect the editor UI once mounted (controlled by BlockNote internally or local state).
  // We only care if the Note ID changes (switch note) or Title changes (external update).
  return isSameNote && isSameTitle && isSameUser;
});

import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import * as Y from 'yjs';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { updateNote, Note } from '../../services/notesService';
import { fetchProjects, createQuickTask, searchTasks, Project, TaskSearchResult } from '../../api/projects';
import { cn, getFullUrl } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  CheckSquare,
  Link as LinkIcon,
  Calendar,
  Clock,
  User as UserIcon,
} from 'lucide-react';

import { useNotePresence } from '@/hooks/useNotePresence';
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useTheme } from "next-themes";

interface NoteEditorProps {
  note: Note;
  user: { uid: string; displayName?: string; email?: string; photoURL?: string };
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

  // Collaborative Presence
  const { collaborators, updateCursorPosition } = useNotePresence(note.id, user);

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
  // Debounced Save for Content
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleContentChange = useCallback(() => {
    setStatus('Saving...');

    // Update cursor position for collaborators
    try {
      const cursorPos = editor.getTextCursorPosition();
      if (cursorPos?.block?.id) {
        updateCursorPosition(cursorPos.block.id);
      }
    } catch (e) {
      // Ignore cursor position errors
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const blocks = editor.document;
        await updateNote(note.id, { content: blocks });
        setStatus('Saved');
      } catch (error) {
        console.error("Failed to save content", error);
        toast.error("Failed to save changes");
      }
    }, 2000); // Wait 2 seconds of inactivity before saving
  }, [editor, note.id, updateCursorPosition]);

  // Clean up timeout on unmount or note switch
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [note.id]);

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

  // Manual Content Sync implementation for Firestore (Last Write Wins)
  useEffect(() => {
    if (!editor || !note.content) return;

    // Check if content is actually different to avoid cursor jumps
    // We do a simple JSON comparison. Ideally we would use Yjs for this.
    try {
      const currentContent = JSON.stringify(editor.document);
      const newContent = JSON.stringify(note.content);

      if (currentContent !== newContent) {
        // Only update if we are not currently typing (simple heuristic: no focus? or just accept jump for collabs)
        // For now, we will update. This mimics "live" updates but might interrupt typing.
        // To be safer, we could check if timestamp is significantly newer.

        // BlockNote requires parsing blocks if they came from Firestore as objects
        // Array check
        if (Array.isArray(note.content)) {
          editor.replaceBlocks(editor.document, note.content);
        }
      }
    } catch (e) {
      console.error("Failed to sync content", e);
    }
  }, [note.content, editor]);

  if (!editor) {
    return <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Loading editor...</div>;
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Collaborators & Status Bar */}
      {(collaborators.length > 0 || status === 'Saving...') && (
        <div className="flex items-center gap-3 mb-6">
          {collaborators.length > 0 && (
            <TooltipProvider>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {collaborators.slice(0, 4).map((collab) => (
                    <Tooltip key={collab.odId}>
                      <TooltipTrigger asChild>
                        <div className="relative cursor-default transition-transform hover:scale-110">
                          <Avatar className="w-6 h-6 border-2 border-background ring-1 ring-border/20">
                            <AvatarImage 
                              src={getFullUrl(collab.photoURL)} 
                              className="object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                            <AvatarFallback 
                              className="text-[9px] font-medium text-white"
                              style={{ backgroundColor: collab.color }}
                            >
                              {collab.displayName?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {collab.displayName} is here
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {collaborators.length} editing
                </span>
              </div>
            </TooltipProvider>
          )}
          
          {/* Save Status */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
            {status === 'Saving...' ? (
              <>
                <Clock size={11} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={11} className="text-emerald-500" />
                <span className="text-emerald-500">Saved</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Title Input */}
      <input
        id="note-title"
        name="title"
        value={title || ''}
        onChange={handleTitleChange}
        placeholder="Untitled"
        className="text-3xl font-semibold outline-none bg-transparent w-full text-zinc-100 placeholder:text-zinc-600 mb-2 tracking-tight"
      />

      {/* Metadata Row */}
      <div className="flex items-center gap-3 text-xs text-zinc-500 mb-6 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-1.5">
          <UserIcon size={11} />
          <span>{user.displayName || "You"}</span>
        </div>
        <span className="text-zinc-700">·</span>
        <div className="flex items-center gap-1.5">
          <Calendar size={11} />
          <span>
            {note.createdAt ? (() => {
              const date = new Date(note.createdAt);
              return isNaN(date.getTime()) ? 'Just now' : date.toLocaleDateString();
            })() : 'Just now'}
          </span>
        </div>
      </div>

      {/* Editor Content */}
      <div className="prose prose-invert prose-zinc max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-a:text-indigo-400">
        <BlockNoteView
          editor={editor}
          onChange={handleContentChange}
          theme="dark"
          className="ZYNC-editor-overrides"
        />
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
  // Allow content re-renders now so we can sync edits via useEffect
  const isSameContent = prev.note.content === next.note.content;

  // If content is DIFFERENT, we MUST re-render to let useEffect run and sync blocks
  // BUT: if we re-render, does it lose focus? 
  // No, React.memo only stops the *WRAPPER* render. The internal editor state is preserved by useCreateBlockNote (singleton-ish hook per mount).
  // The useEffect will handle the update.

  return isSameNote && isSameTitle && isSameUser && isSameContent;
});

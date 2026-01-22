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
import { CollaboratorAvatars } from './CollaboratorAvatars';
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

  // Collaborative Presence with cursor awareness
  const { 
    activeUsers, 
    remoteCursors, 
    updateCursorPosition, 
    getRemoteUserForBlock,
    isConnected 
  } = useNotePresence(note.id, user);

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

  // Track block focus for cursor awareness
  const handleBlockFocus = useCallback(() => {
    try {
      const cursorPos = editor?.getTextCursorPosition();
      if (cursorPos?.block?.id) {
        // 🔍 DEBUG: Log outgoing focus event
        console.log('📤 [NoteEditor] I focused block:', cursorPos.block.id);
        updateCursorPosition(cursorPos.block.id);
      }
    } catch (e) {
      // Ignore cursor position errors during transitions
    }
  }, [editor, updateCursorPosition]);

  // Clean up timeout on unmount or note switch
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [note.id]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COLLABORATIVE BLOCK HIGHLIGHTING
  // ═══════════════════════════════════════════════════════════════════════════
  // Note: BlockNote renders blocks internally, so we can't pass props directly.
  // Instead, we use DOM manipulation to apply data attributes that CSS targets.
  // This is equivalent to: <Block activeCollaborator={remoteCursors[block.id]} />
  // ═══════════════════════════════════════════════════════════════════════════

  // Apply collaborator cursor highlights to blocks
  useEffect(() => {
    // 🔍 DEBUG: Log when this effect runs
    console.log('🎨 [NoteEditor] Block highlight effect running');
    console.log('🎨 [NoteEditor] activeUsers:', activeUsers.map(u => ({ id: u.id, name: u.name, blockId: u.blockId })));
    console.log('🎨 [NoteEditor] remoteCursors keys:', Object.keys(remoteCursors));
    console.log('🎨 [NoteEditor] remoteCursors full:', remoteCursors);
    
    if (!editor) return;
    
    // Get all blocks from the editor
    const blocks = editor.document;
    
    // 🔍 DEBUG: Log all block IDs in the document
    console.log('🎨 [NoteEditor] All block IDs in document:', blocks.map(b => b.id));
    
    // 🔍 DEBUG: Check for matches before iterating
    const remoteCursorKeys = Object.keys(remoteCursors);
    const blockIds = blocks.map(b => b.id);
    const matchingBlocks = blockIds.filter(id => remoteCursorKeys.includes(id));
    console.log('🎨 [NoteEditor] Block IDs that have remoteCursors:', matchingBlocks);
    
    // Clear all previous highlights first
    const previousHighlights = document.querySelectorAll('[data-collab-user]');
    previousHighlights.forEach(el => {
      el.removeAttribute('data-collab-user');
      el.removeAttribute('data-collab-color');
      el.removeAttribute('data-collab-name');
      (el as HTMLElement).style.removeProperty('--collab-color');
    });
    
    if (activeUsers.length === 0) {
      console.log('🎨 [NoteEditor] No active users, all highlights cleared');
      return;
    }

    // Iterate through all blocks and check if any has an active collaborator
    // This is the equivalent of: blocks.map(block => <Block activeCollaborator={remoteCursors[block.id]} />)
    blocks.forEach(block => {
      const activeCollaborator = remoteCursors[block.id] || null;
      
      // 🔍 DEBUG: Log every block render with its collaborator status
      console.log('Block rendering. ID:', block.id, 'Collaborator:', activeCollaborator);
      
      if (activeCollaborator) {
        // Apply styling: borderLeft: 3px solid activeCollaborator.color
        console.log(`✅ [NoteEditor] Applying activeCollaborator to block ${block.id}:`, {
          id: activeCollaborator.id,
          name: activeCollaborator.name,
          color: activeCollaborator.color
        });
        
        // Try multiple selectors to find the block element
        let blockEl = document.querySelector(`[data-id="${block.id}"]`);
        
        // Fallback: try data-node-id (some BlockNote versions use this)
        if (!blockEl) {
          blockEl = document.querySelector(`[data-node-id="${block.id}"]`);
        }
        
        // Fallback: try data-block-id
        if (!blockEl) {
          blockEl = document.querySelector(`[data-block-id="${block.id}"]`);
        }
        
        if (blockEl) {
          // Apply the activeCollaborator styling via DOM attributes
          // CSS will handle: borderLeft: 3px solid activeCollaborator.color
          //                  transition: 'border-color 0.2s ease'
          //                  Name tag with backgroundColor: activeCollaborator.color
          blockEl.setAttribute('data-collab-user', activeCollaborator.id);
          blockEl.setAttribute('data-collab-color', activeCollaborator.color);
          blockEl.setAttribute('data-collab-name', activeCollaborator.name || 'Someone');
          (blockEl as HTMLElement).style.setProperty('--collab-color', activeCollaborator.color);
          console.log(`✅ [NoteEditor] DOM styled. key=${block.id}, id=${block.id}`);
        } else {
          // 🔍 DEBUG: List all data-* attributes in the editor to find the right selector
          console.log(`❌ [NoteEditor] DOM element NOT found for block ${block.id}`);
          const allBlockEls = document.querySelectorAll('.bn-block');
          console.log('🔍 [NoteEditor] All .bn-block elements:', allBlockEls.length);
          if (allBlockEls.length > 0) {
            const firstBlock = allBlockEls[0];
            console.log('🔍 [NoteEditor] First block attributes:', 
              Array.from(firstBlock.attributes).map(a => `${a.name}="${a.value}"`).join(', ')
            );
          }
        }
      }
    });
  }, [editor, activeUsers, remoteCursors]);

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
      {/* Collaborators & Status Bar - Always visible */}
      <div className="flex items-center gap-3 mb-6 min-h-[28px]">
        {/* Collaborators Avatars - Using the new component */}
        <CollaboratorAvatars activeUsers={activeUsers} maxVisible={5} size="md" />
        
        {/* Save Status - Always on right */}
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

      {/* Title Input */}
      <input
        id="note-title"
        name="title"
        value={title || ''}
        onChange={handleTitleChange}
        placeholder="Untitled"
        className="text-3xl font-semibold outline-none bg-transparent w-full text-foreground placeholder:text-muted-foreground/50 mb-2 tracking-tight"
      />

      {/* Metadata Row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-1.5">
          <UserIcon size={11} />
          <span>{user.displayName || "You"}</span>
        </div>
        <span className="text-border">·</span>
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

      {/* Editor Content with cursor awareness */}
      <div 
        className="prose prose-invert prose-zinc max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-a:text-indigo-400"
        onClick={handleBlockFocus}
        onKeyUp={handleBlockFocus}
      >
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

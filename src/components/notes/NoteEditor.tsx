import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { updateNote, Note } from '../../services/notesService';
import { fetchProjects, createQuickTask, Project, TaskSearchResult } from '../../api/projects';
import { cn } from "@/lib/utils";

import { useNotePresence } from '@/hooks/useNotePresence';
import FixedToolbar from './FixedToolbar';
import { toast } from "sonner";
import { EditorHeader } from './editor/EditorHeader';
import { TaskDialogs } from './editor/TaskDialogs';
import { ShareDialog } from './editor/ShareDialog';

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { SocketIOProvider } from '../../lib/SocketIOProvider';

interface NoteEditorProps {
  note: Note;
  user: { uid: string; displayName?: string; email?: string; photoURL?: string };
  isShared?: boolean;
  onUpdate: (note: Note) => void;
  className?: string;
}

const COLLABORATOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#a855f7'
];

export const getColorForUser = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
};

// ---------------------------------------------------------------------------
// INNER EDITOR COMPONENT (Only renders when Y.Doc is fully ready)
// ---------------------------------------------------------------------------
const NoteEditorInner: React.FC<NoteEditorProps & { doc: Y.Doc, provider: any, isEditable: boolean }> = ({ 
  note, user, onUpdate, className, doc, provider, isEditable 
}) => {
  const [title, setTitle] = useState(note.title || '');
  const titleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [status, setStatus] = useState<'Saved' | 'Saving...'>('Saved');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskLinkDialogOpen, setTaskLinkDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedTaskText, setSelectedTaskText] = useState("");

  const { activeUsers, updateCursorPosition, remoteCursors } = useNotePresence(note.id, user);

  useEffect(() => {
    const handleOpenLinkTask = () => setTaskLinkDialogOpen(true);
    const handleOpenShare = () => setShareDialogOpen(true);
    
    window.addEventListener('open-link-task-dialog', handleOpenLinkTask);
    window.addEventListener('open-share-note-dialog', handleOpenShare);
    
    return () => {
      window.removeEventListener('open-link-task-dialog', handleOpenLinkTask);
      window.removeEventListener('open-share-note-dialog', handleOpenShare);
    };
  }, []);

  useEffect(() => {
    setTitle(note.title || '');
  }, [note.title]);

  useEffect(() => {
    if (user.uid) {
      fetchProjects().then(setProjects).catch(e => console.error(e));
    }
  }, [user.uid]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditable) {return;}
    const newTitle = e.target.value;
    setTitle(newTitle);
    setStatus('Saving...');
    
    if (titleTimerRef.current) {clearTimeout(titleTimerRef.current);}
    
    titleTimerRef.current = setTimeout(async () => {
      try {
        await updateNote(note.id, { title: newTitle });
        setStatus('Saved');
        onUpdate({ ...note, title: newTitle });
      } catch (error) {
        console.error("Failed to save title", error);
        setStatus('Saved'); // Reset to saved even on error so it doesn't spin forever
      }
    }, 1000);
  };

  const editorOptions = useMemo(() => ({
    collaboration: {
      provider,
      fragment: doc.getXmlFragment("document"),
      user: {
        name: user.displayName || 'Anonymous',
        color: getColorForUser(user.uid)
      }
    }
  }), [provider, doc, user.uid, user.displayName]);

  const editor = useCreateBlockNote(editorOptions);

  // Helper to strip IDs from blocks so BlockNote generates new unique ones
  // This prevents ProseMirror crashes if two clients hydrate the same JSON concurrently
  const stripBlockIds = (blocks: any[]): any[] => {
    if (!Array.isArray(blocks)) {return blocks;}
    return blocks.map(b => {
      const { id, ...rest } = b;
      if (rest.children) {
        rest.children = stripBlockIds(rest.children);
      }
      return rest;
    });
  };

  // 1-TIME HYDRATION: If Y.Doc is completely empty (new local instance) but we have server content
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    if (editor && note.content && !hasHydrated) {
      if (editor.document.length === 1 && !editor.document[0].content) {
        if (Array.isArray(note.content) && note.content.length > 0) {
          // If we are not the owner, we might be hydrating concurrently with the owner.
          // Stripping IDs ensures we don't cause a RangeError collision in y-prosemirror.
          const safeContent = user.uid === note.ownerId ? note.content : stripBlockIds(note.content);
          editor.replaceBlocks(editor.document, safeContent);
        }
      }
      setHasHydrated(true);
    }
  }, [editor, note.content, hasHydrated, note.ownerId, user.uid]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleContentChange = useCallback(() => {
    if (!isEditable) {return;}
    setStatus('Saving...');

    try {
      if (editor) {
        const cursorPos = editor.getTextCursorPosition();
        if (cursorPos?.block?.id) {
          updateCursorPosition(cursorPos.block.id);
        }
      }
    } catch (e) {
      console.warn("Could not get cursor position:", e);
    }

    if (saveTimeoutRef.current) {clearTimeout(saveTimeoutRef.current);}

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const blocks = editor.document;
        await updateNote(note.id, { content: blocks });
        setStatus('Saved');
      } catch (error) {
        toast.error("Failed to save changes");
      }
    }, 2000);
  }, [editor, note.id, isEditable]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {clearTimeout(saveTimeoutRef.current);}
    };
  }, []);

  const handleBlockFocus = useCallback(() => {
    try {
      if (editor) {
        const cursorPos = editor.getTextCursorPosition();
        if (cursorPos?.block?.id) {
          updateCursorPosition(cursorPos.block.id);
        }
      }
    } catch (e) {
      // Ignore errors when failing to get cursor position on focus
    }
  }, [editor, updateCursorPosition]);

  useEffect(() => {
    if (!editor) {return;}

    // Clear previous highlights
    const previousHighlights = document.querySelectorAll('[data-collab-user]');
    previousHighlights.forEach(el => {
      el.removeAttribute('data-collab-user');
      el.removeAttribute('data-collab-color');
      el.removeAttribute('data-collab-name');
      (el as HTMLElement).style.removeProperty('--collab-color');
      (el as HTMLElement).style.removeProperty('border-left');
    });

    if (activeUsers.length === 0) {
      return;
    }

    // Iterate over elements that represent outer blocks
    let blockEls = document.querySelectorAll('.bn-block-outer[data-id]');
    if (blockEls.length === 0) {
      // Fallback if the BlockNote version doesn't use bn-block-outer
      blockEls = document.querySelectorAll('[data-id]');
    }

    // Keep track of processed IDs to avoid nested highlighting
    const processedIds = new Set<string>();

    blockEls.forEach(blockEl => {
      const blockId = blockEl.getAttribute('data-id');
      if (!blockId || processedIds.has(blockId)) {return;}
      
      const activeCollaborator = remoteCursors[blockId];
      if (activeCollaborator) {
        processedIds.add(blockId);
        blockEl.setAttribute('data-collab-user', activeCollaborator.id);
        blockEl.setAttribute('data-collab-color', activeCollaborator.color);
        blockEl.setAttribute('data-collab-name', activeCollaborator.name || 'Someone');
        (blockEl as HTMLElement).style.setProperty('--collab-color', activeCollaborator.color);
        (blockEl as HTMLElement).style.borderLeft = `3px solid ${activeCollaborator.color}`;
        (blockEl as HTMLElement).style.position = 'relative';
      }
    });
  }, [editor, activeUsers, remoteCursors]);

  const openTaskCreation = () => {
    if (!editor) {return;}
    const selection = editor.getTextCursorPosition();
    const block = selection.block;
    let text = "";

    if (block && 'content' in block && Array.isArray(block.content)) {
      text = block.content.map((c: any) => c.text || "").join("");
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
      await createQuickTask(projectId, selectedTaskText);
      toast.success("Task created in project!");
      setTaskDialogOpen(false);
    } catch (e) {
      toast.error("Failed to create task");
    }
  };

  const handleInsertTaskLink = async (task: TaskSearchResult) => {
    if (!editor) {return;}
    
    let targetBlock;
    try {
      const pos = editor.getTextCursorPosition();
      targetBlock = pos ? pos.block : undefined;
    } catch (e) {
      // Ignore if editor doesn't have focus
    }

    const blockToInsert = {
      type: "paragraph" as const,
      content: [
        { type: "text" as const, text: task.title + " ", styles: { bold: true } },
        { type: "link" as const, href: `/projects/${task.projectId}?task=${task.id}`, content: [{ type: "text" as const, text: "🔗", styles: {} }] }
      ]
    };

    if (targetBlock) {
      editor.insertBlocks([blockToInsert], targetBlock, "after");
    } else {
      // Append at the end if no focus
      editor.insertBlocks([blockToInsert], editor.document[editor.document.length - 1], "after");
    }
    setTaskLinkDialogOpen(false);
  };

  if (!editor) {return <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading editor…</div>;}

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {isEditable && (
        <FixedToolbar
          editor={editor}
          onLinkTask={() => setTaskLinkDialogOpen(true)}
          onAddTask={openTaskCreation}
        />
      )}

      <div className="flex-1 overflow-y-auto bg-transparent scrollbar-thin">
        <div className="max-w-4xl mx-auto min-h-screen bg-secondary/5 border-x border-border/10 backdrop-blur-md shadow-none">
          <div className="px-16 py-12">
            <EditorHeader
              note={note}
              user={user}
              title={title}
              status={status}
              isEditable={isEditable}
              activeUsers={activeUsers}
              onTitleChange={handleTitleChange}
            />

            <div 
              className="prose dark:prose-invert prose-neutral max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-foreground prose-lg ZYNC-editor-overrides"
              onClick={handleBlockFocus}
              onKeyUp={handleBlockFocus}
            >
              <BlockNoteView
                editor={editor}
                editable={isEditable}
                slashMenu={isEditable}
                onChange={handleContentChange}
                onSelectionChange={handleBlockFocus}
                theme="dark"
                className="ZYNC-editor-overrides"
              />
            </div>
          </div>
        </div>
      </div>

      <TaskDialogs
        user={user}
        projects={projects}
        taskDialogOpen={taskDialogOpen}
        setTaskDialogOpen={setTaskDialogOpen}
        taskLinkDialogOpen={taskLinkDialogOpen}
        setTaskLinkDialogOpen={setTaskLinkDialogOpen}
        selectedTaskText={selectedTaskText}
        onCreateTask={(pid) => handleCreateTask(pid)}
        onLinkTask={handleInsertTaskLink}
      />

      <ShareDialog
        noteId={note.id}
        isOpen={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        currentPermissions={note.permissions || {}}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// OUTER WRAPPER (Manages Yjs + IndexedDB Setup + WebSocket)
// ---------------------------------------------------------------------------
const NoteEditor: React.FC<NoteEditorProps> = (props) => {
  const { note, user, isShared } = props;
  const [doc, setDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<any>();
  const [isEditable, setIsEditable] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (user.uid === note.ownerId) {
      setIsEditable(true);
    } else {
      const noteAny = note as any;
      const userRole = noteAny.permissions?.[user.uid] || noteAny.role;
      setIsEditable(userRole !== 'viewer');
    }
  }, [note, user.uid]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const idbProvider = new IndexeddbPersistence(`zync-note-${note.id}`, ydoc);
    let wsProvider: SocketIOProvider | null = null;

    idbProvider.on('synced', () => {
      if (isShared) {
        wsProvider = new SocketIOProvider(note.id, ydoc, {
          name: user.displayName || 'Anonymous',
          color: getColorForUser(user.uid),
          uid: user.uid
        });
        setProvider(wsProvider);
      } else {
        setProvider(idbProvider);
      }
      setDoc(ydoc);
      setIsReady(true);
    });

    return () => {
      idbProvider.destroy();
      if (wsProvider) {
        wsProvider.destroy();
      }
      ydoc.destroy();
      setIsReady(false);
    };
  }, [note.id, isShared, user]);

  if (!isReady || !doc || !provider) {
    return <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Initializing offline storage…</div>;
  }

  return (
    <NoteEditorInner 
      {...props} 
      doc={doc} 
      provider={provider} 
      isEditable={isEditable} 
    />
  );
};

export default React.memo(NoteEditor, (prev, next) => {
  const isSameNote = prev.note.id === next.note.id;
  const isSameTitle = prev.note.title === next.note.title;
  const isSameUser = prev.user.uid === next.user.uid;
  const isSameShared = prev.isShared === next.isShared;
  return isSameNote && isSameTitle && isSameUser && isSameShared;
});

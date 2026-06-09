import React, { useState, useEffect, useCallback, useMemo } from 'react';

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

interface NoteEditorProps {
  note: Note;
  user: { uid: string; displayName?: string; email?: string; photoURL?: string };
  onUpdate: (note: Note) => void;
  className?: string;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, user, onUpdate, className }) => {
  const [title, setTitle] = useState(note.title || '');
  const [status, setStatus] = useState<'Saved' | 'Saving...'>('Saved');
  const [isEditable, setIsEditable] = useState(true);

  useEffect(() => {
    if (user.uid === note.ownerId) {
      setIsEditable(true);
      return;
    }

    const noteAny = note as any;
    const userRole = noteAny.permissions?.[user.uid] || noteAny.role;

    if (userRole === 'viewer') {
      setIsEditable(false);
    } else {
      setIsEditable(true);
    }
  }, [note, user.uid]);

  const {
    activeUsers,
    remoteCursors,
    updateCursorPosition,
  } = useNotePresence(note.id, user);

  const [projects, setProjects] = useState<Project[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskLinkDialogOpen, setTaskLinkDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedTaskText, setSelectedTaskText] = useState("");

  const editorOptions = useMemo(() => ({
    initialContent: note.content && Array.isArray(note.content) && note.content.length > 0
      ? note.content
      : undefined,
  }), [note.id]); // Re-init on note change

  const editor = useCreateBlockNote(editorOptions);

  useEffect(() => {
    setTitle(note.title || '');
  }, [note.title]);

  useEffect(() => {
    if (user.uid) {
      fetchProjects().then(setProjects).catch(e => console.error(e));
    }
  }, [user.uid]);

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditable) {return;}
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

  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleContentChange = useCallback(() => {
    if (!isEditable) {return;}

    setStatus('Saving...');

    try {
      const cursorPos = editor.getTextCursorPosition();
      if (cursorPos?.block?.id) {
        updateCursorPosition(cursorPos.block.id);
      }
    } catch (e) {
      // Ignore errors when failing to get cursor position
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
    }, 2000);
  }, [editor, note.id, updateCursorPosition, isEditable]);

  const handleBlockFocus = useCallback(() => {
    try {
      const cursorPos = editor?.getTextCursorPosition();
      if (cursorPos?.block?.id) {
        updateCursorPosition(cursorPos.block.id);
      }
    } catch (e) {
      // Ignore errors when failing to get cursor position on focus
    }
  }, [editor, updateCursorPosition]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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

    const blocks = editor.document;
    blocks.forEach(block => {
      const activeCollaborator = remoteCursors[block.id] || null;

      if (activeCollaborator) {
        let blockEl = document.querySelector(`.bn-block-outer[data-id="${block.id}"]`);
        if (!blockEl) { blockEl = document.querySelector(`[data-id="${block.id}"]`); }
        if (!blockEl) { blockEl = document.querySelector(`[data-node-id="${block.id}"]`); }
        if (!blockEl) { blockEl = document.querySelector(`[data-block-id="${block.id}"]`); }

        if (blockEl) {
          blockEl.setAttribute('data-collab-user', activeCollaborator.id);
          blockEl.setAttribute('data-collab-color', activeCollaborator.color);
          blockEl.setAttribute('data-collab-name', activeCollaborator.name || 'Someone');
          (blockEl as HTMLElement).style.setProperty('--collab-color', activeCollaborator.color);
          (blockEl as HTMLElement).style.borderLeft = `3px solid ${activeCollaborator.color}`;
          (blockEl as HTMLElement).style.position = 'relative';
        }
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

  useEffect(() => {
    if (!editor || !note.content) {return;}

    try {
      const currentContent = JSON.stringify(editor.document);
      const newContent = JSON.stringify(note.content);

      if (currentContent !== newContent) {
        if (Array.isArray(note.content)) {
          editor.replaceBlocks(editor.document, note.content);
        }
      }
    } catch (e) {
      console.error("Failed to sync content", e);
    }
  }, [note.content, editor]);

  if (!editor) {
    return <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading editor…</div>;
  }

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
              className="prose dark:prose-invert prose-neutral max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-foreground prose-lg"
              onClick={handleBlockFocus}
              onKeyUp={handleBlockFocus}
            >
              <BlockNoteView
                editor={editor}
                editable={isEditable}
                slashMenu={isEditable}
                onChange={handleContentChange}
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

export default React.memo(NoteEditor, (prev, next) => {
  const isSameNote = prev.note.id === next.note.id;
  const isSameTitle = prev.note.title === next.note.title;
  const isSameUser = prev.user.uid === next.user.uid;
  const isSameContent = prev.note.content === next.note.content;

  return isSameNote && isSameTitle && isSameUser && isSameContent;
});

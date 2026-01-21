
import React, { useState, useEffect } from 'react';
import { NotesSidebar } from './NotesSidebar';
import NoteEditor from './NoteEditor';
import { Note, Folder, subscribeToFolders, subscribeToNotes } from '../../services/notesService';
import { Loader2, FilePenLine } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface NotesViewProps {
  user: { uid: string; displayName?: string; email?: string } | null;
  users?: any[];
  initialNoteId?: string | null;
  className?: string;
}

export const NotesView: React.FC<NotesViewProps> = ({ user, users = [], initialNoteId, className }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to Folders
    const unsubscribeFolders = subscribeToFolders(user.uid, (fetchedFolders) => {
      setFolders(fetchedFolders);
    });

    // Subscribe to Notes
    const unsubscribeNotes = subscribeToNotes(user.uid, (fetchedNotes) => {
      setNotes(fetchedNotes);
      setIsLoading(false);
    });

    return () => {
      unsubscribeFolders();
      unsubscribeNotes();
    };
  }, [user?.uid]);

  // Sync selectedNote with updates from subscription
  useEffect(() => {
    if (selectedNote) {
      const updated = notes.find(n => n.id === selectedNote.id);
      if (updated && updated !== selectedNote) {
        // Only update if content/title actually changed to avoid unnecessary re-renders
        // For simplicity, we just update. Note: Deep comparison might be better if optimization needed.
        setSelectedNote(updated);
      }
    }
  }, [notes, selectedNote?.id]);

  // Handle initialNoteId change if it updates after mount
  useEffect(() => {
    if (initialNoteId && notes.length > 0) {
      const target = notes.find(n => n.id === initialNoteId || n._id === initialNoteId);
      if (target && (target.id !== selectedNote?.id)) setSelectedNote(target);
    }
  }, [initialNoteId, notes]);

  const handleNoteUpdate = (updatedNote: Note) => {
    if (selectedNote?.id === updatedNote.id) {
      setSelectedNote(updatedNote);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
  };

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center bg-background text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Loading Notes...</div>;
  }

  return (
    <div className={cn("flex h-full bg-background overflow-hidden", className)}>
      <NotesSidebar
        userId={user?.uid || ''}
        users={users}
        folders={folders}
        notes={notes}
        selectedNoteId={selectedNote?.id || selectedNote?._id || null}
        onSelectNote={handleSelectNote}
        onRefresh={() => { /* Real-time subscription handles updates, but we can refetch if needed */ }}
        className="shrink-0"
      />
      <div className="flex-1 bg-background relative flex flex-col min-w-0">
        {selectedNote && user ? (
          <NoteEditor
            key={selectedNote.id}
            note={selectedNote}
            user={{ uid: user.uid, displayName: user.displayName, email: user.email }}
            onUpdate={handleNoteUpdate}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in duration-500">
            <div className="mb-6 p-6 bg-secondary/30 rounded-full ring-1 ring-border/50">
              <FilePenLine size={48} className="text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground/80 mb-2">Select a note to view</h3>
            <p className="text-sm text-center max-w-xs text-muted-foreground/70">
              Choose a note from the sidebar or create a new one to start documenting your ideas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

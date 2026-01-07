import React, { useState, useEffect } from 'react';
import { NotesSidebar } from './NotesSidebar';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { fetchFolders, fetchNotes, Note, Folder } from '../../api/notes';
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

  const loadData = async () => {
    if (!user?.uid) return;
    
    try {
      const [fetchedFolders, fetchedNotes] = await Promise.all([
        fetchFolders(user.uid),
        fetchNotes(user.uid)
      ]);
      setFolders(fetchedFolders);
      setNotes(fetchedNotes);
      
      if (initialNoteId) {
          const target = fetchedNotes.find(n => n._id === initialNoteId);
          if (target) setSelectedNote(target);
      }
    } catch (error) {
      console.error("Failed to load notes data", error);
      toast.error("Failed to load your notes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadData();
    }
  }, [user?.uid]);
  
  // Handle initialNoteId change if it updates after mount (e.g. reused component)
  useEffect(() => {
      if (initialNoteId && notes.length > 0) {
          const target = notes.find(n => n._id === initialNoteId);
          if (target && target._id !== selectedNote?._id) setSelectedNote(target);
      }
  }, [initialNoteId, notes]);

  const handleNoteUpdate = (updatedNote: Note) => {
    // Update local list
    setNotes(prev => prev.map(n => n._id === updatedNote._id ? updatedNote : n));
    // Update selected note reference
    if (selectedNote?._id === updatedNote._id) {
       setSelectedNote(updatedNote);
    }
  };

  const handleSelectNote = (note: Note) => {
    // If selecting a bare note object from creation, ensure it exists in the list
    if (!notes.find(n => n._id === note._id)) {
        setNotes([note, ...notes]);
    }
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
        selectedNoteId={selectedNote?._id || null}
        onSelectNote={handleSelectNote}
        onRefresh={loadData}
        className="shrink-0"
      />
      <div className="flex-1 bg-background relative flex flex-col min-w-0">
        {selectedNote && user ? (
          <NoteEditor 
            key={selectedNote._id} 
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

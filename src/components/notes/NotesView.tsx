import React, { useState, useEffect } from 'react';
import { NotesSidebar } from './NotesSidebar';
import { NoteEditor } from './NoteEditor';
import { fetchFolders, fetchNotes, Note, Folder } from '../../api/notes';
import { Loader2, FilePenLine } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface NotesViewProps {
  userId: string;
  className?: string;
}

export const NotesView: React.FC<NotesViewProps> = ({ userId, className }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [fetchedFolders, fetchedNotes] = await Promise.all([
        fetchFolders(userId),
        fetchNotes(userId)
      ]);
      setFolders(fetchedFolders);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error("Failed to load notes data", error);
      toast.error("Failed to load your notes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

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
        userId={userId}
        folders={folders}
        notes={notes}
        selectedNoteId={selectedNote?._id || null}
        onSelectNote={handleSelectNote}
        onRefresh={loadData}
        className="shrink-0"
      />
      <div className="flex-1 bg-background relative flex flex-col min-w-0">
        {selectedNote ? (
          <NoteEditor 
            key={selectedNote._id} 
            note={selectedNote} 
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

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, FileText, ArrowLeft, Search, Trash2, Pin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Note, createNote, subscribeToNotes, deleteNote, updateNote,
} from '@/services/notesService';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';
import { cn } from '@/lib/utils';

interface MobileNotesProps {
  user: { uid: string; displayName?: string; email?: string; photoURL?: string } | null;
  users?: any[];
}

const MobileNotes = ({ user }: MobileNotesProps) => {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user?.uid) {return;}
    const unsub = subscribeToNotes(user.uid, [], (fetchedNotes) => {
      setNotes(fetchedNotes);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const otherNotes = filteredNotes.filter(n => !n.isPinned);

  const handleCreateNote = async () => {
    setIsCreating(true);
    try {
      const newNote = await createNote({
        title: 'Untitled',
        content: [],
        ownerId: user?.uid || '',
      });
      setSelectedNote({ ...newNote, id: newNote.id || newNote._id } as Note);
      setEditTitle('Untitled');
      setEditContent('');
      toast({ title: 'Note created' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create note.', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Note',
      description: 'Are you sure you want to delete this note?',
      checkboxLabel: 'I confirm I want to delete this note',
    });
    if (!isConfirmed) {return;}
    try {
      await deleteNote(noteId);
      if (selectedNote?.id === noteId) {setSelectedNote(null);}
      toast({ title: 'Note deleted' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete note.', variant: 'destructive' });
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      await updateNote(note.id, { isPinned: !note.isPinned });
    } catch {
      toast({ title: 'Error', description: 'Failed to update note.', variant: 'destructive' });
    }
  };

  const handleSaveNote = useCallback(async () => {
    if (!selectedNote) {return;}
    setIsSaving(true);
    try {
      await updateNote(selectedNote.id, {
        title: editTitle.trim() || 'Untitled',
        content: editContent,
      });
      toast({ title: 'Saved' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [selectedNote, editTitle, editContent, toast]);

  const handleOpenNote = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(typeof note.content === 'string' ? note.content : '');
  };

  // Note Editor View
  if (selectedNote) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 pl-4 pr-14 py-3 shrink-0 border-b border-border/10">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { handleSaveNote(); setSelectedNote(null); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="flex-1 h-9 border-none bg-transparent text-base font-medium focus-visible:ring-0"
            placeholder="Note title"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving} onClick={handleSaveNote}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pin className={cn('w-4 h-4', selectedNote.isPinned && 'fill-foreground')} />}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder="Start writing…"
            className="w-full h-full resize-none bg-transparent text-sm leading-relaxed outline-none border-none"
            style={{ minHeight: '60vh' }}
          />
        </div>
      </div>
    );
  }

  // Notes List View
  return (
    <div className="flex flex-col h-full">
      <div className="pl-4 pr-14 py-3 shrink-0 border-b border-border/10 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button size="sm" className="gap-2 shrink-0" disabled={isCreating} onClick={handleCreateNote}>
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No notes yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first note to get started.</p>
            <Button size="sm" onClick={handleCreateNote}>
              <Plus className="w-4 h-4 mr-1" /> Create Note
            </Button>
          </div>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pinned</p>
                {pinnedNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onOpen={() => handleOpenNote(note)}
                    onDelete={() => handleDeleteNote(note.id)}
                    onTogglePin={() => handleTogglePin(note)}
                  />
                ))}
              </div>
            )}
            {otherNotes.length > 0 && (
              <div className="space-y-2">
                {pinnedNotes.length > 0 && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Notes</p>
                )}
                {otherNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onOpen={() => handleOpenNote(note)}
                    onDelete={() => handleDeleteNote(note.id)}
                    onTogglePin={() => handleTogglePin(note)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const NoteCard = ({ note, onOpen, onDelete, onTogglePin }: {
  note: Note;
  onOpen: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) => (
  <Card
    className="border border-border/10 p-3 active:scale-[0.98] transition-transform cursor-pointer"
    onClick={onOpen}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          {note.isPinned && <Pin className="w-3 h-3 text-orange-500 fill-orange-500" />}
          <span className="text-sm font-medium truncate">{note.title}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(note.updatedAt), 'MMM d, yyyy')}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onTogglePin}>
          <Pin className={cn('w-3 h-3', note.isPinned && 'fill-foreground')} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  </Card>
);

export default MobileNotes;

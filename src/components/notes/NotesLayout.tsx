import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Note, Folder, createFolder, createNote, shareFolder, subscribeToFolders, subscribeToNotes } from '../../services/notesService';
import NoteEditor from './NoteEditor';
import { cn } from "@/lib/utils";
import { 
  Search, 
  Plus, 
  FolderPlus, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Share2, 
  Users,
  MoreHorizontal,
  Link as LinkIcon,
  Loader2,
  FilePenLine
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NotesLayoutProps {
  user: { uid: string; displayName?: string; email?: string; photoURL?: string } | null;
  users?: any[];
  initialNoteId?: string | null;
  className?: string;
}

// Note List Item Component
const NoteListItem: React.FC<{
  note: Note;
  isSelected: boolean;
  onClick: () => void;
}> = ({ note, isSelected, onClick }) => {
  const formattedDate = useMemo(() => {
    if (!note.updatedAt && !note.createdAt) return '';
    const date = new Date(note.updatedAt || note.createdAt);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [note.updatedAt, note.createdAt]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-md transition-colors duration-200 group",
        isSelected 
          ? "bg-sidebar-accent border-l-2 border-l-primary" 
          : "hover:bg-sidebar-accent/50 border-l-2 border-l-transparent"
      )}
    >
      <div className="flex items-start gap-2">
        <FileText size={14} className={cn(
          "mt-0.5 shrink-0 transition-colors duration-200",
          isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )} />
        <div className="min-w-0 flex-1">
          <p className={cn(
            "text-sm font-medium truncate transition-colors duration-200",
            isSelected ? "text-sidebar-foreground" : "text-sidebar-foreground/80 group-hover:text-sidebar-foreground"
          )}>
            {note.title || 'Untitled'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {formattedDate}
          </p>
        </div>
      </div>
    </button>
  );
};

// Folder Item Component
const FolderListItem: React.FC<{
  folder: Folder;
  notes: Note[];
  selectedNoteId: string | null;
  isOwner: boolean;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  onShare: () => void;
}> = ({ folder, notes, selectedNoteId, isOwner, onSelectNote, onCreateNote, onShare }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-1">
      <div className="flex items-center group">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground hover:text-sidebar-foreground transition-colors duration-200 flex-1 min-w-0"
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="truncate">{folder.name}</span>
          <span className="text-xs text-muted-foreground/60 ml-1">{notes.length}</span>
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent transition-all duration-200">
              <MoreHorizontal size={14} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onCreateNote}>
              <Plus size={14} className="mr-2" /> New Note
            </DropdownMenuItem>
            {isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShare}>
                  <Share2 size={14} className="mr-2" /> Share
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isOpen && notes.length > 0 && (
        <div className="ml-4 space-y-0.5">
          {notes.map(note => (
            <NoteListItem
              key={note.id}
              note={note}
              isSelected={selectedNoteId === note.id}
              onClick={() => onSelectNote(note)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const NotesLayout: React.FC<NotesLayoutProps> = ({ user, users = [], initialNoteId, className }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Share Dialog
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [folderToShare, setFolderToShare] = useState<Folder | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Subscriptions
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribeFolders = subscribeToFolders(user.uid, setFolders);
    return () => unsubscribeFolders();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const sharedFolderIds = folders
      .filter(f => f.ownerId !== user.uid && f.collaborators?.includes(user.uid))
      .map(f => f.id)
      .slice(0, 10);

    const unsubscribeNotes = subscribeToNotes(user.uid, sharedFolderIds, (fetchedNotes) => {
      setNotes(fetchedNotes);
      setIsLoading(false);
    });
    return () => unsubscribeNotes();
  }, [user?.uid, JSON.stringify(folders.map(f => f.id))]);

  // Sync selected note with updates
  useEffect(() => {
    if (selectedNote) {
      const updated = notes.find(n => n.id === selectedNote.id);
      if (updated && updated !== selectedNote) {
        setSelectedNote(updated);
      }
    }
  }, [notes, selectedNote?.id]);

  // Handle initial note selection
  useEffect(() => {
    if (initialNoteId && notes.length > 0) {
      const target = notes.find(n => n.id === initialNoteId || n._id === initialNoteId);
      if (target && target.id !== selectedNote?.id) setSelectedNote(target);
    }
  }, [initialNoteId, notes]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(n => 
      n.title?.toLowerCase().includes(q) || 
      JSON.stringify(n.content)?.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  // Categorized data
  const myFolders = folders.filter(f => f.ownerId === user?.uid);
  const sharedFolders = folders.filter(f => f.ownerId !== user?.uid);
  const myUnorganizedNotes = filteredNotes.filter(n => !n.folderId && n.ownerId === user?.uid);

  // Handlers
  const handleCreateNote = async (folderId?: string) => {
    if (!user?.uid) return;
    try {
      const noteRef = await createNote({
        title: 'Untitled',
        ownerId: user.uid,
        folderId: folderId || null
      });
      const newNote: Note = {
        id: noteRef.id,
        _id: noteRef.id,
        title: 'Untitled',
        content: [],
        ownerId: user.uid,
        folderId: folderId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSelectedNote(newNote);
    } catch (error) {
      toast.error("Failed to create note");
    }
  };

  const handleCreateFolder = async () => {
    if (!user?.uid) return;
    try {
      await createFolder({ name: 'New Folder', ownerId: user.uid, type: 'personal' });
      toast.success("Folder created");
    } catch (error) {
      toast.error("Failed to create folder");
    }
  };

  const executeShare = async () => {
    if (!folderToShare || !selectedUserId) return;
    try {
      await shareFolder(folderToShare.id, [selectedUserId]);
      toast.success("Folder shared");
      setShareDialogOpen(false);
    } catch (error) {
      toast.error("Failed to share folder");
    }
  };

  // Breadcrumb path
  const breadcrumb = useMemo(() => {
    if (!selectedNote) return [];
    const parts: string[] = [];
    if (selectedNote.folderId) {
      const folder = folders.find(f => f.id === selectedNote.folderId);
      if (folder) parts.push(folder.name);
    } else {
      parts.push('My Notes');
    }
    parts.push(selectedNote.title || 'Untitled');
    return parts;
  }, [selectedNote, folders]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="animate-spin mr-2" /> Loading Notes...
      </div>
    );
  }

  return (
    <div className={cn("flex h-full bg-background overflow-hidden", className)}>
      {/* ═══════════════════════════════════════════════════════════════════
          LEFT PANEL: Notes List (300px fixed)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="w-[300px] shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar-background">
        
        {/* Sticky Header: Search + Actions */}
        <div className="sticky top-0 z-10 p-3 space-y-3 bg-sidebar-background border-b border-sidebar-border/50">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-sidebar-accent border border-sidebar-border rounded-md pl-9 pr-3 py-2 text-sm text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors duration-200"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="flex-1 h-8 text-xs text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200"
              onClick={handleCreateFolder}
            >
              <FolderPlus size={14} className="mr-1.5" /> Folder
            </Button>
            <Button 
              size="sm" 
              className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200"
              onClick={() => handleCreateNote()}
            >
              <Plus size={14} className="mr-1.5" /> Note
            </Button>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin">
          
          {/* Shared With Me */}
          {sharedFolders.length > 0 && (
            <div>
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary flex items-center gap-1.5">
                <Users size={10} /> Shared with me
              </div>
              {sharedFolders.map(folder => (
                <FolderListItem
                  key={folder.id}
                  folder={folder}
                  notes={filteredNotes.filter(n => n.folderId === folder.id)}
                  selectedNoteId={selectedNote?.id || null}
                  isOwner={false}
                  onSelectNote={setSelectedNote}
                  onCreateNote={() => handleCreateNote(folder.id)}
                  onShare={() => {}}
                />
              ))}
            </div>
          )}

          {/* My Folders */}
          {myFolders.length > 0 && (
            <div>
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Folders
              </div>
              {myFolders.map(folder => (
                <FolderListItem
                  key={folder.id}
                  folder={folder}
                  notes={filteredNotes.filter(n => n.folderId === folder.id)}
                  selectedNoteId={selectedNote?.id || null}
                  isOwner={true}
                  onSelectNote={setSelectedNote}
                  onCreateNote={() => handleCreateNote(folder.id)}
                  onShare={() => { setFolderToShare(folder); setShareDialogOpen(true); }}
                />
              ))}
            </div>
          )}

          {/* My Unorganized Notes */}
          <div>
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Notes
            </div>
            <div className="space-y-0.5">
              {myUnorganizedNotes.map(note => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isSelected={selectedNote?.id === note.id}
                  onClick={() => setSelectedNote(note)}
                />
              ))}
              {myUnorganizedNotes.length === 0 && !searchQuery && (
                <p className="text-xs text-muted-foreground/60 px-3 py-2">No notes yet</p>
              )}
              {searchQuery && filteredNotes.length === 0 && (
                <p className="text-xs text-muted-foreground/60 px-3 py-2">No results found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT PANEL: Editor Canvas (Flex-1)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        
        {selectedNote && user ? (
          <>
            {/* Slim Sticky Top Bar */}
            <div className="h-12 shrink-0 sticky top-0 z-10 flex items-center justify-between px-4 border-b border-border/50 backdrop-blur-md bg-background/80">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
                {breadcrumb.map((part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <ChevronRight size={12} className="text-border" />}
                    <span className={cn(
                      "truncate",
                      i === breadcrumb.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {part}
                    </span>
                  </React.Fragment>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200">
                  <LinkIcon size={14} className="mr-1.5" /> Link Task
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200">
                  <Share2 size={14} className="mr-1.5" /> Share
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200">
                      <MoreHorizontal size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem>Move to folder</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Editor Canvas - Centered with max-width */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="max-w-3xl mx-auto py-8 px-6">
                <NoteEditor
                  key={selectedNote.id}
                  note={selectedNote}
                  user={{ uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL }}
                  onUpdate={(updated) => setSelectedNote(updated)}
                />
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="mb-6 p-6 bg-secondary/30 rounded-2xl border border-border">
              <FilePenLine size={40} className="text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No note selected</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
              Select a note from the sidebar or create a new one to start writing.
            </p>
            <Button 
              onClick={() => handleCreateNote()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200"
            >
              <Plus size={16} className="mr-2" /> Create Note
            </Button>
          </div>
        )}
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Folder</DialogTitle>
            <DialogDescription>
              Share "{folderToShare?.name}" with a team member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.filter(u => u.uid !== user?.uid).map(u => (
                  <SelectItem key={u.uid} value={u.uid}>
                    {u.displayName || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShareDialogOpen(false)}>Cancel</Button>
            <Button onClick={executeShare} disabled={!selectedUserId}>
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotesLayout;

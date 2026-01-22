import React, { useState, useEffect, useRef } from 'react';
import { Folder, Note, createFolder, createNote, shareFolder, updateNote, deleteNote, duplicateNote } from '../../services/notesService';
import {
  Plus,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FolderItem } from './sidebar/FolderItem';
import { NoteItem } from './sidebar/NoteItem';

interface NotesSidebarProps {
  userId: string;
  folders: Folder[];
  notes: Note[];
  selectedNoteId: string | null;
  users?: any[];
  onSelectNote: (note: Note) => void;
  onRefresh: () => void;
  className?: string;
}

export const NotesSidebar: React.FC<NotesSidebarProps> = ({
  userId, folders, notes, selectedNoteId, users = [], onSelectNote, onRefresh, className
}) => {
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Optimistic deletion state
  const [hiddenNoteIds, setHiddenNoteIds] = useState<Set<string>>(new Set());

  // Resizable & Collapsible State
  const [width, setWidth] = useState(256);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load Preferences
  useEffect(() => {
    const storedWidth = localStorage.getItem('ZYNC-sidebar-width');
    if (storedWidth) setWidth(parseInt(storedWidth));
    const storedCollapsed = localStorage.getItem('ZYNC-sidebar-collapsed');
    if (storedCollapsed) setIsCollapsed(storedCollapsed === 'true');
  }, []);

  // Resize Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(e.clientX - (sidebarRef.current?.getBoundingClientRect().left || 0), 160), 480);
      setWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('ZYNC-sidebar-width', width.toString());
      }
    };
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isResizing, width]);

  const toggleCollapse = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('ZYNC-sidebar-collapsed', newState.toString());
    if (!newState) setIsHovered(false);
  };

  // Share Dialog State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [folderToShare, setFolderToShare] = useState<Folder | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const handleShareClick = (folder: Folder) => {
    setFolderToShare(folder);
    setShareDialogOpen(true);
    setSelectedUserId("");
  };

  const executeShare = async () => {
    if (!folderToShare || !selectedUserId) return;
    try {
      await shareFolder(folderToShare.id, [selectedUserId]);
      toast.success(`Folder shared successfully`);
      setShareDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error("Failed to share folder", error);
      toast.error("Failed to share folder");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder({ name: newFolderName, ownerId: userId, type: 'personal' });
      setNewFolderName('');
      setNewFolderMode(false);
      onRefresh();
    } catch (error) {
      console.error("Failed to create folder", error);
    }
  };

  const handleCreateNote = async (folderId?: string) => {
    try {
      const initialData = {
        title: 'Untitled',
        ownerId: userId,
        folderId: folderId || null
      };
      const noteRef = await createNote(initialData);

      const newNote: Note = {
        id: noteRef.id,
        _id: noteRef.id,
        content: [],
        createdAt: new Date(), // Local optimisitc update
        updatedAt: new Date(),
        ...initialData
      };

      onRefresh();
      onSelectNote(newNote);
    } catch (error) {
      console.error("Failed to create note", error);
    }
  };

  // Note actions
  const handleDeleteNote = async (noteId: string) => {
    // Optimistic UI update
    setHiddenNoteIds(prev => new Set(prev).add(noteId));

    try {
      await deleteNote(noteId);
      toast.success("Note deleted");
      onRefresh();
    } catch (error) {
      setHiddenNoteIds(prev => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
      toast.error("Failed to delete note");
    }
  };

  const handleDuplicateNote = async (noteId: string) => {
    try {
      await duplicateNote(noteId, null, userId); // Duplicate to root or same folder? Service handles logic
      toast.success("Note duplicated");
      onRefresh();
    } catch (error) {
      toast.error("Failed to duplicate note");
    }
  };

  const handleRenameNote = async (noteId: string, newTitle: string) => {
    try {
      await updateNote(noteId, { title: newTitle });
      onRefresh();
    } catch (error) {
      toast.error("Failed to rename note");
    }
  };

  // Split folders and notes
  const myFolders = folders.filter(f => f.ownerId === userId);
  const sharedFolders = folders.filter(f => f.ownerId !== userId); // Should be covered by subscription filter

  // Filter out hidden notes (optimistic delete)
  const visibleNotes = notes.filter(n => !hiddenNoteIds.has(n.id));
  const myUnorganizedNotes = visibleNotes.filter(n => !n.folderId && n.ownerId === userId);

  // DnD State
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData("noteId", noteId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData("noteId");
    if (!noteId) return;

    try {
      await updateNote(noteId, { folderId: targetFolderId });
      toast.success("Note moved");
      onRefresh();
    } catch (err) {
      toast.error("Failed to move note");
    }
  };

  // Clipboard State for Copy/Paste
  const [clipboardNoteId, setClipboardNoteId] = useState<string | null>(null);

  const handleCopy = (noteId: string) => {
    setClipboardNoteId(noteId);
    toast.info("Note copied to clipboard");
  };

  const handlePaste = async (targetFolderId: string | null) => {
    if (!clipboardNoteId) return;
    try {
      await duplicateNote(clipboardNoteId, targetFolderId, userId);
      toast.success("Note pasted");
      onRefresh();
      // Don't clear clipboard to allow multiple pastes
    } catch (err) {
      console.error(err);
      toast.error("Failed to paste note");
    }
  };

  const effectiveCollapsed = isCollapsed && !isHovered;
  const isFloating = isCollapsed && isHovered;

  return (
    <div
      ref={sidebarRef}
      className={cn("relative h-full shrink-0 group/sidebar bg-background/60 backdrop-blur-xl border-r border-border/50 supports-[backdrop-filter]:bg-background/60 z-50", className)}
      style={{ width: isCollapsed ? 64 : width }}
    >
      <div
        className={cn(
          "h-full flex flex-col bg-transparent text-foreground overflow-hidden",
          isFloating ? "absolute inset-y-0 left-0 z-50 shadow-xl w-[width]px border-r bg-background" : "w-full"
        )}
        style={{ width: isFloating ? width : '100%', transition: 'width 0.2s ease-out' }}
        onMouseEnter={() => {
          if (isCollapsed) {
            hoverTimeoutRef.current = setTimeout(() => {
              setIsHovered(true);
            }, 300);
          }
        }}
        onMouseLeave={() => {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          if (isCollapsed) {
            setIsHovered(false);
          }
        }}
      >
        <div className={cn("p-4 border-b flex items-center sticky top-0 backdrop-blur-sm z-10 bg-secondary/30 border-border/50", effectiveCollapsed ? "justify-center" : "justify-between")}>
          {!effectiveCollapsed && <span className="font-semibold text-sm tracking-wide font-serif-elegant text-foreground truncate">Zync Notes</span>}

          <div className="flex items-center gap-1">
            {!effectiveCollapsed && (
              <button onClick={() => setNewFolderMode(true)} className="p-1 rounded hover:bg-black/5 text-gray-500 hover:text-black dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white" title="New Folder">
                <Plus size={16} />
              </button>
            )}
            <button onClick={toggleCollapse} className="p-1 rounded hover:bg-black/5 text-gray-500 hover:text-black dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white" title={isCollapsed ? "Expand" : "Collapse"}>
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-1">
          {/* New Folder Input */}
          {newFolderMode && !effectiveCollapsed && (
            <div className="flex items-center px-2 py-1 mb-2 rounded-sm shadow-sm border bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-600">
              <input
                id="new-folder-name"
                name="folderName"
                autoFocus
                className="w-full text-sm outline-none bg-transparent px-1 py-0.5 text-gray-900 placeholder:text-gray-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                value={newFolderName}
                placeholder="Folder Name..."
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                onBlur={() => setNewFolderMode(false)}
              />
            </div>
          )}

          {/* SHARED SECTION */}
          {sharedFolders.length > 0 && (
            <div className="mb-4">
              {!effectiveCollapsed && (
                <div className="px-2 text-xs font-bold uppercase mb-2 tracking-wider text-indigo-500/80 dark:text-indigo-400/80 flex items-center gap-2">
                  <Users size={12} /> Shared with Me
                </div>
              )}
              {sharedFolders.map(folder => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  notes={visibleNotes.filter(n => n.folderId === folder.id)}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={onSelectNote}
                  onCreateNote={() => handleCreateNote(folder.id)}
                  onShare={() => handleShareClick(folder)}
                  isOwner={false} // Shared folders not owned by me
                  isCollapsed={effectiveCollapsed}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onCopy={handleCopy}
                  onPaste={handlePaste}
                  canPaste={!!clipboardNoteId}
                  onDeleteNote={handleDeleteNote}
                  onDuplicateNote={handleDuplicateNote}
                  onRenameNote={handleRenameNote}
                />
              ))}
              <div className="h-px bg-border/40 my-2 mx-2" />
            </div>
          )}

          {/* MY FOLDERS */}
          {(!effectiveCollapsed || myFolders.length > 0) && (
            <div className="mb-1">
              {!effectiveCollapsed && <div className="px-2 text-xs font-bold uppercase mb-2 tracking-wider text-gray-500/80 dark:text-muted-foreground/70">My Folders</div>}
              {myFolders.map(folder => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  notes={visibleNotes.filter(n => n.folderId === folder.id)}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={onSelectNote}
                  onCreateNote={() => handleCreateNote(folder.id)}
                  onShare={() => handleShareClick(folder)}
                  isOwner={true}
                  isCollapsed={effectiveCollapsed}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onCopy={handleCopy}
                  onPaste={handlePaste}
                  canPaste={!!clipboardNoteId}
                  onDeleteNote={handleDeleteNote}
                  onDuplicateNote={handleDuplicateNote}
                  onRenameNote={handleRenameNote}
                />
              ))}
            </div>
          )}

          {/* MY UNORGANIZED NOTES */}
          <div className="mt-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)} // Drop to root
          >
            {!effectiveCollapsed && <div className="px-2 text-xs font-bold uppercase mb-2 tracking-wider text-gray-500/80 dark:text-muted-foreground/70">My Notes</div>}
            {effectiveCollapsed && <div className="h-px bg-border/50 w-8 mx-auto my-2" />}

            {myUnorganizedNotes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                selectedNoteId={selectedNoteId}
                isCollapsed={effectiveCollapsed}
                onSelect={onSelectNote}
                onDragStart={handleDragStart}
                onDelete={handleDeleteNote}
                onDuplicate={handleDuplicateNote}
                onRename={handleRenameNote}
                onCopy={handleCopy}
              />
            ))}

            <button
              onClick={() => handleCreateNote()}
              className={cn(
                "w-full flex items-center rounded-md text-xs mt-1 group text-gray-500 hover:text-gray-900 dark:text-muted-foreground/60 dark:hover:text-foreground transition-all",
                effectiveCollapsed ? "justify-center py-2 hover:bg-black/5 dark:hover:bg-white/5" : "text-left px-2 py-1.5"
              )}
              title="New Note"
            >
              <Plus size={16} className={cn("group-hover:scale-110 transition-transform", effectiveCollapsed ? "" : "mr-2")} />
              {!effectiveCollapsed && "New Note"}
            </button>
          </div>
        </div>

        {/* Search/Resize Handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 hover:w-1.5 transition-all z-20"
            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
          />
        )}

      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Folder</DialogTitle>
            <DialogDescription>
              Invite users to collaborate on <strong>{folderToShare?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="user" className="text-right text-sm font-medium">
                User
              </label>
              <div className="col-span-3">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(u => u.uid !== userId && (!folderToShare?.collaborators?.includes(u.uid)))
                      .map((user) => (
                        <SelectItem key={user.uid} value={user.uid}>
                          {user.displayName || user.email}
                        </SelectItem>
                      ))}
                    {users.length === 0 && <div className="p-2 text-sm text-muted-foreground">No other users found</div>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>Cancel</Button>
            <Button onClick={executeShare} disabled={!selectedUserId}>
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

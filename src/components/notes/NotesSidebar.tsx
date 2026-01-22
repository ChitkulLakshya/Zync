import React, { useState, useEffect, useRef } from 'react';
import { Folder, Note, createFolder, createNote, shareFolder, updateNote, deleteNote, duplicateNote } from '../../services/notesService';
import {
  Plus,
  Folder as FolderIcon,
  FileText,
  ChevronRight,
  ChevronDown,
  Share2,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  File
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

interface FolderItemProps {
  folder: Folder;
  notes: Note[];
  selectedNoteId: string | null;
  isOwner: boolean;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  onShare: () => void;
  isCollapsed: boolean;
  // DnD & Copy/Paste Props
  onDragStart: (e: React.DragEvent, noteId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetFolderId: string | null) => void;
  onCopy: (noteId: string) => void;
  onPaste: (folderId: string | null) => void;
  canPaste: boolean;
  // Actions
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (id: string) => void;
  onRenameNote: (id: string, newTitle: string) => void;
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder, notes, selectedNoteId, isOwner, onSelectNote, onCreateNote, onShare, isCollapsed,
  onDragStart, onDragOver, onDrop, onCopy, onPaste, canPaste,
  onDeleteNote, onDuplicateNote, onRenameNote
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOverFolder, setIsDragOverFolder] = useState(false);

  return (
    <div
      className={cn(
        "mb-1 select-none rounded-md transition-colors",
        isDragOverFolder && "bg-zinc-800/50 ring-2 ring-primary/20"
      )}
      onDragOver={(e) => {
        onDragOver(e);
        if (!isDragOverFolder) setIsDragOverFolder(true);
      }}
      onDragLeave={() => setIsDragOverFolder(false)}
      onDrop={(e) => {
        e.stopPropagation(); // prevent dropping on parent
        setIsDragOverFolder(false);
        onDrop(e, folder.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (canPaste) onPaste(folder.id);
      }}
    >
      <div
        className={cn(
          "flex items-center rounded-md cursor-pointer group text-gray-600 hover:bg-gray-200/50 hover:text-gray-900 dark:text-muted-foreground dark:hover:bg-secondary/50 dark:hover:text-foreground transition-all",
          isCollapsed ? "justify-center px-0 py-2" : "px-2 py-1.5 text-sm"
        )}
        onClick={() => !isCollapsed && setIsOpen(!isOpen)}
        title={isCollapsed ? folder.name : undefined}
      >
        {!isCollapsed && (
          <span className="mr-1 opacity-70">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        <FolderIcon size={isCollapsed ? 18 : 14} className={cn("transition-colors", isCollapsed ? "" : "mr-2", folder.collaborators?.length ? "text-blue-500" : "text-gray-400 group-hover:text-indigo-600 dark:text-muted-foreground dark:group-hover:text-primary")} />

        {!isCollapsed && <span className="font-medium flex-1 truncate">{folder.name}</span>}

        {!isCollapsed && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isOwner && (
              <button
                onClick={(e) => { e.stopPropagation(); onShare(); }}
                className="p-1 mr-1 hover:bg-background rounded text-muted-foreground hover:text-blue-500 shadow-sm"
                title="Share folder"
              >
                <Share2 size={12} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onCreateNote(); setIsOpen(true); }}
              className="p-1 hover:bg-background rounded text-muted-foreground hover:text-primary shadow-sm"
              title="New note"
            >
              <Plus size={12} />
            </button>
          </div>
        )}
      </div>

      {isOpen && !isCollapsed && (
        <div className="ml-4 pl-3 border-l border-border/40 mt-1 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              selectedNoteId={selectedNoteId}
              isCollapsed={false}
              onSelect={onSelectNote}
              onDragStart={onDragStart}
              onDelete={onDeleteNote}
              onDuplicate={onDuplicateNote}
              onRename={onRenameNote}
              onCopy={onCopy}
            />
          ))}
          {notes.length === 0 && <div className="text-xs text-muted-foreground/50 px-2 py-1 italic">Empty folder</div>}
        </div>
      )}
    </div>
  );
};

interface NoteItemProps {
  note: Note;
  selectedNoteId: string | null;
  isCollapsed: boolean;
  onSelect: (note: Note) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onCopy: (id: string) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({
  note, selectedNoteId, isCollapsed, onSelect, onDragStart,
  onDelete, onDuplicate, onRename, onCopy
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(note.title);

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== note.title) {
      onRename(note.id, renameValue);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setRenameValue(note.title);
      setIsRenaming(false);
    }
  };

  if (isRenaming) {
    return (
      <div className="px-2 py-1">
        <input
          autoFocus
          className="w-full text-sm bg-background border border-primary px-1 py-0.5 rounded outline-none"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          draggable
          onDragStart={(e) => onDragStart(e, note.id)}
          onClick={() => onSelect(note)}
          onContextMenu={() => onCopy(note.id)} // Keep existing quick copy or let Context Menu handle it? Context Menu will override this naturally on right click.
          // Note: ContextMenuTrigger handles the right click automatically.
          className={cn(
            "w-full text-left flex items-center rounded-sm text-sm mb-1 font-serif-elegant tracking-wide transition-all",
            isCollapsed ? "justify-center px-0 py-2" : "px-2 py-1.5 border-l-2",
            selectedNoteId === note.id
              ? (isCollapsed
                ? "bg-gray-200 text-indigo-600 dark:bg-white/10 dark:text-primary rounded-md"
                : "bg-gray-200 text-gray-900 font-medium border-l-2 border-indigo-500/50 dark:bg-white/10 dark:border-indigo-400 dark:text-white")
              : (isCollapsed
                ? "text-gray-400 hover:text-gray-900 dark:text-slate-500 dark:hover:text-slate-200"
                : "border-transparent border-l-2 text-gray-600 hover:bg-gray-200/50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200")
          )}
          title={isCollapsed ? (note.title || "Untitled") : undefined}
        >
          <FileText size={16} className={cn(selectedNoteId === note.id ? "text-indigo-600 dark:text-primary" : "opacity-70", isCollapsed ? "" : "mr-2")} />
          {!isCollapsed && <span className="truncate">{note.title || "Untitled"}</span>}
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => setIsRenaming(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          <span>Rename</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDuplicate(note.id)}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Duplicate</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDelete(note.id)}
          className="text-red-500 focus:text-red-500 focus:bg-red-100 dark:focus:bg-red-900/20"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Folder, Note, createFolder, createNote, shareFolder } from '../../api/notes';
import { Plus, Folder as FolderIcon, FileText, ChevronRight, ChevronDown, Share2, Users, PanelLeftClose, PanelLeftOpen, GripVertical } from 'lucide-react';
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
      await shareFolder(folderToShare._id, [selectedUserId]);
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
      const note = await createNote({
        title: 'Untitled',
        ownerId: userId,
        folderId: folderId
      });
      onRefresh();
      onSelectNote(note);
    } catch (error) {
      console.error("Failed to create note", error);
    }
  };

  // Group notes by folder
  const unorganizedNotes = notes.filter((n) => !n.folderId);

  const effectiveCollapsed = isCollapsed && !isHovered;
  const isFloating = isCollapsed && isHovered;

  return (
    <div
      ref={sidebarRef}
      className={cn("relative h-full shrink-0 group/sidebar bg-background/60 backdrop-blur-xl border-r border-border/50 supports-[backdrop-filter]:bg-background/60", className)}
      style={{ width: isCollapsed ? 64 : width }}
    >
      <div
        className={cn(
          "h-full flex flex-col bg-transparent text-foreground overflow-hidden",
          isFloating ? "absolute inset-y-0 left-0 z-50 shadow-2xl w-[width]px border-r bg-background/95 backdrop-blur-xl" : "w-full"
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
          {!effectiveCollapsed && <span className="font-semibold text-sm tracking-wide font-serif-elegant text-foreground truncate">ZYNC Notes</span>}

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

          {/* Folders Loop */}
          {folders.map(folder => (
            <FolderItem
              key={folder._id}
              folder={folder}
              notes={notes.filter(n => n.folderId === folder._id)}
              selectedNoteId={selectedNoteId}
              onSelectNote={onSelectNote}
              onCreateNote={() => handleCreateNote(folder._id)}
              onShare={() => handleShareClick(folder)}
              isOwner={folder.ownerId === userId}
              isCollapsed={effectiveCollapsed}
            />
          ))}

          {/* Unorganized Notes */}
          <div className="mt-4">
            {!effectiveCollapsed && <div className="px-2 text-xs font-bold uppercase mb-2 tracking-wider text-gray-500/80 dark:text-muted-foreground/70">My Notes</div>}
            {effectiveCollapsed && <div className="h-px bg-border/50 w-8 mx-auto my-2" />}

            {unorganizedNotes.map(note => (
              <button
                key={note._id}
                onClick={() => onSelectNote(note)}
                className={cn(
                  "w-full text-left flex items-center rounded-sm text-sm mb-1 font-serif-elegant tracking-wide transition-all",
                  effectiveCollapsed ? "justify-center px-0 py-2" : "px-2 py-1.5 border-l-2",
                  selectedNoteId === note._id
                    ? (effectiveCollapsed
                      ? "bg-gray-200 text-indigo-600 dark:bg-white/10 dark:text-primary rounded-md"
                      : "bg-gray-200 text-gray-900 font-medium border-l-2 border-indigo-500/50 dark:bg-white/10 dark:border-indigo-400 dark:text-white")
                    : (effectiveCollapsed
                      ? "text-gray-400 hover:text-gray-900 dark:text-slate-500 dark:hover:text-slate-200"
                      : "border-transparent border-l-2 text-gray-600 hover:bg-gray-200/50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200")
                )}
                title={effectiveCollapsed ? (note.title || "Untitled") : undefined}
              >
                <FileText size={16} className={cn(selectedNoteId === note._id ? "text-indigo-600 dark:text-primary" : "opacity-70", effectiveCollapsed ? "" : "mr-2")} />
                {!effectiveCollapsed && <span className="truncate">{note.title || "Untitled"}</span>}
              </button>
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

      { /* ... Dialogs ... */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        {/* ... Dialog Content ... (Keep existing) */}
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
}

const FolderItem: React.FC<FolderItemProps> = ({ folder, notes, selectedNoteId, isOwner, onSelectNote, onCreateNote, onShare, isCollapsed }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-1 select-none">
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
            <button
              key={note._id}
              onClick={() => onSelectNote(note)}
              className={cn(
                "w-full text-left flex items-center px-2 py-1.5 rounded-md text-sm border-l-2",
                selectedNoteId === note._id
                  ? "bg-gray-200 text-gray-900 font-medium border-l-2 border-indigo-500/50 dark:bg-primary/10 dark:border-primary dark:text-primary dark:shadow-[0_0_15px_-3px_hsl(var(--primary)/0.3)]"
                  : "border-transparent text-gray-600 hover:bg-gray-200/50 hover:text-gray-900 dark:text-muted-foreground dark:hover:bg-secondary/50 dark:hover:text-foreground"
              )}
            >
              <FileText size={14} className={cn("mr-2", selectedNoteId === note._id ? "text-indigo-600 dark:text-primary" : "opacity-70")} />
              <span className="truncate">{note.title || "Untitled"}</span>
            </button>
          ))}
          {notes.length === 0 && <div className="text-xs text-muted-foreground/50 px-2 py-1 italic">Empty folder</div>}
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react';
import { Folder, Note, createFolder, createNote, shareFolder } from '../../api/notes';
import { Plus, Folder as FolderIcon, FileText, ChevronRight, ChevronDown, Share2, Users } from 'lucide-react';
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
      onRefresh(); // Refresh to update potentially (though collaborators update might not be visible immediately in sidebar unless we show icon)
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
  
  return (
    <div className={cn("w-64 bg-secondary/30 border-r border-border/50 h-full flex flex-col", className)}>
      <div className="p-4 border-b border-border/50 flex justify-between items-center sticky top-0 bg-background/50 backdrop-blur-sm z-10 transition-colors">
        <span className="font-semibold text-sm text-foreground">Library</span>
        <button onClick={() => setNewFolderMode(true)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors">
           <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-1">
        {/* New Folder Input */}
        {newFolderMode && (
           <div className="flex items-center px-2 py-1 mb-2 bg-background border border-border rounded-md shadow-sm">
             <input 
               autoFocus
               className="w-full text-sm outline-none bg-transparent px-1 py-0.5 text-foreground placeholder:text-muted-foreground"
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
           />
        ))}

        {/* Unorganized Notes */}
        <div className="mt-4">
          <div className="px-2 text-xs font-bold text-muted-foreground/70 uppercase mb-2 tracking-wider">My Notes</div>
          {unorganizedNotes.map(note => (
            <button
              key={note._id}
              onClick={() => onSelectNote(note)}
              className={cn(
                "w-full text-left flex items-center px-2 py-1.5 rounded-md text-sm mb-1 transition-all",
                selectedNoteId === note._id 
                  ? "bg-white dark:bg-zinc-800 shadow-sm ring-1 ring-border/50 text-foreground font-medium" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <FileText size={14} className={cn("mr-2", selectedNoteId === note._id ? "text-primary" : "opacity-70")} />
              <span className="truncate">{note.title || "Untitled"}</span>
            </button>
          ))}
          <button 
             onClick={() => handleCreateNote()}
             className="w-full text-left flex items-center px-2 py-1.5 rounded-md text-xs text-muted-foreground/60 hover:text-foreground mt-1 transition-colors group"
          >
             <Plus size={12} className="mr-2 group-hover:scale-110 transition-transform" /> New Note
          </button>
        </div>
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
}

const FolderItem: React.FC<FolderItemProps> = ({ folder, notes, selectedNoteId, isOwner, onSelectNote, onCreateNote, onShare }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="mb-1 select-none">
      <div 
        className="flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer group transition-colors text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mr-1 opacity-70">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <FolderIcon size={14} className={cn("mr-2 transition-colors", folder.collaborators?.length ? "text-blue-500" : "text-muted-foreground group-hover:text-primary")} />
        <span className="font-medium flex-1 truncate">{folder.name}</span>
        
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
           {isOwner && (
            <button 
                onClick={(e) => { e.stopPropagation(); onShare(); }}
                className="p-1 mr-1 hover:bg-background rounded text-muted-foreground hover:text-blue-500 transition-all shadow-sm"
                title="Share folder"
            >
                <Share2 size={12} />
            </button>
           )}
           <button 
            onClick={(e) => { e.stopPropagation(); onCreateNote(); setIsOpen(true); }}
            className="p-1 hover:bg-background rounded text-muted-foreground hover:text-primary transition-all shadow-sm"
            title="New note"
           >
            <Plus size={12} />
           </button>
        </div>
      </div>
      
      {isOpen && (
        <div className="ml-4 pl-3 border-l border-border/40 mt-1 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
          {notes.map((note) => (
            <button
              key={note._id}
              onClick={() => onSelectNote(note)}
              className={cn(
                "w-full text-left flex items-center px-2 py-1.5 rounded-md text-sm transition-all",
                selectedNoteId === note._id 
                  ? "bg-white dark:bg-zinc-800 shadow-sm ring-1 ring-border/50 text-foreground font-medium" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <FileText size={14} className={cn("mr-2", selectedNoteId === note._id ? "text-primary" : "opacity-70")} />
              <span className="truncate">{note.title || "Untitled"}</span>
            </button>
          ))}
           {notes.length === 0 && <div className="text-xs text-muted-foreground/50 px-2 py-1 italic">Empty folder</div>}
        </div>
      )}
    </div>
  )
}

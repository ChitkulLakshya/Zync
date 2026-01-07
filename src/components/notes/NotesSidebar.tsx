import React, { useState } from 'react';
import { Folder, Note, createFolder, createNote } from '../../api/notes';
import { Plus, Folder as FolderIcon, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from "@/lib/utils";

interface NotesSidebarProps {
  userId: string;
  folders: Folder[];
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onRefresh: () => void;
  className?: string;
}

export const NotesSidebar: React.FC<NotesSidebarProps> = ({ 
  userId, folders, notes, selectedNoteId, onSelectNote, onRefresh, className
}) => {
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

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
    </div>
  );
};

interface FolderItemProps {
    folder: Folder;
    notes: Note[];
    selectedNoteId: string | null;
    onSelectNote: (note: Note) => void;
    onCreateNote: () => void;
}

const FolderItem: React.FC<FolderItemProps> = ({ folder, notes, selectedNoteId, onSelectNote, onCreateNote }) => {
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
        <FolderIcon size={14} className="mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="font-medium flex-1 truncate">{folder.name}</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onCreateNote(); setIsOpen(true); }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded text-muted-foreground hover:text-primary transition-all shadow-sm"
        >
          <Plus size={12} />
        </button>
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

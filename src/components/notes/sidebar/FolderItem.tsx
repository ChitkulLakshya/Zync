import React, { useState } from 'react';
import { Folder, Note } from '../../../services/notesService';
import {
    Folder as FolderIcon,
    ChevronRight,
    ChevronDown,
    Share2,
    Plus
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { NoteItem } from './NoteItem';

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

export const FolderItem: React.FC<FolderItemProps> = ({
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

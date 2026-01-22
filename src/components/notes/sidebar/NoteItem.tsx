import React, { useState } from 'react';
import { Note } from '../../../services/notesService';
import {
    FileText,
    MoreVertical,
    Pencil,
    Copy,
    Trash2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

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

export const NoteItem: React.FC<NoteItemProps> = ({
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
                    onContextMenu={() => onCopy(note.id)}
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

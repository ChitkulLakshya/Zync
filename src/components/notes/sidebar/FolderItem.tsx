/**
 * @fileoverview FolderItem.tsx
 * @module FolderItem
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license AGPL-3.0-only
 * ============================================================================
 */
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

    onDragStart: (e: React.DragEvent, noteId: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, targetFolderId: string | null) => void;
    onCopy: (noteId: string) => void;
    onPaste: (folderId: string | null) => void;
    canPaste: boolean;

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
                isDragOverFolder && "bg-secondary/20 ring-2 ring-border/10"
            )}
            onDragOver={(e) => {
                onDragOver(e);
                if (!isDragOverFolder) {setIsDragOverFolder(true);}
            }}
            onDragLeave={() => setIsDragOverFolder(false)}
            onDrop={(e) => {
                e.stopPropagation();
                setIsDragOverFolder(false);
                onDrop(e, folder.id);
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                if (canPaste) {onPaste(folder.id);}
            }}
        >
            <div
                className={cn(
                    "flex items-center rounded-md cursor-pointer group text-muted-foreground hover:bg-secondary/20 hover:text-foreground transition-all",
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
                <FolderIcon size={isCollapsed ? 18 : 14} className={cn("transition-colors", isCollapsed ? "" : "mr-2", folder.collaborators?.length ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />

                {!isCollapsed && <span className="font-medium flex-1 truncate">{folder.name}</span>}

                {!isCollapsed && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {isOwner && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onShare(); }}
                                className="p-1 mr-1 hover:bg-background rounded text-muted-foreground hover:text-foreground shadow-sm"
                                title="Share folder"
                            >
                                <Share2 size={12} />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onCreateNote(); setIsOpen(true); }}
                            className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground shadow-sm"
                            title="New note"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                )}
            </div>

            {isOpen && !isCollapsed && (
                <div className="ml-4 pl-3 border-l border-border/10 mt-1 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
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

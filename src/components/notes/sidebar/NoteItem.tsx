/**
 * @fileoverview NoteItem.tsx
 * @module NoteItem
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
 * @author Chitkul Lakshya <chitkullakshya@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
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
        if (e.key === 'Enter') {handleRenameSubmit();}
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
                    className="w-full text-sm bg-background border border-border/10 px-1 py-0.5 rounded outline-none focus:ring-1 focus:ring-border/20"
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
                                ? "bg-secondary/20 text-foreground rounded-md"
                                : "bg-secondary/20 text-foreground font-medium border-l-2 border-foreground/20")
                            : (isCollapsed
                                ? "text-muted-foreground hover:text-foreground"
                                : "border-transparent border-l-2 text-muted-foreground hover:bg-secondary/10 hover:text-foreground")
                    )}
                    title={isCollapsed ? (note.title || "Untitled") : undefined}
                >
                    <FileText size={16} className={cn(selectedNoteId === note.id ? "text-foreground" : "opacity-70", isCollapsed ? "" : "mr-2")} />
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

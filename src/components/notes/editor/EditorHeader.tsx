/**
 * @fileoverview EditorHeader.tsx
 * @module EditorHeader
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
 * @license Proprietary and Confidential
 * ============================================================================
 */
import React from 'react';
import { Note } from '../../../services/notesService';
import { CollaboratorAvatars } from '../CollaboratorAvatars';
import { cn } from "@/lib/utils";
import {
    CheckCircle2,
    Calendar,
    Clock,
    User as UserIcon,
} from 'lucide-react';

interface EditorHeaderProps {
    note: Note;
    user: { uid: string; displayName?: string; email?: string };
    title: string;
    status: 'Saved' | 'Saving...';
    isEditable: boolean;
    activeUsers: any[];
    onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
    note, user, title, status, isEditable, activeUsers, onTitleChange
}) => {
    return (
        <>
            <div className="flex items-center gap-3 mb-8 min-h-[28px]">
                <CollaboratorAvatars activeUsers={activeUsers} maxVisible={5} size="md" />

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                    {status === 'Saving...' ? (
                        <>
                            <Clock size={11} className="opacity-50" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={11} className="text-emerald-500" />
                            <span className="text-emerald-500">Saved</span>
                        </>
                    )}
                    {!isEditable && (
                        <span className="ml-2 px-2 py-0.5 bg-secondary/20 text-foreground rounded text-[10px] uppercase font-bold tracking-wider border border-border/10">
                            Read Only
                        </span>
                    )}
                </div>
            </div>

            {}
            <input
                id="note-title"
                name="title"
                value={title || ''}
                onChange={onTitleChange}
                placeholder="Untitled"
                disabled={!isEditable}
                className={cn(
                    "text-4xl font-bold outline-none bg-transparent w-full text-foreground placeholder:text-muted-foreground/40 mb-4 tracking-tight leading-tight",
                    !isEditable && "cursor-default opacity-80"
                )}
            />

            {/* Metadata Row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-8 pb-6 border-b border-border/10">
                <div className="flex items-center gap-1.5">
                    <UserIcon size={11} />
                    <span>{user.displayName || "You"}</span>
                </div>
                <span className="text-zinc-700">·</span>
                <div className="flex items-center gap-1.5">
                    <Calendar size={11} />
                    <span>
                        {note.createdAt ? (() => {
                            const date = new Date(note.createdAt);
                            return isNaN(date.getTime()) ? 'Just now' : date.toLocaleDateString();
                        })() : 'Just now'}
                    </span>
                </div>
            </div>
        </>
    );
};

/**
 * @fileoverview notesService.ts
 * @module notesService
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
import { getAuthHeaders } from '@/lib/auth-headers';
import { API_BASE_URL } from '@/lib/utils';

export interface Folder {
    id: string;
    _id?: string;
    name: string;
    ownerId: string;
    parentId: string | null;
    type: 'personal' | 'team' | 'project';
    color: string;
    collaborators?: string[];
}

export interface Note {
    id: string;
    _id?: string;
    title: string;
    content: any;
    ownerId: string;
    folderId: string | null;
    createdAt?: any;
    updatedAt: any;
    isPinned?: boolean;
    permissions?: Record<string, 'viewer' | 'editor' | 'owner'>;
}



/**
 * Replaces Firestore onSnapshot subscription with a one-shot fetch + polling.
 * Returns an unsubscribe function to cancel the interval.
 */
export const subscribeToFolders = (userId: string, callback: (folders: Folder[]) => void) => {
    let cancelled = false;

    const fetchFolders = async () => {
        try {
            const h = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/api/notes/folders`, { headers: h });
            if (res.ok && !cancelled) {
                const data = await res.json();
                const mapped = data.map((f: any) => ({ ...f, id: f.id || f._id, _id: f.id || f._id }));
                callback(mapped);
            }
        } catch (err) {
            console.error('[notesService] fetchFolders error:', err);
        }
    };

    fetchFolders();
    const interval = setInterval(fetchFolders, 10000);

    return () => {
        cancelled = true;
        clearInterval(interval);
    };
};

export const subscribeToNotes = (userId: string, sharedFolderIds: string[], callback: (notes: Note[]) => void) => {
    let cancelled = false;

    const fetchNotes = async () => {
        try {
            const h = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/api/notes`, { headers: h });
            if (res.ok && !cancelled) {
                const data = await res.json();
                const mapped = data.map((n: any) => ({ ...n, id: n.id || n._id, _id: n.id || n._id }));
                callback(mapped);
            }
        } catch (err) {
            console.error('[notesService] fetchNotes error:', err);
        }
    };

    fetchNotes();
    const interval = setInterval(fetchNotes, 10000);

    return () => {
        cancelled = true;
        clearInterval(interval);
    };
};


export const createFolder = async (data: Partial<Omit<Folder, 'id' | '_id'>>) => {
    const h = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/notes/folders`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
            parentId: null,
            type: 'personal',
            color: '#3b82f6',
            ...data
        })
    });
    if (!res.ok) {throw new Error('Failed to create folder');}
    return res.json();
};

export const createNote = async (data: Partial<Omit<Note, 'id' | '_id' | 'createdAt' | 'updatedAt'>>) => {
    const h = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
            folderId: null,
            content: [],
            ...data
        })
    });
    if (!res.ok) {throw new Error('Failed to create note');}
    return res.json();
};

export const updateNote = async (id: string, data: Partial<Note>) => {
    const h = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
        method: 'PUT',
        headers: h,
        body: JSON.stringify(data)
    });
    if (!res.ok) {throw new Error('Failed to update note');}
    return res.json();
};

export const deleteNote = async (id: string) => {
    const h = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
        method: 'DELETE',
        headers: h
    });
    if (!res.ok) {throw new Error('Failed to delete note');}
    return res.json();
};

export const updateFolder = async (id: string, data: Partial<Folder>) => {
    const h = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/notes/folders/${id}`, {
        method: 'PUT',
        headers: h,
        body: JSON.stringify(data)
    });
    if (!res.ok) {throw new Error('Failed to update folder');}
    return res.json();
};

export const deleteFolder = async (id: string) => {
    const h = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/notes/folders/${id}`, {
        method: 'DELETE',
        headers: h
    });
    if (!res.ok) {throw new Error('Failed to delete folder');}
    return res.json();
};

export const shareFolder = async (folderId: string, collaboratorIds: string[]) => {
    const h = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/notes/folders/${folderId}/share`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ collaboratorIds })
    });
    if (!res.ok) {throw new Error('Failed to share folder');}
    return res.json();
};

export const unshareFolder = async (folderId: string, userId: string) => {
    const h = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/notes/folders/${folderId}/unshare`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ userId })
    });
    if (!res.ok) {throw new Error('Failed to unshare folder');}
    return res.json();
};

export const getNote = async (id: string): Promise<Note | null> => {
    try {
        const h = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, { headers: h });
        if (!res.ok) {return null;}
        const data = await res.json();
        return { ...data, id: data.id || data._id, _id: data.id || data._id };
    } catch {
        return null;
    }
};

export const duplicateNote = async (originalNoteId: string, targetFolderId: string | null, userId: string) => {
    const originalNote = await getNote(originalNoteId);
    if (!originalNote) { throw new Error("Note not found"); }

    return await createNote({
        title: `${originalNote.title} (Copy)`,
        content: originalNote.content,
        ownerId: userId,
        folderId: targetFolderId,
        isPinned: false
    });
};

export const updateNotePermissions = async (noteId: string, permissions: Record<string, string>) => {
    const h = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: 'PUT',
        headers: h,
        body: JSON.stringify({ permissions })
    });
    if (!res.ok) {throw new Error('Failed to update permissions');}
    return res.json();
};

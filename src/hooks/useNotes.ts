/**
 * @fileoverview useNotes.ts
 * @module useNotes
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Imports the useQuery, useMutation, and useQueryClient hooks from the @tanstack/react-query library, which are used for data fetching and caching.
import { fetchNotes, createNote, updateNote, deleteNote, Note } from "@/api/notes"; // Imports the fetchNotes, createNote, updateNote, and deleteNote functions from the @/api/notes module, which are used to interact with the notes API, and the Note type, which represents a note object.
import { auth } from "@/lib/firebase"; // Imports the auth object from the @/lib/firebase module, which is used to interact with the Firebase authentication system.

export const useNotes = (folderId?: string) => { // Defines a custom hook called useNotes, which takes an optional folderId parameter and returns a result object.
    const user = auth.currentUser; // Retrieves the current user from the Firebase authentication system and assigns it to the user variable.
    return useQuery<Note[]>({ // Uses the useQuery hook to fetch and cache notes data, and returns the result object.
        queryKey: folderId ? ['notes', folderId] : ['notes', 'all'], // Sets the query key to either ['notes', folderId] or ['notes', 'all'] depending on whether a folderId is provided, which is used to cache the query result.
        queryFn: () => fetchNotes(user?.uid || "", folderId), // Defines the query function to fetch notes, which calls the fetchNotes function with the user's UID and the folderId, and returns the result.
        enabled: !!user, // Enables the query only if a user is logged in, which prevents the query from running when no user is logged in.
        refetchOnMount: false, // Disables refetching the query on mount, which prevents the query from refetching when the component mounts.
    });
};

export const usePinnedNotes = () => { // Defines a custom hook called usePinnedNotes, which returns a result object.
    const user = auth.currentUser; // Retrieves the current user from the Firebase authentication system and assigns it to the user variable.
    return useQuery<Note[]>({ // Uses the useQuery hook to fetch and cache pinned notes data, and returns the result object.
        queryKey: ['notes', 'pinned'], // Sets the query key to ['notes', 'pinned'], which is used to cache the query result.
        queryFn: async () => { // Defines the query function to fetch pinned notes, which is an asynchronous function.
            const allNotes = await fetchNotes(user?.uid || ""); // Fetches all notes for the current user and assigns the result to the allNotes variable.
            return allNotes.filter(note => note.isPinned); // Filters the allNotes array to only include notes that are pinned and returns the result.
        },
        enabled: !!user, // Enables the query only if a user is logged in, which prevents the query from running when no user is logged in.
        refetchOnMount: false, // Disables refetching the query on mount, which prevents the query from refetching when the component mounts.
    });
};

export const useNoteMutations = () => { // Defines a custom hook called useNoteMutations, which returns an object with mutation functions.
    const queryClient = useQueryClient(); // Retrieves the query client instance from the useQueryClient hook, which is used to interact with the query cache.
    const createNoteMutation = useMutation({ // Uses the useMutation hook to create a mutation for creating notes, and returns the result object.
        mutationFn: createNote, // Sets the mutation function to the createNote function, which is used to create a new note.
        onSuccess: () => { // Defines the success callback function, which is called when the mutation is successful.
            queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidates the query cache for the 'notes' query key, which triggers a refetch of the query.
        },
    });
    const updateNoteMutation = useMutation({ // Uses the useMutation hook to create a mutation for updating notes, and returns the result object.
        mutationFn: ({ id, data }: { id: string; data: any }) => updateNote(id, data), // Sets the mutation function to the updateNote function, which is used to update an existing note.
        onSuccess: () => { // Defines the success callback function, which is called when the mutation is successful.
            queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidates the query cache for the 'notes' query key, which triggers a refetch of the query.
        },
    });
    const deleteNoteMutation = useMutation({ // Uses the useMutation hook to create a mutation for deleting notes, and returns the result object.
        mutationFn: deleteNote, // Sets the mutation function to the deleteNote function, which is used to delete a note.
        onSuccess: () => { // Defines the success callback function, which is called when the mutation is successful.
            queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidates the query cache for the 'notes' query key, which triggers a refetch of the query.
        },
    });
    return { // Returns an object with the mutation functions and a pending state.
        createNote: createNoteMutation.mutate, // Exposes the createNote mutation function.
        updateNote: updateNoteMutation.mutate, // Exposes the updateNote mutation function.
        deleteNote: deleteNoteMutation.mutate, // Exposes the deleteNote mutation function.
        isPending: createNoteMutation.isPending || updateNoteMutation.isPending || deleteNoteMutation.isPending, // Returns a boolean indicating whether any of the mutations are pending.
    };
};
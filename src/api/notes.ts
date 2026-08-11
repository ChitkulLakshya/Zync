/**
 * @fileoverview notes.ts
 * @module notes
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
import { API_BASE_URL } from '../lib/utils';
import { getAuthHeaders } from '../lib/auth-headers';

const API_URL = `${API_BASE_URL}/api/notes`;

export interface Folder {
  _id: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  type: 'personal' | 'team' | 'project';
  color: string;
  collaborators?: string[];
}

export interface Note {
  _id: string;
  title: string;
  content: any;
  ownerId: string;
  folderId: string | null;
  createdAt?: string;
  updatedAt: string;
  isPinned?: boolean;
}

export const fetchFolders = async (userId: string): Promise<Folder[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/folders?userId=${userId}`, { headers });
  if (!response.ok) {throw new Error('Failed to fetch folders');}
  return response.json();
};

export const createFolder = async (data: { name: string; ownerId: string; parentId?: string; type?: string }) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/folders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {throw new Error('Failed to create folder');}
  return response.json();
};

export const shareFolder = async (folderId: string, collaboratorIds: string[]) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/folders/${folderId}/share`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ collaboratorIds }),
  });
  if (!response.ok) {throw new Error('Failed to share folder');}
  return response.json();
};

export const fetchNotes = async (userId: string, folderId?: string): Promise<Note[]> => {
  const headers = await getAuthHeaders();
  const url = folderId
    ? `${API_URL}?userId=${userId}&folderId=${folderId}`
    : `${API_URL}?userId=${userId}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {throw new Error('Failed to fetch notes');}
  return response.json();
};

export const createNote = async (data: { title: string; ownerId: string; folderId?: string; content?: any }) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {throw new Error('Failed to create note');}
  return response.json();
};

export const updateNote = async (id: string, data: any) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {throw new Error('Failed to update note');}
  return response.json();
};

export const deleteNote = async (id: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) {throw new Error('Failed to delete note');}
  return response.json();
};

/**
 * @fileoverview useGitHubData.ts
 * @module useGitHubData
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
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/utils";
import { auth } from "@/lib/firebase";

export interface GitHubStats {
    login: string;
    name: string;
    avatar_url: string;
    bio: string;
    public_repos: number;
    followers: number;
    following: number;
    html_url: string;
    created_at: string;
    connected?: boolean;
}

export interface GitHubEvent {
    id: string;
    type: string;
    repo: string;
    created_at: string;
    actor?: {
        login?: string;
        avatar_url?: string;
        html_url?: string;
    } | null;
    payload: {
        action?: string;
        ref?: string;
        commits?: { sha: string; message: string }[];
    };
}

export interface Contribution {
    date: string;
    count: number;
}

const fetchWithAuth = async (url: string) => {
    const user = auth.currentUser;
    if (!user) {throw new Error("User not authenticated");}
    
    const token = await user.getIdToken();
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText}`);
    }
    
    return res.json();
};

export const useGitHubStats = (enabled: boolean) => {
    return useQuery<GitHubStats>({
        queryKey: ['github', 'stats'],
        queryFn: () => fetchWithAuth(`${API_BASE_URL}/api/github/stats`),
        enabled,
    });
};

export const useGitHubEvents = (enabled: boolean) => {
    return useQuery<GitHubEvent[]>({
        queryKey: ['github', 'events'],
        queryFn: () => fetchWithAuth(`${API_BASE_URL}/api/github/events`),
        enabled,
    });
};

export const useGitHubContributions = (year: number, enabled: boolean) => {
    return useQuery<Contribution[]>({
        queryKey: ['github', 'contributions', year],
        queryFn: () => fetchWithAuth(`${API_BASE_URL}/api/github/contributions?year=${year}`),
        enabled,
        placeholderData: keepPreviousData,
    });
};

export interface Repository {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string;
    stargazers_count: number;
    forks_count: number;
    language: string;
    visibility: string;
    updated_at: string;
    owner: {
        login: string;
        avatar_url: string;
    };
    homepage?: string;
    topics?: string[];
}

export interface GitHubReposResponse {
    repos: Repository[];
    hasNextPage: boolean;
    page: number;
}

export const useGitHubRepos = (enabled: boolean, page: number = 1) => {
    return useQuery<GitHubReposResponse>({
        queryKey: ['github', 'repos', page],
        queryFn: async () => {
            const data = await fetchWithAuth(`${API_BASE_URL}/api/github/repos?page=${page}`);
            return {
                repos: data.repos || (Array.isArray(data) ? data : []),
                hasNextPage: data.hasNextPage || false,
                page: data.page || page
            };
        },
        enabled,
    });
};

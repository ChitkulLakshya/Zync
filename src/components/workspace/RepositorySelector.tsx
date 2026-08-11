/**
 * @fileoverview RepositorySelector.tsx
 * @module RepositorySelector
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
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Github } from '@/components/ui/GithubIcon';;
import { API_BASE_URL } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Repo {
  id: string;
  name: string;
  full_name: string;
}

export function RepositorySelector({ projectId, currentRepoIds = [] }: { projectId: string; currentRepoIds?: string[] }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const token = await import('@/lib/firebase').then(m => m.auth.currentUser?.getIdToken());
      if (!token) {return;}

      const res = await fetch(`${API_BASE_URL}/api/github/repos?per_page=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.repos) {
        setRepos(data.repos);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error fetching repositories' });
    } finally {
      setLoading(false);
    }
  };

  const linkRepo = async () => {
    if (!selectedRepoId) {return;}
    setConnecting(true);
    try {
      const token = await import('@/lib/firebase').then(m => m.auth.currentUser?.getIdToken());

      const res = await fetch(`${API_BASE_URL}/api/link/link-repo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ projectId, githubRepoId: selectedRepoId })
      });

      if (!res.ok) {throw new Error('Failed to link');}

      toast({ title: 'Success', description: 'Repository linked! Listening for commits.' });
      setSelectedRepoId('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to link repository' });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1 space-y-2">
        <label className="text-sm font-medium">Link GitHub Repository</label>
        <Select value={selectedRepoId} onValueChange={setSelectedRepoId} disabled={loading}>
          <SelectTrigger>
             <SelectValue placeholder={loading ? "Loading..." : "Select a repository"} />
          </SelectTrigger>
          <SelectContent>
            {repos.map(repo => (
              <SelectItem key={repo.id} value={repo.id}>
                {repo.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={linkRepo} disabled={!selectedRepoId || connecting}>
        {!connecting && <Github className="mr-2 h-4 w-4" />}
        {connecting ? "Linking..." : "Link"}
      </Button>
    </div>
  );
}

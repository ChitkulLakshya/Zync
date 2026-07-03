/**
 * @fileoverview ShareDialog.tsx
 * @module ShareDialog
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
import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { updateNotePermissions } from '../../../services/notesService';

interface ShareDialogProps {
    noteId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    currentPermissions?: Record<string, 'viewer' | 'editor' | 'owner'>;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
    noteId,
    isOpen,
    onOpenChange,
    currentPermissions = {}
}) => {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<'viewer' | 'editor'>('editor');
    const [loading, setLoading] = useState(false);


    const publicLink = `${window.location.origin}/notes/${noteId}`;

    const handleInvite = async () => {
        if (!email) {return;}
        setLoading(true);
        try {


            toast.info("Invite by email coming soon! Please share the link.");

        } catch (e: any) {
            toast.error("Failed to invite user");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveCollaborator = async (userId: string) => {
        if (!currentPermissions) {return;}

        const newPermissions = { ...currentPermissions };
        delete newPermissions[userId];

        try {
            await updateNotePermissions(noteId, newPermissions);
            toast.success("Collaborator removed");
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to remove collaborator");
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(publicLink);
        toast.success("Link copied to clipboard");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share Note</DialogTitle>
                    <DialogDescription>
                        Collaborate with others on this note.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">

                    {}
                    <div className="space-y-2">
                        <Label>Note Link</Label>
                        <div className="flex gap-2">
                            <Input readOnly value={publicLink} className="flex-1" />
                            <Button variant="outline" onClick={copyLink}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {}
                    <div className="space-y-2">
                        <Label>Invite by Email (Coming Soon)</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="colleague@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Button disabled={loading || !email} onClick={handleInvite}>
                                {loading ? "Inviting..." : "Invite"}
                            </Button>
                        </div>
                    </div>

                    {}
                    {Object.keys(currentPermissions).length > 0 && (
                        <div className="space-y-2">
                            <Label>People with access</Label>
                            <div className="text-sm text-muted-foreground border border-border/10 rounded-xl bg-secondary/5 p-2">
                                {}
                                {Object.entries(currentPermissions).map(([uid, role]) => (
                                    <div key={uid} className="flex justify-between items-center py-2 border-b border-border/10 last:border-0">
                                        <span className="font-mono text-xs">{uid.slice(0, 8)}...</span>
                                        <div className="flex items-center gap-2">
                                            <span className="capitalize text-xs bg-secondary px-2 py-0.5 rounded">{role}</span>
                                            {role !== 'owner' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleRemoveCollaborator(uid)}
                                                >
                                                    ×
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

/**
 * @fileoverview CreateTeamDialog.tsx
 * @module CreateTeamDialog
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
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTeamPersistence } from '@/hooks/useTeamPersistence';
import ProfilePhotoCropper from '@/components/ProfilePhotoCropper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const TEAM_TYPES = [
  { value: 'Product', label: 'Product' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Management', label: 'Management' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Design', label: 'Design' },
  { value: 'Other', label: 'Other' },
];

export const CreateTeamDialog = ({ open, onOpenChange, onSuccess }: CreateTeamDialogProps) => {
  const [teamName, setTeamName] = useState('');
  const [teamType, setTeamType] = useState('Product');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [invites, setInvites] = useState<{ email: string }[]>([]);
  const [currentInvite, setCurrentInvite] = useState('');

  const { createTeamSync } = useTeamPersistence(auth.currentUser?.uid);
  const queryClient = useQueryClient();

  const createTeamMutation = useMutation({
    mutationFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/teams/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: teamName,
          type: teamType,
          initialInvites: invites.map((i) => i.email),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create team');
      }

      if (selectedFile) {
        const teamId = data.id || data._id;
        const formData = new FormData();
        formData.append('file', selectedFile);
        try {
          const uploadRes = await fetch(`${API_BASE_URL}/api/upload/team-photo/${teamId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            data.logoId = uploadData.logoId;
          }
        } catch (e) {
          console.warn('Failed to upload team photo:', e);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success('Team created successfully!');


      if (data && auth.currentUser) {
        createTeamSync(
          data.id || data._id,
          data.name,
          auth.currentUser.uid,
          data.inviteCode,
          data.logoId || ''
        );
      }


      queryClient.invalidateQueries({ queryKey: ['me', auth.currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['myTeams', auth.currentUser?.uid] });

      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);
      setTeamName('');
      setInvites([]);
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (error: any) => {
      console.error('Error creating team:', error);
      toast.error(error.message);
    },
  });

  const handleAddInvite = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (
      (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') ||
      !currentInvite.trim()
    ) {
      return;
    }
    e.preventDefault();

    if (invites.some((i) => i.email === currentInvite)) {
      toast.error('User already added');
      return;
    }

    setInvites([...invites, { email: currentInvite }]);
    setCurrentInvite('');
  };

  const removeInvite = (email: string) => {
    setInvites(invites.filter((i) => i.email !== email));
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }
    createTeamMutation.mutate();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCropperImage(reader.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'team-photo.jpg', { type: 'image/jpeg' });
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(croppedBlob));
    setCropperOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>Start a new team to collaborate with others.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              placeholder="e.g. Engineering Alpha"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Team Type</Label>
            <Select value={teamType} onValueChange={setTeamType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Team Logo</Label>
            <div className="flex flex-col items-center justify-center p-6 border border-border/10 rounded-2xl bg-card/50 backdrop-blur-md">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
              <div
                className="relative h-28 w-28 rounded-full border-2 border-border/20 bg-background flex items-center justify-center cursor-pointer overflow-hidden group shadow-elevation2 transition-all hover:border-border/50"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground group-hover:text-foreground transition-colors">
                    <Camera className="h-10 w-10 mb-1" />
                    <span className="text-xs uppercase font-bold tracking-wider">Upload</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Recommended size: 500x500px
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Invite Members (Optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="colleague@example.com"
                value={currentInvite}
                onChange={(e) => setCurrentInvite(e.target.value)}
                onKeyDown={handleAddInvite}
              />
              <Button type="button" onClick={handleAddInvite} variant="secondary">
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {invites.map((invite) => (
                <div
                  key={invite.email}
                  className="bg-card/50 border border-border/10 backdrop-blur-md text-foreground px-2 py-1 rounded-lg text-sm flex items-center gap-1"
                >
                  {invite.email}
                  <button
                    onClick={() => removeInvite(invite.email)}
                    className="hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateTeam} disabled={createTeamMutation.isPending}>
            {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ProfilePhotoCropper
        open={cropperOpen}
        imageSrc={cropperImage}
        title="Adjust Team Photo"
        onClose={() => setCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </Dialog>
  );
};

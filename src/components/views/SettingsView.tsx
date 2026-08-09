/**
 * @fileoverview SettingsView.tsx
 * @module SettingsView
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
import { useState, useRef, useEffect, useCallback } from 'react';
import ProfilePhotoCropper from '@/components/ProfilePhotoCropper';
import { auth } from '@/lib/firebase';
import { signOutAndClearState } from '@/lib/auth-signout';
import {
  updateProfile,
  GithubAuthProvider,
  GoogleAuthProvider,
  linkWithPopup,
  getAdditionalUserInfo,
  onAuthStateChanged,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMe } from '@/hooks/useMe';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { DelayedLoaderGate } from '@/loading/DelayedLoaderGate';
import { Textarea } from '@/components/ui/textarea';
import { Camera, AlertTriangle, Check, ChevronsUpDown, Mail, Headphones, MessageSquare, Newspaper, UserMinus, Trash2, Copy, LogOut, Crown, Users, Bell, BellOff } from 'lucide-react';
import { Github } from '@/components/ui/GithubIcon';;
import { cn, API_BASE_URL, getFullUrl } from '@/lib/utils';
import { getLogoById, getDeterministicLogoId } from '@/lib/team-logos';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TeamLogoDisplay } from '@/components/ui/TeamLogoDisplay';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from 'next-themes';
import { useConfirm } from '@/hooks/use-confirm';

const countries = [
  { name: 'United States', code: 'US', dial_code: '+1', flag: '🇺🇸' },
  { name: 'India', code: 'IN', dial_code: '+91', flag: '🇮🇳' },
  { name: 'United Kingdom', code: 'GB', dial_code: '+44', flag: '🇬🇧' },
  { name: 'Canada', code: 'CA', dial_code: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', dial_code: '+61', flag: '🇦🇺' },
  { name: 'Germany', code: 'DE', dial_code: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dial_code: '+33', flag: '🇫🇷' },
  { name: 'Japan', code: 'JP', dial_code: '+81', flag: '🇯🇵' },
  { name: 'China', code: 'CN', dial_code: '+86', flag: '🇨🇳' },
  { name: 'Brazil', code: 'BR', dial_code: '+55', flag: '🇧🇷' },
];

interface SettingsViewProps {
  isPreview?: boolean;
  mockMe?: any;
  mockTeams?: any[];
}

export default function SettingsView({ isPreview, mockMe, mockTeams }: SettingsViewProps = {}) {
  const { data: realUserData, isLoading: isMeLoading } = useMe();
  const userData = isPreview && mockMe ? mockMe : realUserData;
  const [currentUser, setCurrentUser] = useState(isPreview && mockMe ? mockMe : auth.currentUser);
  const { confirm } = useConfirm();

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  const [teamsData, setTeamsData] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  useEffect(() => {
    if (isPreview) {
      return;
    }
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
  }, [isPreview]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  const [openCountry, setOpenCountry] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>('');

  const [deleteStep, setDeleteStep] = useState<'initial' | 'verifying'>('initial');
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportForm, setSupportForm] = useState({
    message: '',
  });

  const googleProvider = currentUser?.providerData?.find((p: any) => p.providerId === 'google.com');
  const isGoogleLinked = !!googleProvider;
  const isCalendarSynced = userData?.integrations?.google?.connected;

  const queryClient = useQueryClient();
  const isGitHubLinked = !!userData?.githubIntegration?.connected;

  const setUserData = useCallback(
    (updater: any) => {
      queryClient.setQueryData(['me', currentUser?.uid], updater);
    },
    [queryClient, currentUser?.uid]
  );

  const [profileForm, setProfileForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    displayName: '',
    country: '',
    countryCode: '',
    phoneNumber: '',
    photoURL: '',
  });

  useEffect(() => {
    if (userData) {
      setProfileForm({
        username: userData.username || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        displayName: userData.displayName || '',
        country: userData.country || '',
        countryCode: userData.countryCode || '',
        phoneNumber: userData.phoneNumber || '',
        photoURL: userData.photoURL || currentUser?.photoURL || '',
      });
    }
  }, [userData, currentUser]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${currentUser?.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      if (currentUser && profileForm.displayName) {
        await updateProfile(currentUser, {
          displayName: profileForm.displayName,
        });
      }

      if (res.ok) {
        toast({ title: 'Success', description: 'Profile updated successfully' });
        queryClient.invalidateQueries({ queryKey: ['me', currentUser?.uid] });
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmNewPin: '',
  });
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const handlePinUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.newPin !== pinForm.confirmNewPin) {
      toast({ title: 'Error', description: 'New PINs do not match.', variant: 'destructive' });
      return;
    }
    if (pinForm.newPin.length < 4 || pinForm.newPin.length > 6) {
      toast({ title: 'Error', description: 'New PIN must be 4-6 digits.', variant: 'destructive' });
      return;
    }

    setIsUpdatingPin(true);
    try {
      const idToken = await currentUser?.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/users/set-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          newPin: pinForm.newPin,
          currentPin: pinForm.currentPin || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update PIN');
      }

      toast({ title: 'Success', description: 'Security PIN updated successfully' });
      setPinForm({ currentPin: '', newPin: '', confirmNewPin: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!currentUser?.uid) {
        toast({ title: 'Error', description: 'You must be signed in.', variant: 'destructive' });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setCropperImage(reader.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);

      e.target.value = '';
    }
  };

  const handleCroppedUpload = useCallback(
    async (croppedBlob: Blob) => {
      setCropperOpen(false);
      if (!currentUser?.uid) {
        return;
      }

      setIsUploadingPhoto(true);
      try {
        const token = await currentUser.getIdToken();
        const formData = new FormData();
        formData.append('file', croppedBlob, 'profile.jpg');

        const response = await fetch(`${API_BASE_URL}/api/upload/profile-photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'Upload failed');
        }

        const data = await response.json();
        const photoURL = data.photoURL;

        setProfileForm((prev) => ({ ...prev, photoURL }));

        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL });
        }

        toast({ title: 'Success', description: 'Profile photo updated' });
        queryClient.invalidateQueries({ queryKey: ['me', currentUser?.uid] });
      } catch (error: any) {
        console.error('Upload error:', error);
        toast({
          title: 'Error',
          description: (error as Error).message || 'Failed to upload photo',
          variant: 'destructive',
        });
      } finally {
        setIsUploadingPhoto(false);
      }
    },
    [currentUser, queryClient]
  );

  const handleGithubConnect = async () => {
    setIsConnectingGithub(true);
    try {
      const provider = new GithubAuthProvider();
      provider.addScope('repo');
      provider.addScope('read:user');

      if (!auth.currentUser) {
        throw new Error('User must be signed in');
      }

      let accessToken: string | undefined;
      let githubUsername: string | undefined;

      try {
        const result = await linkWithPopup(auth.currentUser, provider);
        const credential = GithubAuthProvider.credentialFromResult(result);
        accessToken = credential?.accessToken;

        const details = getAdditionalUserInfo(result);
        githubUsername = details?.username || (details?.profile as any)?.login;
      } catch (linkError: any) {
        console.warn('Firebase Link Warning:', linkError.code);
        if (linkError.code === 'auth/credential-already-in-use') {
          const credential = GithubAuthProvider.credentialFromError(linkError);
          accessToken = credential?.accessToken;
        } else {
          throw linkError;
        }
      }

      if (!accessToken) {
        throw new Error('No Access Token retrieved from GitHub.');
      }

      if (!githubUsername) {
        try {
          const ghResponse = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (ghResponse.ok) {
            const ghData = await ghResponse.json();
            githubUsername = ghData.login;
          }
        } catch (e) {
          console.warn('Could not fetch username fallback', e);
        }
      }

      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/github/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          accessToken,
          username: githubUsername || 'GitHub User',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Backend connection failed');
      }

      const data = await response.json();
      toast({ title: 'Connected!', description: `Linked GitHub account: ${data.username}` });
      queryClient.invalidateQueries({ queryKey: ['me', currentUser?.uid] });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: error.message,
      });
    } finally {
      setIsConnectingGithub(false);
    }
  };

  const handleGithubDisconnect = async () => {
    const isConfirmed = await confirm({
      title: 'Unlink GitHub',
      description: 'Are you sure you want to unlink your GitHub account?',
      checkboxLabel: 'I confirm I want to unlink GitHub'
    });
    if (!isConfirmed) {
      return;
    }
    setIsConnectingGithub(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/github/disconnect`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to disconnect');
      }

      toast({ title: 'Disconnected', description: 'GitHub account unlinked.' });
      queryClient.invalidateQueries({ queryKey: ['me', currentUser?.uid] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsConnectingGithub(false);
    }
  };

  const handleGoogleConnect = async () => {
    setIsConnectingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');

      if (!auth.currentUser) {
        throw new Error('User must be signed in');
      }

      let accessToken: string | undefined;
      let googleEmail: string | undefined;

      try {
        const result = await linkWithPopup(auth.currentUser, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        accessToken = credential?.accessToken;

        const details = getAdditionalUserInfo(result);
        googleEmail = (details?.profile as any)?.email;
      } catch (linkError: any) {
        if (linkError.code === 'auth/credential-already-in-use') {
          const credential = GoogleAuthProvider.credentialFromError(linkError);
          accessToken = credential?.accessToken;
        } else if (linkError.code === 'auth/provider-already-linked') {
          const reauthResult = await reauthenticateWithPopup(auth.currentUser, provider);
          const credential = GoogleAuthProvider.credentialFromResult(reauthResult);
          accessToken = credential?.accessToken;
        } else {
          throw linkError;
        }
      }

      if (!accessToken) {
        throw new Error('No Access Token retrieved.');
      }

      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/google/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          accessToken,
          email: googleEmail || auth.currentUser.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Backend connection failed');
      }

      const data = await response.json();
      toast({ title: 'Connected!', description: `Linked Google Calendar: ${data.email}` });
      queryClient.invalidateQueries({ queryKey: ['me', currentUser?.uid] });
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Connection Failed', description: error.message });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    const isConfirmed = await confirm({
      title: 'Disconnect Google Calendar',
      description: 'Disconnect Google Calendar?',
      checkboxLabel: 'I confirm I want to disconnect Google Calendar'
    });
    if (!isConfirmed) {
      return;
    }
    setIsConnectingGoogle(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      await fetch(`${API_BASE_URL}/api/google/disconnect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });

      toast({ title: 'Disconnected', description: 'Google account unlinked.' });
      queryClient.invalidateQueries({ queryKey: ['me', currentUser?.uid] });
    } catch (err: any) {
      toast({ title: 'Error', variant: 'destructive', description: err.message });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  if (isMeLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex justify-center items-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportLoading(true);

    try {
      let firstName = 'User';
      let lastName = '';
      if (currentUser?.displayName) {
        const parts = currentUser.displayName.split(' ');
        firstName = parts[0];
        if (parts.length > 1) {
          lastName = parts.slice(1).join(' ');
        }
      }
      const email = currentUser?.email || 'No email provided';

      const res = await fetch(`${API_BASE_URL}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          message: supportForm.message,
        }),
      });

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        try {
          data = await res.json();
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
        }
      }

      if (!res.ok) {
        let errorMessage = data?.message || res.statusText || 'Failed to send message';

        if (errorMessage.includes('Invalid login') || res.status === 500) {
          console.error('Backend Error:', errorMessage);
          errorMessage =
            'Our support system is temporarily unavailable. Please try again later or email us directly.';
        }

        throw new Error(errorMessage);
      }

      toast({ title: 'Message Sent', description: "We'll get back to you soon!" });
      setSupportForm({
        message: '',
      });
    } catch (error: any) {
      console.error('Support Form Error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSupportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      if (deleteStep === 'initial') {
        const idToken = await currentUser?.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/users/delete/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ uid: currentUser?.uid }),
        });

        if (!res.ok) {
          throw new Error('Failed to send verification code');
        }

        toast({
          title: 'Verification Sent',
          description: 'Check your email for the confirmation code.',
        });
        setDeleteStep('verifying');
      } else {
        const idToken = await currentUser?.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/users/delete/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ uid: currentUser?.uid, code: deleteCode }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to verify code');
        }

        await signOutAndClearState(auth);
        window.location.href = '/';
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-transparent p-6 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <div className="w-full overflow-x-auto pb-1 scrollbar-thin">
            <TabsList className="bg-card/50 backdrop-blur-xl border border-border/10 inline-flex w-max min-w-full sm:min-w-0 whitespace-nowrap">
              <TabsTrigger value="profile" className="shrink-0">
                My Profile
              </TabsTrigger>

              <TabsTrigger value="preferences" className="shrink-0">
                Preferences
              </TabsTrigger>
              <TabsTrigger value="integrations" className="shrink-0">
                Integrations
              </TabsTrigger>
              <TabsTrigger value="support" className="shrink-0">
                Support
              </TabsTrigger>
              <TabsTrigger value="security" className="shrink-0">
                Security
              </TabsTrigger>
            </TabsList>
          </div>

          {}
          <TabsContent value="profile">
            <Card className="bg-card/50 border-border/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details here.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  {}
                  <div className="flex flex-col items-center justify-center mb-6">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Avatar className="w-24 h-24 border-2 border-border">
                        <AvatarImage src={getFullUrl(profileForm.photoURL)} />
                        <AvatarFallback className="text-2xl">
                          {profileForm.firstName?.[0]}
                          {profileForm.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-primary-foreground" />
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Click to change profile photo
                    </p>
                  </div>

                  {}
                  <ProfilePhotoCropper
                    open={cropperOpen}
                    imageSrc={cropperImage}
                    onClose={() => setCropperOpen(false)}
                    onCropComplete={handleCroppedUpload}
                  />

                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={profileForm.displayName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, displayName: e.target.value })
                      }
                      placeholder="e.g. John Doe"
                    />
                    <p className="text-[0.8rem] text-muted-foreground">
                      This is how your name will appear to other users.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={profileForm.firstName}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, firstName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={profileForm.lastName}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, lastName: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 flex flex-col">
                      <Label>Country</Label>
                      <Popover open={openCountry} onOpenChange={setOpenCountry}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCountry}
                            className="w-full justify-between"
                          >
                            {profileForm.countryCode
                              ? countries.find(
                                  (country) => country.dial_code === profileForm.countryCode
                                )?.name
                              : 'Select country...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0">
                          <Command>
                            <CommandInput placeholder="Search country..." />
                            <CommandList>
                              <CommandEmpty>No country found.</CommandEmpty>
                              <CommandGroup>
                                {countries.map((country) => (
                                  <CommandItem
                                    key={country.code}
                                    value={country.name}
                                    onSelect={() => {
                                      setProfileForm({
                                        ...profileForm,
                                        country: country.name,
                                        countryCode: country.dial_code,
                                      });
                                      setOpenCountry(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        profileForm.countryCode === country.dial_code
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                    {country.flag} {country.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <div className="flex gap-2">
                        <div className="flex items-center justify-center px-3 border rounded-md bg-muted text-muted-foreground">
                          {profileForm.countryCode}
                        </div>
                        <Input
                          type="tel"
                          value={profileForm.phoneNumber}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              phoneNumber: e.target.value.replace(/\D/g, ''),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSavingProfile}>
                      {isSavingProfile ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/10 backdrop-blur-xl mt-6">
              <CardHeader>
                <CardTitle>Security PIN</CardTitle>
                <CardDescription>Set or update your security PIN (4-6 digits).</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePinUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current PIN</Label>
                    <Input
                      type="password"
                      maxLength={6}
                      value={pinForm.currentPin}
                      onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value.replace(/\D/g, '') })}
                      placeholder="Leave blank if setting for the first time"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>New PIN</Label>
                      <Input
                        type="password"
                        maxLength={6}
                        value={pinForm.newPin}
                        onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '') })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm New PIN</Label>
                      <Input
                        type="password"
                        maxLength={6}
                        value={pinForm.confirmNewPin}
                        onChange={(e) => setPinForm({ ...pinForm, confirmNewPin: e.target.value.replace(/\D/g, '') })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isUpdatingPin}>
                      {isUpdatingPin ? 'Updating...' : 'Update PIN'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {}
          <TabsContent value="integrations">
            <Card className="bg-card/50 border-border/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>
                  Manage your external connections to sync projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Github className="w-8 h-8" />
                    <div>
                      <p className="font-medium">GitHub</p>
                      <p className="text-sm text-muted-foreground">
                        {userData?.githubIntegration?.connected
                          ? `Connected as ${userData.githubIntegration.username}`
                          : 'Connect repositories to Zync.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={isGitHubLinked ? 'outline' : 'default'}
                    disabled={isConnectingGithub}
                    onClick={isGitHubLinked ? handleGithubDisconnect : handleGithubConnect}
                  >
                    {isConnectingGithub
                      ? 'Connecting...'
                      : isGitHubLinked
                        ? 'Disconnect'
                        : 'Connect GitHub'}
                  </Button>
                </div>

                {}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-8 h-8 flex items-center justify-center font-bold text-xl rounded-full',
                        isGoogleLinked || isCalendarSynced
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
                          : 'text-muted-foreground bg-muted'
                      )}
                    >
                      G
                    </div>
                    <div>
                      <p className="font-medium">Google Calendar</p>
                      <p className="text-sm text-muted-foreground">
                        {isCalendarSynced
                          ? `Connected as ${userData.integrations.google.email}`
                          : isGoogleLinked
                            ? `Linked as ${googleProvider?.email}. Enable Calendar?`
                            : 'Sync meetings and events.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={isCalendarSynced ? 'destructive' : 'secondary'}
                    onClick={isCalendarSynced ? handleGoogleDisconnect : handleGoogleConnect}
                    disabled={isConnectingGoogle}
                  >
                    {isCalendarSynced ? 'Disconnect' : isGoogleLinked ? 'Enable Sync' : 'Connect'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {}
          <TabsContent value="preferences">
            <Card className="bg-card/50 border-border/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle>App Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? (
                      <Bell className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Label>Push Notifications</Label>
                  </div>
                  <Button
                    variant={typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'outline' : 'default'}
                    size="sm"
                    onClick={async () => {
                      if (typeof Notification === 'undefined') { return; }
                      if (Notification.permission === 'granted') { return; }
                      const result = await Notification.requestPermission();
                      if (result === 'granted') {
                        toast({ title: 'Notifications Enabled', description: 'You will receive push notifications for tasks and meetings.' });
                      } else {
                        toast({ title: 'Notifications Blocked', description: 'Enable them in your browser settings to receive alerts.', variant: 'destructive' });
                      }
                    }}
                    disabled={typeof Notification !== 'undefined' && Notification.permission === 'granted'}
                  >
                    {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'Enabled' : 'Enable'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {}
          <TabsContent value="support">
            <div className="space-y-6">
              {}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Contact Us</h3>
                    <p className="text-muted-foreground mt-2">
                      Email, call, or complete the form to learn how Zync can solve your
                      collaboration needs.
                    </p>
                  </div>
                </div>

                {}
                <Card className="shadow-lg bg-card/50 border-border/10 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle>Get in Touch</CardTitle>
                    <CardDescription>You can reach us anytime</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4" onSubmit={handleSupportSubmit}>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="How can we help?"
                          className="min-h-[100px] resize-none"
                          maxLength={120}
                          value={supportForm.message}
                          onChange={(e) =>
                            setSupportForm({ ...supportForm, message: e.target.value })
                          }
                          required
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {supportForm.message.length}/120
                        </p>
                      </div>

                      <Button type="submit" className="w-full" disabled={supportLoading}>
                        {supportLoading ? 'Submitting...' : 'Submit'}
                      </Button>

                      <p className="text-xs text-center text-muted-foreground">
                        By contacting us, you agree to our{' '}
                        <a href="#" className="underline font-medium hover:text-primary">
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="#" className="underline font-medium hover:text-primary">
                          Privacy Policy
                        </a>
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card/50 border-border/10 backdrop-blur-xl">
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Headphones className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold">Customer Support</h4>
                      <p className="text-sm text-muted-foreground">
                        Our support team is available around the clock to address any concerns or
                        queries you may have.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/10 backdrop-blur-xl">
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold">Feedback and Suggestions</h4>
                      <p className="text-sm text-muted-foreground">
                        We value your feedback and are continuously working to improve Zync. Your
                        input is crucial in shaping our future.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/10 backdrop-blur-xl">
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Newspaper className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold">Media Inquiries</h4>
                      <p className="text-sm text-muted-foreground">
                        For media-related questions or press inquiries, please contact us at
                        consolemaster.app@gmail.com.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {}
          <TabsContent value="security">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Permanently remove your Personal Account and all of its contents from the Zync
                  platform. This action is not reversible, so please continue with caution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deleteStep === 'initial' ? (
                  <div className="space-y-4">
                    <div className="bg-destructive/10 p-4 rounded-md text-sm text-destructive font-medium border border-destructive/20">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      Warning: Deleting your account is irreversible.
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? 'Requesting...' : 'Request Account Deletion'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-sm">
                    <div className="space-y-2">
                      <Label>Verification Code</Label>
                      <p className="text-sm text-muted-foreground">
                        Please check your email <b>{currentUser?.email}</b> for the 6-digit
                        confirmation code.
                      </p>
                      <Input
                        value={deleteCode}
                        onChange={(e) => setDeleteCode(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading || deleteCode.length !== 6}
                      >
                        {deleteLoading ? 'Confirming...' : 'Confirm Deletion'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TeamTabContent({
  currentUser,
  userData,
  teamsData,
  setTeamsData,
  teamLoading,
  setTeamLoading,
  setUserData,
  isPreview,
  mockTeams,
}: any) {
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState('');
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [renameSaved, setRenameSaved] = useState(false);
  const teamNameInputRef = useRef<HTMLInputElement>(null);
  const renameSavedTimerRef = useRef<number | null>(null);
  const teamFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingTeamPhoto, setIsUploadingTeamPhoto] = useState(false);
  const [teamCropperOpen, setTeamCropperOpen] = useState(false);
  const [teamCropperImage, setTeamCropperImage] = useState('');
  const [transferOtpOpen, setTransferOtpOpen] = useState(false);
  const [transferOtp, setTransferOtp] = useState('');
  const [pendingTransferTarget, setPendingTransferTarget] = useState<{ id: string, name: string } | null>(null);

  const selectedTeam = teamsData.find((t: any) => (t.id || t._id) === selectedTeamId);


  useEffect(() => {
    if (teamsData.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teamsData[0].id || teamsData[0]._id);
    }
  }, [teamsData, selectedTeamId]);

  useEffect(() => {
    setTeamNameDraft(selectedTeam?.name || '');
    setIsEditingTeamName(false);
    setRenameSaved(false);
  }, [selectedTeamId, selectedTeam?.name]);

  useEffect(() => {
    if (!selectedTeam || !isEditingTeamName) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      teamNameInputRef.current?.focus();
      teamNameInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [selectedTeamId, selectedTeam, currentUser?.uid, isEditingTeamName]);

  useEffect(() => {
    return () => {
      if (renameSavedTimerRef.current) {
        window.clearTimeout(renameSavedTimerRef.current);
      }
    };
  }, []);

  const handleTeamFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setTeamCropperImage(reader.result as string);
        setTeamCropperOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleTeamCroppedUpload = async (croppedBlob: Blob) => {
    if (!currentUser?.uid || !selectedTeam) {return;}

    setTeamCropperOpen(false);
    setIsUploadingTeamPhoto(true);
    try {
      const token = await currentUser.getIdToken();
      const formData = new FormData();
      formData.append('file', croppedBlob, 'team-photo.jpg');

      const teamId = selectedTeam.id || selectedTeam._id;
      const response = await fetch(`${API_BASE_URL}/api/upload/team-photo/${teamId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Upload failed');
      }

      const data = await response.json();
      const logoId = data.logoId;

      setTeamsData((prev: any[]) =>
        prev.map((t) =>
          (t.id || t._id) === teamId ? { ...t, logoId } : t
        )
      );

      // Invalidate React Query cache so other views (People, ActivityLog) see the new photo
      queryClient.invalidateQueries({ queryKey: ['myTeams', currentUser.uid] });
      queryClient.invalidateQueries({ queryKey: ['me', currentUser.uid] });

      toast({ title: 'Success', description: 'Team photo updated successfully' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload team photo',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingTeamPhoto(false);
    }
  };

  const refreshTeamQueries = async () => {
    if (!currentUser?.uid) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['myTeams', currentUser.uid] }),
      queryClient.invalidateQueries({ queryKey: ['teamUsers'] }),
      queryClient.invalidateQueries({ queryKey: ['me', currentUser.uid] }),
      queryClient.invalidateQueries({ queryKey: ['allUsers', currentUser.uid] }),
    ]);
  };

  useEffect(() => {
    const fetchAllTeams = async () => {
      if (isPreview) {
        setTeamsData(mockTeams || []);
        setTeamLoading(false);
        return;
      }
      if (!currentUser) {
        setTeamsData([]);
        return;
      }

      setTeamLoading(true);
      try {
        const token = await currentUser.getIdToken();


        const mineRes = await fetch(`${API_BASE_URL}/api/teams/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!mineRes.ok) {
          setTeamsData([]);
          setTeamLoading(false);
          return;
        }

        const teams = await mineRes.json();
        if (!teams || teams.length === 0) {
          setTeamsData([]);
          setTeamLoading(false);
          return;
        }


        const detailPromises = teams.map(async (team: any) => {
          const teamId = team.id || team._id;
          try {
            const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/details`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              return await res.json();
            }
            return null;
          } catch {
            return null;
          }
        });

        const details = await Promise.all(detailPromises);
        setTeamsData(details.filter(Boolean));
      } catch (err) {
        console.error('Failed to fetch teams:', err);
        setTeamsData([]);
      } finally {
        setTeamLoading(false);
      }
    };

    fetchAllTeams();
  }, [currentUser, userData?.teamMemberships]);

  const handleRemoveMember = async (teamId: string, memberUid: string) => {
    if (!currentUser) {return;}
    const isConfirmed = await confirm({
      title: 'Remove Member',
      description: 'Remove this member from the team?',
      checkboxLabel: 'I confirm I want to remove this member'
    });
    if (!isConfirmed) {return;}

    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/members/${memberUid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to remove member');
      }

      toast({ title: 'Member Removed', description: 'Successfully removed from the team.' });
      setTeamsData((prev: any[]) =>
        prev.map((t) =>
          t.id === teamId
            ? {
                ...t,
                members: t.members.filter((uid: string) => uid !== memberUid),
                memberDetails: t.memberDetails.filter((m: any) => m.uid !== memberUid),
              }
            : t
        )
      );
      await refreshTeamQueries();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteAdmin = async (teamId: string, memberUid: string) => {
    if (!currentUser) {return;}
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/promote-admin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberUid }),
      });
      if (!res.ok) {throw new Error('Failed to promote member to admin');}
      toast({ title: 'Promoted', description: 'Member promoted to admin successfully.' });
      await refreshTeamQueries();
      const fetchTeams = async () => {
        const teamsRes = await fetch(`${API_BASE_URL}/api/teams`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if(teamsRes.ok) {
          const data = await teamsRes.json();
          setTeamsData(data);
        }
      };
      await fetchTeams();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemoteAdmin = async (teamId: string, memberUid: string) => {
    if (!currentUser) {return;}
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/demote-admin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberUid }),
      });
      if (!res.ok) {throw new Error('Failed to demote admin to member');}
      toast({ title: 'Demoted', description: 'Admin demoted to member successfully.' });
      await refreshTeamQueries();
      const fetchTeams = async () => {
        const teamsRes = await fetch(`${API_BASE_URL}/api/teams`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if(teamsRes.ok) {
          const data = await teamsRes.json();
          setTeamsData(data);
        }
      };
      await fetchTeams();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptMember = async (teamId: string, memberUid: string) => {
    if (!currentUser) {return;}
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/accept-member`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberUid }),
      });
      if (!res.ok) {throw new Error('Failed to accept member');}
      toast({ title: 'Accepted', description: 'Member accepted successfully.' });
      await refreshTeamQueries();
      const fetchTeams = async () => {
        const teamsRes = await fetch(`${API_BASE_URL}/api/teams`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if(teamsRes.ok) {
          const data = await teamsRes.json();
          setTeamsData(data);
        }
      };
      await fetchTeams();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectMember = async (teamId: string, memberUid: string) => {
    if (!currentUser) {return;}
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/reject-member`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberUid }),
      });
      if (!res.ok) {throw new Error('Failed to reject member');}
      toast({ title: 'Rejected', description: 'Member rejected successfully.' });
      await refreshTeamQueries();
      const fetchTeams = async () => {
        const teamsRes = await fetch(`${API_BASE_URL}/api/teams`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if(teamsRes.ok) {
          const data = await teamsRes.json();
          setTeamsData(data);
        }
      };
      await fetchTeams();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (!currentUser) {
      return;
    }
    const isConfirmed = await confirm({
      title: 'Leave Team',
      description: 'Are you sure you want to leave this team?',
      checkboxLabel: 'I confirm I want to leave this team'
    });
    if (!isConfirmed) {
      return;
    }

    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to leave team');
      }

      toast({ title: 'Left Team', description: 'You have left the team.' });
      setTeamsData((prev: any[]) => prev.filter((t) => t.id !== teamId));
      setUserData((prev: any) => ({
        ...prev,
        teamMemberships: prev.teamMemberships?.filter((id: string) => id !== teamId) || [],
      }));
      await refreshTeamQueries();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!currentUser) {
      return;
    }
    const isConfirmed = await confirm({
      title: 'Delete Team',
      description: 'Are you sure you want to DELETE this team? This action cannot be undone.',
      checkboxLabel: 'I confirm I want to delete this team'
    });
    if (!isConfirmed) {
      return;
    }

    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete team');
      }

      toast({ title: 'Team Deleted', description: 'The team has been permanently deleted.' });
      setTeamsData((prev: any[]) => prev.filter((t) => t.id !== teamId));
      if (selectedTeamId === teamId) {
        setSelectedTeamId(null);
      }
      setUserData((prev: any) => ({
        ...prev,
        teamMemberships: prev.teamMemberships?.filter((id: string) => id !== teamId) || [],
      }));
      await refreshTeamQueries();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferOwnership = async (teamId: string, newOwnerId: string) => {
    if (!currentUser) {
      return;
    }
    const team = teamsData.find((t: any) => t.id === teamId);
    const member = team?.memberDetails?.find((m: any) => m.uid === newOwnerId);

    const isConfirmed = await confirm({
      title: 'Transfer Ownership',
      description: `Are you sure you want to request an ownership transfer to ${member?.displayName || 'this member'}? An email will be sent to you to verify.`,
      checkboxLabel: 'I confirm I want to transfer ownership'
    });
    
    if (!isConfirmed) {
      return;
    }

    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/transfer-ownership/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newOwnerId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to request transfer');
      }

      toast({
        title: 'Verification Email Sent',
        description: 'Please check your email for the OTP.',
      });

      setPendingTransferTarget({ id: newOwnerId, name: member?.displayName || 'this member' });
      setTransferOtp('');
      setTransferOtpOpen(true);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOwnershipTransfer = async (teamId: string) => {
    if (!currentUser || !pendingTransferTarget) {return;}

    if (!transferOtp || transferOtp.length < 6) {
      toast({ title: 'Invalid OTP', description: 'Please enter the 6-digit OTP.', variant: 'destructive' });
      return;
    }

    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/transfer-ownership/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newOwnerId: pendingTransferTarget.id, otp: transferOtp }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to verify transfer');
      }

      toast({
        title: 'Ownership Transferred',
        description: 'Successfully updated the team leader.',
      });

      setTransferOtpOpen(false);
      setPendingTransferTarget(null);
      setTransferOtp('');

      setTeamsData((prev: any[]) =>
        prev.map((t) =>
          t.id === teamId
            ? {
                ...t,
                ownerId: pendingTransferTarget.id,
                memberDetails: t.memberDetails.map((m: any) => ({
                  ...m,
                  isOwner: m.uid === pendingTransferTarget.id,
                })),
              }
            : t
        )
      );
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenameTeam = async (teamId: string) => {
    if (!currentUser) {
      return;
    }
    const currentName = selectedTeam?.name?.trim() || '';
    const typedName = teamNameDraft.trim();
    const nextName = typedName || currentName;

    if (!nextName) {
      toast({
        title: 'Invalid Name',
        description: 'Team name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    if (nextName === currentName) {
      setTeamNameDraft(currentName);
      setIsEditingTeamName(false);
      return;
    }

    if (renameSavedTimerRef.current) {
      window.clearTimeout(renameSavedTimerRef.current);
      renameSavedTimerRef.current = null;
    }

    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/name`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: nextName }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to rename team');
      }

      const updatedTeam = await res.json();
      const updatedId = updatedTeam.id || updatedTeam._id;
      setTeamsData((prev: any[]) =>
        prev.map((team: any) =>
          (team.id || team._id) === updatedId ? { ...team, name: updatedTeam.name } : team
        )
      );

      setRenameSaved(true);
      setIsEditingTeamName(false);
      renameSavedTimerRef.current = window.setTimeout(() => {
        setRenameSaved(false);
        renameSavedTimerRef.current = null;
      }, 2000);

      toast({ title: 'Team Updated', description: 'Team name changed successfully.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: 'Invite code copied to clipboard.' });
  };

  if (teamLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading team settings…</div>;
  }

  if (!teamsData || teamsData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>You are not part of any team yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm max-w-sm">
              Create a team or join one using an invite code to start collaborating with your
              colleagues.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {teamsData.map((team: any) => {
          const tid = team.id || team._id;
          const isSelected = selectedTeamId === tid;
          const logoId = team.logoId || null;
          const isOwner = team.ownerId === currentUser?.uid;

          return (
            <Card
              key={tid}
              className={cn(
                'cursor-pointer transition-all hover:bg-card/50 border-border/10',
                isSelected ? 'ring-2 ring-foreground/20 bg-card/80' : 'bg-card/50 backdrop-blur-xl'
              )}
              onClick={() => setSelectedTeamId(tid)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TeamLogoDisplay 
                    logoId={logoId}
                    teamName={team.name}
                    className="h-10 w-10"
                    style={{ backgroundColor: isSelected ? undefined : 'color-mix(in srgb, currentColor 10%, transparent)' }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate max-w-[120px]">{team.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isOwner ? 'Owner' : 'Member'}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    'h-4 w-4 rounded-full border-2 border-primary/20',
                    isSelected ? 'bg-primary border-primary' : ''
                  )}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTeam ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Team Info Card */}
          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const lid = selectedTeam.logoId || null;
                    const isOwner = selectedTeam.ownerId === currentUser?.uid;
                    const isAdmin = selectedTeam.admins?.includes(currentUser?.uid);
                    const canEditPhoto = isOwner || isAdmin;

                    const LogoElement = (
                      <div className={cn("relative group shrink-0 h-12 w-12", canEditPhoto && "cursor-pointer")}>
                        <TeamLogoDisplay
                          logoId={lid}
                          teamName={selectedTeam.name}
                          className="h-12 w-12 group-hover:ring-2 group-hover:ring-primary/50 transition-all"
                          iconClassName="h-6 w-6 relative z-0"
                        />
                        {canEditPhoto && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {isUploadingTeamPhoto ? (
                              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                              <Camera className="h-4 w-4 text-white" />
                            )}
                          </div>
                        )}
                      </div>
                    );

                    return canEditPhoto ? (
                      <>
                        <div onClick={() => teamFileInputRef.current?.click()} className="shrink-0" title="Click to upload team photo">
                          {LogoElement}
                        </div>
                        <input
                          type="file"
                          ref={teamFileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleTeamFileSelect}
                        />
                      </>
                    ) : (
                      LogoElement
                    );
                  })()}
                  <div>
                    <CardTitle>{selectedTeam.name}</CardTitle>
                    <CardDescription>
                      {selectedTeam.type} · {selectedTeam.members?.length || 0} member
                      {selectedTeam.members?.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
                {selectedTeam.ownerId === currentUser?.uid && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20 py-1"
                  >
                    <Crown className="h-3 w-3" />
                    Owner
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Invite Code
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="px-4 py-2 rounded-lg bg-foreground/10 text-sm font-mono tracking-widest text-foreground border border-border/10">
                      {selectedTeam.inviteCode}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 hover:bg-foreground/10"
                      onClick={() => copyInviteCode(selectedTeam.inviteCode)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              {selectedTeam.ownerId === currentUser?.uid && (
                <div className="mt-4 space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Team Name
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      ref={teamNameInputRef}
                      value={teamNameDraft}
                      onChange={(e) => setTeamNameDraft(e.target.value)}
                      placeholder="Enter team name"
                      maxLength={80}
                      readOnly={!isEditingTeamName}
                    />
                    {isEditingTeamName ? (
                      <Button
                        type="button"
                        onClick={() => handleRenameTeam(selectedTeam.id || selectedTeam._id)}
                        disabled={actionLoading}
                      >
                        Save
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setRenameSaved(false);
                          setIsEditingTeamName(true);
                        }}
                        disabled={actionLoading}
                      >
                        {renameSaved ? 'Saved' : 'Edit'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Members Card */}
          {/* Members Card */}
          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Members Management</CardTitle>
              <CardDescription>
                {selectedTeam.ownerId === currentUser?.uid
                  ? 'Manage authority and participation.'
                  : 'View team collaborators.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pending Requests */}
              {selectedTeam.ownerId === currentUser?.uid && selectedTeam.pendingMemberDetails && selectedTeam.pendingMemberDetails.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Requests</h3>
                  {selectedTeam.pendingMemberDetails.map((member: any) => (
                    <div
                      key={member.uid}
                      className="flex items-center justify-between p-4 rounded-xl border border-border/10 bg-card/50 hover:bg-card/80 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-transparent ring-1 ring-border/10 group-hover:ring-border/30 transition-all">
                          <AvatarImage
                            src={member.photoURL ? getFullUrl(member.photoURL) : undefined}
                          />
                          <AvatarFallback className="text-xs bg-muted text-foreground font-bold">
                            {member.displayName
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold flex items-center gap-2">
                            {member.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 text-xs font-bold"
                          onClick={() => handleAcceptMember(selectedTeam.id, member.uid)}
                          disabled={actionLoading}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive font-bold"
                          onClick={() => handleRejectMember(selectedTeam.id, member.uid)}
                          disabled={actionLoading}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Members */}
              <div className="space-y-3">
                {selectedTeam.ownerId === currentUser?.uid && selectedTeam.pendingMemberDetails && selectedTeam.pendingMemberDetails.length > 0 && (
                   <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Members</h3>
                )}
                {selectedTeam.memberDetails?.map((member: any) => {
                  const isMemberOwner = member.uid === selectedTeam.ownerId;
                  const isMemberAdmin = selectedTeam.admins?.includes(member.uid);
                  const isYou = member.uid === currentUser?.uid;
                  const amITheOwner = selectedTeam.ownerId === currentUser?.uid;

                  return (
                    <div
                      key={member.uid}
                      className="flex items-center justify-between p-4 rounded-xl border border-border/10 bg-card/50 hover:bg-card/80 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-transparent ring-1 ring-border/10 group-hover:ring-border/30 transition-all">
                          <AvatarImage
                            src={member.photoURL ? getFullUrl(member.photoURL) : undefined}
                          />
                          <AvatarFallback className="text-xs bg-muted text-foreground font-bold">
                            {member.displayName
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold flex items-center gap-2">
                            {member.displayName}{' '}
                            {isYou && (
                              <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                            {isMemberOwner ? (
                              <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Crown className="h-3 w-3" /> Owner
                              </span>
                            ) : isMemberAdmin ? (
                              <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-full font-bold">
                                Admin
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {amITheOwner && !isMemberOwner && (
                          <>
                            {isMemberAdmin ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] hover:bg-orange-500/10 hover:text-orange-500 text-text3 font-bold"
                                onClick={() => handleDemoteAdmin(selectedTeam.id, member.uid)}
                                disabled={actionLoading}
                              >
                                Demote to Member
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] hover:bg-blue-500/10 hover:text-blue-500 text-text3 font-bold"
                                onClick={() => handlePromoteAdmin(selectedTeam.id, member.uid)}
                                disabled={actionLoading}
                              >
                                Promote to Admin
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[10px] hover:bg-amber-500/10 hover:text-amber-500 text-text3 font-bold"
                              onClick={() => handleTransferOwnership(selectedTeam.id, member.uid)}
                              disabled={actionLoading}
                            >
                              Transfer Ownership
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveMember(selectedTeam.id, member.uid)}
                              disabled={actionLoading}
                              title="Remove from team"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone / Leave */}
          <Card
            className={cn(
              'bg-card/60 backdrop-blur-sm',
              selectedTeam.ownerId === currentUser?.uid
                ? 'border-destructive/30 bg-destructive/5'
                : ''
            )}
          >
            <CardHeader>
              <CardTitle
                className={cn(
                  'flex items-center gap-2',
                  selectedTeam.ownerId === currentUser?.uid ? 'text-destructive' : ''
                )}
              >
                {selectedTeam.ownerId === currentUser?.uid ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
                {selectedTeam.ownerId === currentUser?.uid ? 'Danger Zone' : 'Leave Team'}
              </CardTitle>
              <CardDescription>
                {selectedTeam.ownerId === currentUser?.uid
                  ? 'Permanently delete this team and wipe all associated data.'
                  : 'Remove yourself from this workspace and lose access.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTeam.ownerId === currentUser?.uid ? (
                <div className="space-y-4">
                  <p className="text-xs text-destructive/80 font-medium">
                    This action is destructive and cannot be undone. All project mappings for this
                    team will be lost.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteTeam(selectedTeam.id)}
                    disabled={actionLoading}
                    className="font-bold shadow-lg shadow-destructive/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {actionLoading ? 'Processing...' : 'Wipe Team Data'}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleLeaveTeam(selectedTeam.id)}
                  disabled={actionLoading}
                  className="border-border/10 bg-transparent hover:bg-destructive/10 hover:text-destructive font-bold transition-all"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {actionLoading ? 'Leaving...' : 'Leave Workspace'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="h-[200px] flex items-center justify-center bg-card/40 border-dashed">
          <p className="text-muted-foreground text-sm">
            Select a team to view and manage settings.
          </p>
        </Card>
      )}
      
      <ProfilePhotoCropper
        open={teamCropperOpen}
        imageSrc={teamCropperImage}
        title="Adjust Team Photo"
        onClose={() => setTeamCropperOpen(false)}
        onCropComplete={handleTeamCroppedUpload}
      />
      
      {/* OTP Dialog for Ownership Transfer */}
      <Dialog open={transferOtpOpen} onOpenChange={setTransferOtpOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Verify Ownership Transfer</DialogTitle>
            <DialogDescription>
              We've sent a 6-digit verification code to your email. Enter it below to transfer ownership to {pendingTransferTarget?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                placeholder="123456"
                value={transferOtp}
                onChange={(e) => setTransferOtp(e.target.value)}
                maxLength={6}
                className="text-center tracking-[0.5em] text-lg font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTransferOtpOpen(false);
                setPendingTransferTarget(null);
                setTransferOtp('');
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedTeam?.id && handleVerifyOwnershipTransfer(selectedTeam.id)}
              disabled={actionLoading || transferOtp.length < 6}
            >
              {actionLoading ? 'Verifying...' : 'Transfer Ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

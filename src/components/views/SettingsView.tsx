import { useState, useRef, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { updateProfile, updateEmail, deleteUser, GithubAuthProvider, GoogleAuthProvider, linkWithPopup, getAdditionalUserInfo, onAuthStateChanged, reauthenticateWithPopup } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserSync } from "@/hooks/use-user-sync";
import { toast } from "@/components/ui/use-toast";
import { uploadProfileImage } from "@/services/storageService";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, Github, AlertTriangle, Check, ChevronsUpDown, Mail, Phone, Headphones, MessageSquare, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,

} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTheme } from "next-themes";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper to get full URL (generic)
const getFullUrl = (path: string | undefined): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
};

// Simple Country List (Truncated for brevity, can be expanded)
const countries = [
  { name: "United States", code: "US", dial_code: "+1", flag: "🇺🇸" },
  { name: "India", code: "IN", dial_code: "+91", flag: "🇮🇳" },
  { name: "United Kingdom", code: "GB", dial_code: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "CA", dial_code: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", dial_code: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "DE", dial_code: "+49", flag: "🇩🇪" },
  { name: "France", code: "FR", dial_code: "+33", flag: "🇫🇷" },
  { name: "Japan", code: "JP", dial_code: "+81", flag: "🇯🇵" },
  { name: "China", code: "CN", dial_code: "+86", flag: "🇨🇳" },
  { name: "Brazil", code: "BR", dial_code: "+55", flag: "🇧🇷" },
];

export default function SettingsView() {
  useUserSync(); // Sync side-effect only
  const [userData, setUserData] = useState<any>(null); // Local state
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Team Data
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Fetch Teams
  useEffect(() => {
    if (currentUser?.uid) {
      setLoadingTeams(true);
      currentUser.getIdToken().then(token => {
        fetch(`${API_BASE_URL}/api/teams/mine`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setMyTeams(data);
            }
          })
          .catch(err => console.error("Failed to fetch teams", err))
          .finally(() => setLoadingTeams(false));
      });
    }
  }, [currentUser]);

  // Auth Listener to ensure we have the latest user state (e.g. after linking)
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme()

  const [openCountry, setOpenCountry] = useState(false);

  // Computed Properties
  const googleProvider = currentUser?.providerData?.find((p: any) => p.providerId === 'google.com');
  const isGoogleLinked = !!googleProvider;
  const isCalendarSynced = userData?.integrations?.google?.connected;

  // Fetch Full User Data
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  useEffect(() => {
    if (currentUser?.uid) {
      setIsLoadingUserData(true);
      fetch(`${API_BASE_URL}/api/users/${currentUser.uid}`)
        .then(res => res.json())
        .then(data => setUserData(data))
        .catch(err => console.error("Failed to fetch user data", err))
        .finally(() => setIsLoadingUserData(false));
    } else {
      // If no user, stop loading (e.g. not logged in)
      setIsLoadingUserData(false);
    }
  }, [currentUser]);

  // Form State
  const [profileForm, setProfileForm] = useState({
    username: "",
    firstName: "",
    lastName: "",
    displayName: "",
    country: "",
    countryCode: "",
    phoneNumber: "",
    photoURL: ""
  });

  // Sync profile form with userData
  useEffect(() => {
    if (userData) {
      setProfileForm({
        username: userData.username || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        displayName: userData.displayName || "",
        country: userData.country || "",
        countryCode: userData.countryCode || "",
        phoneNumber: userData.phoneNumber || "",
        photoURL: userData.photoURL || currentUser?.photoURL || ""
      });
    }
  }, [userData, currentUser]);

  // --- Profile Update Logic ---
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${currentUser?.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });

      // Sync with Firebase Auth Profile to prevent overwrite by use-user-sync
      if (currentUser && profileForm.displayName) {
        await updateProfile(currentUser, {
          displayName: profileForm.displayName
        });
      }

      if (res.ok) {
        toast({ title: "Success", description: "Profile updated successfully" });
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!currentUser?.uid) return;

      setLoading(true);
      try {
        // Upload to Firebase Storage (handles downscaling automatically)
        const downloadURL = await uploadProfileImage(currentUser.uid, file);

        // Update local state
        setProfileForm(prev => ({ ...prev, photoURL: downloadURL }));

        // Save to backend
        // We persist the Full Firebase URL in our backend now
        await fetch(`${API_BASE_URL}/api/users/${currentUser.uid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoURL: downloadURL })
        });

        // Update Firebase Auth Profile
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: downloadURL });
        }

        toast({ title: "Success", description: "Profile photo updated" });
      } catch (error: any) {
        console.error("Upload error:", error);
        toast({ title: "Error", description: (error as Error).message || "Failed to upload photo", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };

  // --- GitHub Integration Logic ---
  const handleGithubConnect = async () => {
    setLoading(true);
    try {
      const provider = new GithubAuthProvider();
      provider.addScope('repo'); // Critical for repo access
      provider.addScope('read:user');

      if (!auth.currentUser) throw new Error("User must be signed in");

      let accessToken: string | undefined;
      let githubUsername: string | undefined;

      try {
        // 1. Try to Link Account
        const result = await linkWithPopup(auth.currentUser, provider);
        const credential = GithubAuthProvider.credentialFromResult(result);
        accessToken = credential?.accessToken;

        const details = getAdditionalUserInfo(result);
        githubUsername = details?.username || (details?.profile as any)?.login;

      } catch (linkError: any) {
        console.warn("Firebase Link Warning:", linkError.code);

        // 2. Handle "Credential Already In Use" or other errors
        if (linkError.code === 'auth/credential-already-in-use') {
          const credential = GithubAuthProvider.credentialFromError(linkError);
          accessToken = credential?.accessToken;
        } else {
          throw linkError;
        }
      }

      if (!accessToken) throw new Error("No Access Token retrieved from GitHub.");

      // 3. If Username is missing (e.g. from error flow), fetch it
      if (!githubUsername) {
        try {
          const ghResponse = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (ghResponse.ok) {
            const ghData = await ghResponse.json();
            githubUsername = ghData.login;
          }
        } catch (e) {
          console.warn("Could not fetch username fallback", e);
        }
      }

      // 4. Send Token to Backend
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/github/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          accessToken,
          username: githubUsername || 'GitHub User' // Fallback
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Backend connection failed");
      }

      const data = await response.json();
      toast({ title: "Connected!", description: `Linked GitHub account: ${data.username}` });

      // Update Local State
      setUserData((prev: any) => ({
        ...prev,
        integrations: {
          ...prev?.integrations,
          github: { ...prev?.integrations?.github, connected: true, username: data.username }
        }
      }));

    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGithubDisconnect = async () => {
    if (!window.confirm("Are you sure you want to unlink your GitHub account?")) return;
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/github/disconnect`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
      });

      if (!res.ok) throw new Error("Failed to disconnect");

      toast({ title: "Disconnected", description: "GitHub account unlinked." });
      setUserData((prev: any) => ({
        ...prev,
        integrations: {
          ...prev?.integrations,
          github: { ...prev?.integrations?.github, connected: false, username: null }
        }
      }));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- Google Integration Logic ---
  const handleGoogleConnect = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');

      if (!auth.currentUser) throw new Error("User must be signed in");

      let accessToken: string | undefined;
      let googleEmail: string | undefined;

      try {
        // Link Account
        const result = await linkWithPopup(auth.currentUser, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        accessToken = credential?.accessToken;

        const details = getAdditionalUserInfo(result);
        googleEmail = (details?.profile as any)?.email;

      } catch (linkError: any) {
        if (linkError.code === 'auth/credential-already-in-use') {
          // If already linked to another account... (could handle merge here)
          const credential = GoogleAuthProvider.credentialFromError(linkError);
          accessToken = credential?.accessToken;
        } else if (linkError.code === 'auth/provider-already-linked') {
          // Already linked to THIS account. Re-auth to get fresher token/scopes.
          const reauthResult = await reauthenticateWithPopup(auth.currentUser, provider);
          const credential = GoogleAuthProvider.credentialFromResult(reauthResult);
          accessToken = credential?.accessToken;
        } else {
          throw linkError;
        }
      }

      if (!accessToken) throw new Error("No Access Token retrieved.");

      // Send to Backend
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/google/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          accessToken,
          email: googleEmail || auth.currentUser.email
        })
      });

      if (!response.ok) throw new Error("Backend connection failed");

      const data = await response.json();
      toast({ title: "Connected!", description: `Linked Google Calendar: ${data.email}` });

      // Update Local State
      setUserData((prev: any) => ({
        ...prev,
        integrations: {
          ...prev?.integrations,
          google: { ...prev?.integrations?.google, connected: true, email: data.email }
        }
      }));

    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Connection Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!window.confirm("Disconnect Google Calendar?")) return;
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      await fetch(`${API_BASE_URL}/api/google/disconnect`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });

      setUserData((prev: any) => ({
        ...prev,
        integrations: {
          ...prev?.integrations,
          google: { ...prev?.integrations?.google, connected: false, email: null }
        }
      }));
      toast({ title: "Disconnected", description: "Google account unlinked." });
    } catch (err: any) {
      toast({ title: "Error", variant: "destructive", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- Security Functions ---
  const [deleteStep, setDeleteStep] = useState<'initial' | 'verifying'>('initial');
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

<<<<<<< HEAD
  // --- Team Management Logic ---
  const [teamManageDialogOpen, setTeamManageDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamActionLoading, setTeamActionLoading] = useState(false);
  const [renameValue, setRenameValue] = useState("");
=======
  // --- Support Form Logic ---
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportForm, setSupportForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: ""
  });
>>>>>>> a8afa7b (updated activitylog)

  const handleOpenTeamManage = (team: any) => {
    setSelectedTeam(team);
    setRenameValue(team.name);
    setTeamManageDialogOpen(true);
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (!window.confirm("Are you sure you want to leave this team?")) return;
    setTeamActionLoading(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/leave`, {
        method: 'POST',
<<<<<<< HEAD
        headers: { Authorization: `Bearer ${token}` }
=======
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: supportForm.firstName,
          lastName: supportForm.lastName,
          email: supportForm.email,
          message: supportForm.message
        })
>>>>>>> a8afa7b (updated activitylog)
      });
      if (res.ok) {
        toast({ title: "Left Team", description: "You have left the team." });
        setMyTeams(prev => prev.filter(t => t._id !== teamId));
      } else {
        throw new Error("Failed to leave team");
      }
<<<<<<< HEAD
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
=======

      if (!res.ok) {
        // Use the error message from backend if available, otherwise a generic one
        let errorMessage = data?.message || res.statusText || "Failed to send message";

        // Sanitize technical errors for the user
        if (errorMessage.includes("Invalid login") || res.status === 500) {
          console.error("Backend Error:", errorMessage);
          errorMessage = "Our support system is temporarily unavailable. Please try again later or email us directly.";
        }

        throw new Error(errorMessage);
      }

      toast({ title: "Message Sent", description: "We'll get back to you soon!" });
      setSupportForm({
        firstName: "",
        lastName: "",
        email: "",
        message: ""
      });

    } catch (error: any) {
      console.error("Support Form Error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
>>>>>>> a8afa7b (updated activitylog)
    } finally {
      setTeamActionLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm("Are you sure you want to DELETE this team? This cannot be undone.")) return;
    setTeamActionLoading(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Team Deleted", description: "The team has been permanently deleted." });
        setMyTeams(prev => prev.filter(t => t._id !== teamId));
        setTeamManageDialogOpen(false);
      } else {
        throw new Error("Failed to delete team");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setTeamActionLoading(false);
    }
  };

  const handleUpdateTeamName = async () => {
    if (!selectedTeam || !renameValue.trim()) return;
    setTeamActionLoading(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${selectedTeam._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: renameValue })
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Team name updated." });
        setMyTeams(prev => prev.map(t => t._id === selectedTeam._id ? { ...t, name: renameValue } : t));
        setSelectedTeam((prev: any) => ({ ...prev, name: renameValue }));
      } else {
        throw new Error("Failed to update team");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setTeamActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      if (deleteStep === 'initial') {
        // Step 1: Request Code
        const idToken = await currentUser?.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/users/delete/request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({ uid: currentUser?.uid })
        });

        if (!res.ok) throw new Error("Failed to send verification code");

        toast({ title: "Verification Sent", description: "Check your email for the confirmation code." });
        setDeleteStep('verifying');

      } else {
        // Step 2: Confirm Deletion
        const idToken = await currentUser?.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/users/delete/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({ uid: currentUser?.uid, code: deleteCode })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to verify code");
        }

        // 3. Cleanup Firebase Auth
        await deleteUser(currentUser!);
        window.location.href = "/login";
      }

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details here.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUserData ? (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center mb-6">
                      <div className="w-24 h-24 rounded-full bg-secondary/30 animate-pulse" />
                      <div className="h-3 w-32 bg-secondary/30 rounded mt-3 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-secondary/30 rounded animate-pulse" />
                      <div className="h-10 w-full bg-secondary/30 rounded animate-pulse" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="h-4 w-20 bg-secondary/30 rounded animate-pulse" />
                        <div className="h-10 w-full bg-secondary/30 rounded animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-20 bg-secondary/30 rounded animate-pulse" />
                        <div className="h-10 w-full bg-secondary/30 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center justify-center mb-6">
                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Avatar className="w-24 h-24 border-2 border-border">
                          <AvatarImage src={getFullUrl(profileForm.photoURL)} />
                          <AvatarFallback className="text-2xl">{profileForm.firstName?.[0]}{profileForm.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                      <p className="text-xs text-muted-foreground mt-2">Click to change profile photo</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        value={profileForm.displayName}
                        onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })}
                        placeholder="e.g. John Doe"
                      />
                      <p className="text-[0.8rem] text-muted-foreground">This is how your name will appear to other users.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input value={profileForm.username} onChange={e => setProfileForm({ ...profileForm, username: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 flex flex-col">
                        <Label>Country</Label>
                        <Popover open={openCountry} onOpenChange={setOpenCountry}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openCountry} className="w-full justify-between">
                              {profileForm.countryCode
                                ? countries.find((country) => country.dial_code === profileForm.countryCode)?.name
                                : "Select country..."}
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
                                        setProfileForm({ ...profileForm, country: country.name, countryCode: country.dial_code });
                                        setOpenCountry(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", profileForm.countryCode === country.dial_code ? "opacity-100" : "opacity-0")} />
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
                          <div className="flex items-center justify-center px-3 border rounded-md bg-muted text-muted-foreground">{profileForm.countryCode}</div>
                          <Input type="tel" value={profileForm.phoneNumber} onChange={e => setProfileForm({ ...profileForm, phoneNumber: e.target.value.replace(/\D/g, '') })} />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INTEGRATIONS TAB */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Manage your external connections to sync projects.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingUserData ? (
                  <div className="flex flex-col gap-4">
                    <div className="h-24 w-full bg-secondary/30 rounded-lg animate-pulse" />
                    <div className="h-24 w-full bg-secondary/30 rounded-lg animate-pulse" />
                  </div>
                ) : (
                  <>
                    {/* GitHub Connection */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Github className="w-8 h-8" />
                        <div>
                          <p className="font-medium">GitHub</p>
                          <p className="text-sm text-muted-foreground">
                            {userData?.integrations?.github?.connected
                              ? `Connected as ${userData.integrations.github.username}`
                              : "Connect repositories to ZYNC."}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={userData?.integrations?.github?.connected ? "destructive" : "secondary"}
                        onClick={userData?.integrations?.github?.connected ? handleGithubDisconnect : handleGithubConnect}
                      >
                        {userData?.integrations?.github?.connected ? "Unlink" : "Connect"}
                      </Button>
                    </div>

                    {/* Google Connection */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-8 h-8 flex items-center justify-center font-bold text-xl rounded-full", (isGoogleLinked || isCalendarSynced) ? "text-blue-600 bg-blue-50" : "text-gray-500 bg-gray-100")}>G</div>
                        <div>
                          <p className="font-medium">Google Calendar</p>
                          <p className="text-sm text-muted-foreground">
                            {isCalendarSynced
                              ? `Connected as ${userData.integrations.google.email}`
                              : isGoogleLinked
                                ? `Linked as ${googleProvider?.email}. Enable Calendar?`
                                : "Sync meetings and events."}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={isCalendarSynced ? "destructive" : "secondary"}
                        onClick={isCalendarSynced ? handleGoogleDisconnect : handleGoogleConnect}
                        disabled={loading}
                      >
                        {isCalendarSynced ? "Disconnect" : (isGoogleLinked ? "Enable Sync" : "Connect")}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PREFERENCES TAB */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader><CardTitle>App Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEAM TAB */}
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>View and manage your teams.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingTeams ? (
                  <div className="flex flex-col gap-4">
                    <div className="h-24 w-full bg-secondary/30 rounded-lg animate-pulse" />
                    <div className="h-24 w-full bg-secondary/30 rounded-lg animate-pulse" />
                  </div>
                ) : myTeams.length > 0 ? (
                  <div className="grid gap-4">
                    {myTeams.map((team: any) => {
                      const isOwner = team.ownerId === currentUser?.uid;
                      return (
                        <div key={team._id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-secondary/10 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{team.name}</h3>
                              {isOwner && <Badge variant="secondary">Owner</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">Members: {team.members?.length || 1}</p>
                            <div className="flex items-center gap-2 text-xs font-mono bg-muted px-2 py-1 rounded w-fit mt-2">
                              <span>Code:</span>
                              <span className="select-all">{team.inviteCode}</span>
                            </div>
                          </div>

                          <div className="mt-4 md:mt-0 flex items-center gap-3">
                            {isOwner ? (
                              <Button variant="outline" size="sm" onClick={() => handleOpenTeamManage(team)}>Manage Team</Button>
                            ) : (
                              <Button variant="destructive" size="sm" onClick={() => handleLeaveTeam(team._id)} disabled={teamActionLoading}>
                                {teamActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Leave Team
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>You are not part of any team yet.</p>
                    <p className="text-sm mt-1">Go to the "People" tab to create or join a team.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manage Team Dialog */}
            <Dialog open={teamManageDialogOpen} onOpenChange={setTeamManageDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Manage Team</DialogTitle>
                  <DialogDescription>Update team details or remove members.</DialogDescription>
                </DialogHeader>

<<<<<<< HEAD
                {selectedTeam && (
                  <div className="space-y-6 py-4">
                    {/* Rename Section */}
                    <div className="space-y-2">
                      <Label>Team Name</Label>
                      <div className="flex gap-2">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                        />
                        <Button onClick={handleUpdateTeamName} disabled={teamActionLoading}>Save</Button>
                      </div>
                    </div>
=======
                      <div className="space-y-2">
                        <Textarea
                          placeholder="How can we help?"
                          className="min-h-[100px] resize-none"
                          maxLength={120}
                          value={supportForm.message}
                          onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                          required
                        />
                        <p className="text-xs text-muted-foreground text-right">{supportForm.message.length}/120</p>
                      </div>
>>>>>>> a8afa7b (updated activitylog)

                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <Label>Invite Code</Label>
                      <div className="flex items-center justify-between bg-background border px-3 py-2 rounded">
                        <code className="font-mono font-bold">{selectedTeam.inviteCode}</code>
                        <Button size="sm" variant="ghost" className="h-6" onClick={() => {
                          navigator.clipboard.writeText(selectedTeam.inviteCode);
                          toast({ description: "Copied to clipboard" });
                        }}>Copy</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Share this code to invite others.</p>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h4>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleDeleteTeam(selectedTeam._id)}
                        disabled={teamActionLoading}
                      >
                        {teamActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Team Permanently
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        This will remove all team data and kick all members.
                      </p>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* SECURITY TAB */}
          <TabsContent value="security">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">Danger Zone</CardTitle>
                <CardDescription>
                  Permanently remove your Personal Account and all of its contents from the ZYNC platform. This action is not reversible, so please continue with caution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deleteStep === 'initial' ? (
                  <div className="space-y-4">
                    <div className="bg-destructive/10 p-4 rounded-md text-sm text-destructive font-medium border border-destructive/20">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      Warning: Deleting your account is irreversible.
                    </div>
                    <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteLoading}>
                      {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Request Account Deletion
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-sm">
                    <div className="space-y-2">
                      <Label>Verification Code</Label>
                      <p className="text-sm text-muted-foreground">Please check your email <b>{currentUser?.email}</b> for the 6-digit confirmation code.</p>
                      <Input
                        value={deleteCode}
                        onChange={(e) => setDeleteCode(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteLoading || deleteCode.length !== 6}>
                        {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Deletion
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
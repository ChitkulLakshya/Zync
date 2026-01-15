import { useState, useEffect, useRef } from "react";
import { GithubAuthProvider, linkWithPopup, getAdditionalUserInfo } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { updateEmail, deleteUser, updateProfile } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Github, Mail, AlertTriangle, Check, ChevronsUpDown, Camera, Plus, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, API_BASE_URL, getFullUrl } from "@/lib/utils";
import { useTheme } from "next-themes";

// Country list truncated for brevity (keep your existing list)
const countries = [
  { name: "United States", code: "US", dial_code: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", dial_code: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "CA", dial_code: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", dial_code: "+61", flag: "🇦🇺" },
  { name: "India", code: "IN", dial_code: "+91", flag: "🇮🇳" },
  { name: "Germany", code: "DE", dial_code: "+49", flag: "🇩🇪" },
  { name: "France", code: "FR", dial_code: "+33", flag: "🇫🇷" },
  { name: "Japan", code: "JP", dial_code: "+81", flag: "🇯🇵" },
  { name: "China", code: "CN", dial_code: "+86", flag: "🇨🇳" },
  { name: "Brazil", code: "BR", dial_code: "+55", flag: "🇧🇷" },
  { name: "South Korea", code: "KR", dial_code: "+82", flag: "🇰🇷" },
  { name: "Russia", code: "RU", dial_code: "+7", flag: "🇷🇺" },
];

const TeamSettingsView = ({ currentUser }: { currentUser: any }) => {
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTeamData = async () => {
    try {
      if (!currentUser) return;
      const token = await currentUser.getIdToken();

      // Get Team Info
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await res.json();

      if (userData.teamId && typeof userData.teamId === 'object') {
        setTeam(userData.teamId);

        // Fetch Members (filtered by team is default behavior now)
        const membersRes = await fetch(`${API_BASE_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const membersData = await membersRes.json();
        setMembers(membersData);
      } else {
        setTeam(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [currentUser]);

  const handleDeleteTeam = async () => {
    if (!window.confirm("Are you sure you want to delete this team? This cannot be undone.")) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${team._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast({ title: "Team Deleted", description: "Your team has been removed." });
        window.location.reload();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Remove this member from the team?")) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${team._id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast({ title: "Member Removed", description: "User removed from team." });
        setMembers(prev => prev.filter(m => m.uid !== memberId));
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  if (!team) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
          <CardDescription>You are not currently in a team.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Go to the People tab to create or join a team.</p>
        </CardContent>
      </Card>
    );
  }

  const isOwner = team.ownerId === currentUser.uid;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar (Mockup Style) */}
      <div className="md:col-span-1 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Teams</h3>
          <div className="bg-secondary/50 p-2 rounded-md border text-sm font-medium">
            {team.name}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:col-span-3 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{team.name}</h2>
              {/* <Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><Plus className="h-4 w-4" /></Button> */}
            </div>
          </div>
          {isOwner && (
            <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDeleteTeam}>
              Delete Team
            </Button>
          )}
        </div>

        {/* Members List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Members</h3>
            {/* <Button variant="outline" size="sm">Edit Members</Button> */}
          </div>

          <div className="bg-card border rounded-lg shadow-sm divide-y">
            {members.map(member => (
              <div key={member.uid} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getFullUrl(member.photoURL)} />
                    <AvatarFallback>{member.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{member.displayName} {member.uid === currentUser.uid && "(You)"}</span>
                </div>

                {member.uid !== currentUser.uid && isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive rounded-full h-8 w-8"
                    onClick={() => handleRemoveMember(member.uid)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsView = () => {
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);


  const currentUser = auth.currentUser;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    username: "",
    country: "",
    countryCode: "",
    birthday: "",
    phoneNumber: "",
    email: "",
    photoURL: ""
  });

  const [isPhoneVerified, setIsPhoneVerified] = useState(true);
  const [openCountry, setOpenCountry] = useState(false);

  // Fetch User Data
  useEffect(() => {
    if (currentUser) {
      fetch(`${API_BASE_URL}/api/users/${currentUser.uid}`)
        .then(res => res.json())
        .then(data => {
          setUserData(data);
          setProfileForm({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            displayName: data.displayName || "",
            username: data.username || "",
            country: data.country || "",
            countryCode: data.countryCode || "+1",
            birthday: data.birthday ? new Date(data.birthday).toISOString().split('T')[0] : "",
            phoneNumber: data.phoneNumber || "",
            email: currentUser.email || "",
            photoURL: data.photoURL || currentUser.photoURL || ""
          });
          setIsPhoneVerified(data.isPhoneVerified || false);
        })
        .catch(err => console.error(err));
    }
  }, [currentUser]);

  // Capture Dribbble Token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dToken = params.get('dribbble_token');
    const dUser = params.get('dribbble_user'); // Optional

    if (dToken) {
      localStorage.setItem('dribbble_token', dToken);
      if (dUser) localStorage.setItem('dribbble_user', dUser);

      toast({ title: "Connected!", description: "Dribbble account linked successfully." });

      // Clear URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (params.get('error') === 'dribbble_auth_failed') {
      toast({ title: "Connection Failed", description: "Could not connect to Dribbble.", variant: "destructive" });
    }
  }, []);

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
      const formData = new FormData();
      formData.append('file', file);

      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        const fileUrl = data.fileUrl; // This is a relative path like /uploads/filename.jpg

        // Update local state
        setProfileForm(prev => ({ ...prev, photoURL: fileUrl }));

        // Save to backend immediately
        await fetch(`${API_BASE_URL}/api/users/${currentUser?.uid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoURL: fileUrl })
        });

        // Update Firebase Profile
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: fileUrl }); // Note: Firebase usually expects a full URL, but we'll handle this in the app
        }

        toast({ title: "Success", description: "Profile photo updated" });
      } catch (error) {
        console.error("Upload error:", error);
        toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };

  // --- GitHub Integration Logic (FIXED) ---
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
        // We catch this specifically to still allow the integration (saving the token)
        // even if the Firebase account linking itself fails (e.g. reused GitHub account).
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
      const idToken = await auth.currentUser.getIdToken();
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

  // --- Security Functions ---
  const [newEmail, setNewEmail] = useState("");
  const [showEmailVerify, setShowEmailVerify] = useState(false);

  // Deletion State
  const [deleteStep, setDeleteStep] = useState<'initial' | 'verifying'>('initial');
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleEmailChange = async () => {
    if (!newEmail) return;
    setShowEmailVerify(true);
    toast({ title: "Demo Code Sent", description: "Check console for code (123456)" });
    console.log("DEMO CODE: 123456");
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
                {/* GitHub Connection */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Github className="w-8 h-8" />
                    <div>
                      <p className="font-medium">GitHub</p>
                      <p className="text-sm text-muted-foreground">
                        {userData?.integrations?.github?.connected
                          ? `Connected as ${userData.integrations.github.username}`
                          : "Connect repositories to Zync."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dribbble Connection */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center bg-[#ea4c89] text-white rounded-full">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5.03A8.458 8.458 0 0112 3.475zm-6.509 3.383c.247.358 1.821 2.68 3.239 5.289a29.866 29.866 0 01-4.496.643c-.02-.349-.033-.7-.033-1.056a8.468 8.468 0 011.29-4.876zm-1.637 6.47c1.764-.08 4.64.212 6.551.681.459 1.258.858 2.505 1.189 3.86a26.04 26.04 0 01-3.996 1.157c-2.486-1.6-4.008-4.226-4.008-7.149 0-.214.015-.424.03-.632.079.03.155.056.234.083zM12 20.53c-2.02 0-3.875-.712-5.327-1.921 1.251-.271 3.201-.849 5.368-1.472.261 1.05.514 2.17.755 3.328A8.466 8.466 0 0112 20.53zm0-18.995V1.53c0-.001-.001 0 0 0zm6.918 10.99l.011.393c.002.046.002.091.002.137 0 1.97-.676 3.784-1.815 5.234-.339-1.527-.678-2.978-1.015-4.329 2.571-.246 4.909.117 5.143.165-.183-.54-.429-1.052-.72-1.523-.424-.047-.98-.073-1.606-.078z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Dribbble</p>
                      <p className="text-sm text-muted-foreground">
                        {localStorage.getItem('dribbble_token')
                          ? `Connected as ${localStorage.getItem('dribbble_user') || 'User'}`
                          : "Connect your Dribbble account."}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={localStorage.getItem('dribbble_token') ? "destructive" : "secondary"}
                    onClick={() => {
                      if (localStorage.getItem('dribbble_token')) {
                        localStorage.removeItem('dribbble_token');
                        localStorage.removeItem('dribbble_user');
                        toast({ title: "Disconnected", description: "Dribbble account unlinked." });
                        window.location.reload();
                      } else {
                        // Use credentialed Client ID
                        const clientId = "Z2LzX0DtUkUiTUl1T3ybs-UyTF8YFmYkmMZj1QuWMyU";
                        const redirectUri = `${API_BASE_URL}/api/dribbble/callback`;
                        window.location.href = `https://dribbble.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=public%20upload`;
                      }
                    }}
                  >
                    {localStorage.getItem('dribbble_token') ? "Unlink" : "Connect"}
                  </Button>
                </div>



                {/* Google Connection (Placeholder) */}
                <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center font-bold text-xl">G</div>
                    <div>
                      <p className="font-medium">Google</p>
                      <p className="text-sm text-muted-foreground">Calendar sync coming soon.</p>
                    </div>
                  </div>
                  <Button variant="outline" disabled>Soon</Button>
                </div>
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

          {/* SECURITY TAB */}
          <TabsContent value="security">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">Danger Zone</CardTitle>
                <CardDescription>
                  Permanently remove your Personal Account and all of its contents from the Zync platform. This action is not reversible, so please continue with caution.
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
                      <Button variant="ghost" onClick={() => setDeleteStep('initial')} disabled={deleteLoading}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEAM TAB */}
          <TabsContent value="team">
            <TeamSettingsView currentUser={currentUser} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default SettingsView;
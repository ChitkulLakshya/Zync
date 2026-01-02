import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { updateEmail, updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider, PhoneAuthProvider, linkWithCredential, updatePhoneNumber, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Github, Mail, Smartphone, Shield, Trash2, Save, AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const countries = [
  { name: "United States", code: "US", dial_code: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", dial_code: "+44", flag: "🇬🇧" },
  { name: "India", code: "IN", dial_code: "+91", flag: "🇮🇳" },
  { name: "Canada", code: "CA", dial_code: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", dial_code: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "DE", dial_code: "+49", flag: "🇩🇪" },
  { name: "France", code: "FR", dial_code: "+33", flag: "🇫🇷" },
  { name: "Japan", code: "JP", dial_code: "+81", flag: "🇯🇵" },
  { name: "China", code: "CN", dial_code: "+86", flag: "🇨🇳" },
  { name: "Brazil", code: "BR", dial_code: "+55", flag: "🇧🇷" },
];

const SettingsView = () => {
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const currentUser = auth.currentUser;

  // Form States
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    country: "",
    countryCode: "",
    birthday: "",
    phoneNumber: "",
    email: ""
  });

  // Phone Verification State
  const [isPhoneVerified, setIsPhoneVerified] = useState(true);
  const [showPhoneVerify, setShowPhoneVerify] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [openCountry, setOpenCountry] = useState(false);

  // Fetch User Data
  useEffect(() => {
    if (currentUser) {
      fetch(`http://localhost:5000/api/users/${currentUser.uid}`)
        .then(res => res.json())
        .then(data => {
          setUserData(data);
          setProfileForm({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            username: data.username || "",
            country: data.country || "",
            countryCode: data.countryCode || "+1",
            birthday: data.birthday ? new Date(data.birthday).toISOString().split('T')[0] : "",
            phoneNumber: data.phoneNumber || "",
            email: currentUser.email || ""
          });
          // If phone number exists in DB, assume it was verified.
          setIsPhoneVerified(!!data.phoneNumber);
        })
        .catch(err => console.error(err));
    }
  }, [currentUser]);

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  };

  const initiatePhoneVerification = async () => {
    if (!profileForm.phoneNumber || !profileForm.countryCode) return;
    const fullNumber = `${profileForm.countryCode}${profileForm.phoneNumber}`;
    
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, fullNumber, appVerifier);
      (window as any).confirmationResult = confirmationResult;
      
      console.log("DEMO EMAIL CODE: 123456");
      toast({ title: "Verification Sent", description: "OTP sent to phone and code sent to email (Check console)." });
      
      setShowPhoneVerify(true);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const verifyPhoneCode = async () => {
     try {
      const confirmationResult = (window as any).confirmationResult;
      await confirmationResult.confirm(phoneCode);
      
      setIsPhoneVerified(true);
      setShowPhoneVerify(false);
      toast({ title: "Success", description: "Phone number verified!" });
    } catch (error: any) {
      toast({ title: "Error", description: "Invalid OTP", variant: "destructive" });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.firstName || !profileForm.lastName) {
      toast({ title: "Error", description: "First and Last Name are required", variant: "destructive" });
      return;
    }

    if (profileForm.phoneNumber && !isPhoneVerified) {
        toast({ title: "Error", description: "Please verify your phone number before saving.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/users/${currentUser?.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });
      
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

  // --- Security Functions ---

  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [showEmailVerify, setShowEmailVerify] = useState(false);

  const handleEmailChange = async () => {
    // In a real app, you'd trigger a backend email send here.
    // For this demo, we'll simulate the code sent.
    if (!newEmail) return;
    setShowEmailVerify(true);
    toast({ title: "Verification Code Sent", description: `Code sent to ${newEmail} (Check console for demo code)` });
    console.log("DEMO EMAIL CODE: 123456"); 
  };

  const verifyAndChangeEmail = async () => {
    if (emailCode !== "123456") {
      toast({ title: "Error", description: "Invalid code", variant: "destructive" });
      return;
    }
    
    try {
      if (currentUser && newEmail) {
        await updateEmail(currentUser, newEmail);
        // Update DB
        await fetch(`http://localhost:5000/api/users/${currentUser.uid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: newEmail })
        });
        toast({ title: "Success", description: "Email updated successfully" });
        setShowEmailVerify(false);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This is permanent.")) return;
    
    try {
      await fetch(`http://localhost:5000/api/users/${currentUser?.uid}`, { method: "DELETE" });
      await deleteUser(currentUser!);
      window.location.href = "/login";
    } catch (error: any) {
      toast({ title: "Error", description: "Please re-login and try again. (Security requirement)", variant: "destructive" });
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input 
                        value={profileForm.firstName} 
                        onChange={e => setProfileForm({...profileForm, firstName: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input 
                        value={profileForm.lastName} 
                        onChange={e => setProfileForm({...profileForm, lastName: e.target.value})} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input 
                      value={profileForm.username} 
                      onChange={e => setProfileForm({...profileForm, username: e.target.value})} 
                    />
                  </div>

                  {/* Country and Phone Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 flex flex-col">
                      <Label>Country *</Label>
                      <Popover open={openCountry} onOpenChange={setOpenCountry}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCountry}
                            className="w-full justify-between"
                          >
                            {profileForm.countryCode
                              ? countries.find((country) => country.dial_code === profileForm.countryCode)?.name + ` (${profileForm.countryCode})`
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
                                    onSelect={(currentValue) => {
                                      setProfileForm({
                                        ...profileForm, 
                                        country: country.name,
                                        countryCode: country.dial_code
                                      });
                                      setOpenCountry(false);
                                      setIsPhoneVerified(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        profileForm.countryCode === country.dial_code ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {country.flag} {country.name} ({country.dial_code})
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
                        <div className="flex-shrink-0 flex items-center justify-center px-3 border rounded-md bg-muted text-muted-foreground min-w-[3rem]">
                          {profileForm.countryCode}
                        </div>
                        <Input 
                          type="tel"
                          placeholder="1234567890"
                          value={profileForm.phoneNumber} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, ''); // Numbers only
                            setProfileForm({...profileForm, phoneNumber: val});
                            setIsPhoneVerified(false);
                          }}
                          disabled={!profileForm.countryCode}
                        />
                      </div>
                      {/* Verification UI */}
                      {profileForm.phoneNumber && profileForm.phoneNumber.length >= 7 && !isPhoneVerified && !showPhoneVerify && (
                         <Button 
                           type="button" 
                           variant="secondary" 
                           size="sm" 
                           className="w-full mt-2"
                           onClick={initiatePhoneVerification}
                         >
                           Verify Phone Number
                         </Button>
                      )}
                      {showPhoneVerify && (
                        <div className="mt-2 space-y-2 p-2 border rounded-md bg-muted/50">
                          <Label className="text-xs">Enter SMS Code</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={phoneCode}
                              onChange={e => setPhoneCode(e.target.value)}
                              placeholder="123456"
                              className="h-8"
                            />
                            <Button type="button" size="sm" onClick={verifyPhoneCode}>Confirm</Button>
                          </div>
                          <p className="text-xs text-muted-foreground">Also check your email for a code (Simulated).</p>
                        </div>
                      )}
                      {isPhoneVerified && profileForm.phoneNumber && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <Check className="w-3 h-3" /> Verified
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Birthday</Label>
                    <Input 
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={profileForm.birthday} 
                      onChange={e => setProfileForm({...profileForm, birthday: e.target.value})} 
                    />
                  </div>

                  <div id="recaptcha-container"></div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={loading || (!!profileForm.phoneNumber && !isPhoneVerified)}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PREFERENCES TAB */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>App Preferences</CardTitle>
                <CardDescription>Customize your experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred theme.</p>
                  </div>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive emails about your account activity.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications inside the app.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INTEGRATIONS TAB */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Manage your external connections.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Github className="w-8 h-8" />
                    <div>
                      <p className="font-medium">GitHub</p>
                      <p className="text-sm text-muted-foreground">Connect repositories and sync issues.</p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">G</div>
                    <div>
                      <p className="font-medium">Google</p>
                      <p className="text-sm text-muted-foreground">Used for sign in and calendar sync.</p>
                    </div>
                  </div>
                  <Button variant="outline" disabled>Connected</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECURITY TAB */}
          <TabsContent value="security">
            <div className="space-y-6">
              {/* Email Change */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Address</CardTitle>
                  <CardDescription>Change your account email address.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <Input value={profileForm.email} disabled className="bg-muted" />
                  </div>
                  {!showEmailVerify ? (
                    <div className="flex gap-2">
                      <Input 
                        placeholder="New Email Address" 
                        value={newEmail} 
                        onChange={e => setNewEmail(e.target.value)} 
                      />
                      <Button onClick={handleEmailChange}>Send Code</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Enter Verification Code" 
                        value={emailCode} 
                        onChange={e => setEmailCode(e.target.value)} 
                      />
                      <Button onClick={verifyAndChangeEmail}>Verify & Change</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delete Account */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible actions for your account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    After deleting your account, you will lose all related information including tasks, events, projects, notes, etc.
                    This action is permanent and cannot be undone.
                  </p>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsView;

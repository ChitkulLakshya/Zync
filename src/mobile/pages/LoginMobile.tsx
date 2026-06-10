import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { ArrowRight, Github } from "lucide-react";
import { auth } from "@/lib/firebase";
import { API_BASE_URL, getFullUrl, getUserInitials } from "@/lib/utils";
import { postLoginRedirect } from "@/lib/postLoginRedirect";
import { signOutAndClearState } from "@/lib/auth-signout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LinkedinSignInButton } from "@/components/auth/LinkedinSignInButton";

const LoginMobile = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const customToken = params.get("customToken");
    const authError = params.get("error");

    if (authError) {
      toast({ variant: "destructive", title: "Login Error", description: decodeURIComponent(authError) });
      navigate("/login", { replace: true });
      return;
    }

    if (customToken) {
      signInWithCustomToken(auth, customToken)
        .then(async (cred) => {
          toast({ title: "Success", description: "Logged in successfully" });
          await postLoginRedirect(navigate, cred.user);
        })
        .catch((error: any) => {
          toast({ variant: "destructive", title: "Login Error", description: error.message });
        });
    }
  }, [location.search, navigate, toast]);

  const handleContinue = async () => {
    if (currentUser) {
      await postLoginRedirect(navigate, currentUser);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      setLoading(true);
      await signOutAndClearState(auth);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Success", description: "Logged in successfully" });
      await postLoginRedirect(navigate, cred.user);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountLinking = useCallback(
    async (error: any) => {
      if (error.code !== "auth/account-exists-with-different-credential") {
        toast({ variant: "destructive", title: "Error", description: error.message });
        return;
      }

      const emailFromError = error.customData?.email;
      if (!emailFromError) {
        toast({ variant: "destructive", title: "Error", description: "Account linking failed." });
        return;
      }

      toast({
        variant: "destructive",
        title: "Account Exists",
        description: "Use your existing provider first, then try again.",
      });
    },
    [toast],
  );

  const handleGithubLogin = async () => {
    setLoading(true);
    try {
      const provider = new GithubAuthProvider();
      provider.addScope("repo");
      provider.addScope("read:user");
      provider.setCustomParameters({ prompt: "consent" });
      const result = await signInWithPopup(auth, provider);

      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken;
      if (githubToken && result.user) {
        const firebaseToken = await result.user.getIdToken();
        await fetch(`${API_BASE_URL}/api/github/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${firebaseToken}` },
          body: JSON.stringify({ accessToken: githubToken, username: result.user.displayName || "unknown" }),
        });
      }

      toast({ title: "Success", description: "Logged in with GitHub successfully" });
      await postLoginRedirect(navigate, result.user);
    } catch (error: any) {
      await handleAccountLinking(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      toast({ title: "Success", description: "Logged in with Google successfully" });
      await postLoginRedirect(navigate, result.user);
    } catch (error: any) {
      await handleAccountLinking(error);
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className="min-h-screen bg-transparent px-4 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-none">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={getFullUrl(currentUser.photoURL)} referrerPolicy="no-referrer" />
                  <AvatarFallback>{getUserInitials(currentUser)}</AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">Welcome Back</CardTitle>
              <CardDescription className="break-all">{currentUser.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleContinue} className="w-full">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleSwitchAccount} className="w-full" disabled={loading}>
                {loading ? "Signing out..." : "Switch account"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-4 flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/zync-dark.webp" alt="Zync" className="h-8 w-8 rounded-md object-contain" />
            <span className="text-base font-semibold">Zync</span>
          </div>
          <Link to="/" className="text-xs text-foreground">Back</Link>
        </div>

        <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-none">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Login</CardTitle>
            <CardDescription>Access your account on mobile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="mobile-email">Email</Label>
                <Input
                  id="mobile-email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mobile-password">Password</Label>
                <Input
                  id="mobile-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>

            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" onClick={handleGithubLogin} disabled={loading} className="w-full">
                <Github className="mr-2 h-4 w-4" />
                Continue with GitHub
              </Button>
              <Button variant="outline" onClick={handleGoogleLogin} disabled={loading} className="w-full">
                Continue with Google
              </Button>
              <LinkedinSignInButton auth={auth} disabled={loading} />
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="text-foreground hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginMobile;

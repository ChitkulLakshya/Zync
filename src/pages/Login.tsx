import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, GithubAuthProvider, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      // Navigation handled by onAuthStateChanged
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to handle account linking
  const handleAccountLinking = async (error: any) => {
    if (error.code === 'auth/account-exists-with-different-credential') {
      const pendingCred = GithubAuthProvider.credentialFromError(error) || GoogleAuthProvider.credentialFromError(error);
      const email = error.customData?.email;

      if (!email || !pendingCred) {
        toast({ title: "Error", description: "Could not link accounts automatically.", variant: "destructive" });
        return;
      }

      try {
        // Get existing providers
        const { fetchSignInMethodsForEmail } = await import("firebase/auth");
        const { linkWithCredential } = await import("firebase/auth");

        const methods = await fetchSignInMethodsForEmail(auth, email);

        if (methods.length > 0) {
          const providerId = methods[0];
          let provider: any;
          if (providerId === 'google.com') provider = new GoogleAuthProvider();
          else if (providerId === 'github.com') provider = new GithubAuthProvider();

          if (provider) {
            const confirmLink = window.confirm(`You already have an account with ${providerId}. Sign in with it to link your new credential?`);
            if (!confirmLink) return;

            // Sign in with existing provider
            const result = await signInWithPopup(auth, provider);

            // Link the new credential
            await linkWithCredential(result.user, pendingCred);

            toast({ title: "Success", description: "Accounts linked successfully!" });
            // Navigation will happen via onAuthStateChanged
          }
        }
      } catch (linkError: any) {
        console.error("Linking failed", linkError);
        toast({ title: "Linking Error", description: linkError.message, variant: "destructive" });
      }
    } else {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleGithubLogin = async () => {
    setLoading(true);
    try {
      const provider = new GithubAuthProvider();
      provider.addScope('repo');
      provider.addScope('read:user');

      const result = await signInWithPopup(auth, provider);

      // Get GitHub access token and sync
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken;

      if (githubToken && result.user) {
        try {
          const firebaseToken = await result.user.getIdToken();
          try {
            await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/github/connect`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${firebaseToken}` },
              body: JSON.stringify({ accessToken: githubToken, username: result.user.displayName || 'unknown' })
            });
          } catch (fetchError: any) {
            if (fetchError.name === 'AbortError') return;
            throw fetchError;
          }
        } catch (e) { console.warn('Failed to save GitHub token:', e); }
      }

      toast({ title: "Success", description: "Logged in with GitHub successfully" });
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
      await signInWithPopup(auth, provider);
      toast({ title: "Success", description: "Logged in with Google successfully" });
    } catch (error: any) {
      await handleAccountLinking(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login to ZYNC</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={handleGithubLogin} disabled={loading}>
              <Github className="mr-2 h-4 w-4" />
              Github
            </Button>
            <Button variant="outline" onClick={handleGoogleLogin} disabled={loading}>
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
              Google
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;

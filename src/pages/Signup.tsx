import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GithubAuthProvider,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Github } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/utils';
import { postLoginRedirect } from '@/lib/postLoginRedirect';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    message: string;
    resolve: (v: boolean) => void;
  } | null>(null);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const handleConfirm = useCallback(
    (value: boolean) => {
      confirmState?.resolve(value);
      setConfirmState(null);
    },
    [confirmState]
  );
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  useEffect(() => {
    if (auth.currentUser) {
      void postLoginRedirect(navigate, auth.currentUser);
    }
  }, [navigate]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Check if password appears in known data breaches
      const breachRes = await fetch(`${API_BASE_URL}/api/users/check-breached-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (breachRes.ok) {
        const breachData = await breachRes.json();
        if (breachData.isCompromised) {
          toast({
            variant: 'destructive',
            title: 'Compromised password',
            description: `This password has appeared in ${breachData.count.toLocaleString()} known data breaches. Please choose a different password.`,
          });
          setLoading(false);
          return;
        }
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();

      await fetch(`${API_BASE_URL}/api/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || email.split('@')[0],
          photoURL: result.user.photoURL,
          phoneNumber: phoneNumber || undefined,
        }),
      });

      toast({
        title: 'Success',
        description: 'Account created successfully',
      });
      await postLoginRedirect(navigate, result.user);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountLinking = async (error: any) => {
    if (error.code === 'auth/account-exists-with-different-credential') {
      const pendingCred =
        GithubAuthProvider.credentialFromError(error) ||
        GoogleAuthProvider.credentialFromError(error);
      const email = error.customData?.email;

      if (!email || !pendingCred) {
        toast({
          title: 'Error',
          description: 'Could not link accounts automatically.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const { fetchSignInMethodsForEmail } = await import('firebase/auth');
        const { linkWithCredential } = await import('firebase/auth');

        const methods = await fetchSignInMethodsForEmail(auth, email);

        if (methods.length > 0) {
          const providerId = methods[0];
          let provider: any;
          if (providerId === 'google.com') {
            provider = new GoogleAuthProvider();
          } else if (providerId === 'github.com') {
            provider = new GithubAuthProvider();
          }

          if (provider) {
            const confirmLink = await showConfirm(
              `You already have an account with ${providerId}. Sign in with it to link your new credential?`
            );
            if (!confirmLink) {
              return;
            }

            const result = await signInWithPopup(auth, provider);
            await linkWithCredential(result.user, pendingCred);

            toast({ title: 'Success', description: 'Accounts linked successfully!' });
            await postLoginRedirect(navigate, result.user);
          }
        }
      } catch (linkError: any) {
        console.error('Linking failed', linkError);
        toast({ title: 'Linking Error', description: linkError.message, variant: 'destructive' });
      }
    } else {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleGithubSignup = async () => {
    setLoading(true);
    try {
      const provider = new GithubAuthProvider();
      provider.addScope('repo');
      provider.addScope('read:user');
      provider.setCustomParameters({
        prompt: 'consent',
      });

      const result = await signInWithPopup(auth, provider);

      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken;

      if (githubToken && result.user) {
        try {
          const firebaseToken = await result.user.getIdToken();
          await fetch(`${API_BASE_URL}/api/github/connect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${firebaseToken}`,
            },
            body: JSON.stringify({
              accessToken: githubToken,
              username: result.user.displayName || 'unknown',
            }),
          });
        } catch (e) {
          console.warn('Failed to save GitHub token:', e);
        }
      }

      toast({ title: 'Success', description: 'Signed up with GitHub successfully' });
      await postLoginRedirect(navigate, result.user);
    } catch (error: any) {
      await handleAccountLinking(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
      });
      const result = await signInWithPopup(auth, provider);
      toast({ title: 'Success', description: 'Signed up with Google successfully' });
      await postLoginRedirect(navigate, result.user);
    } catch (error: any) {
      await handleAccountLinking(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-border/10 shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Enter your email below to create your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSignup} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Used for account recovery. Verification not required.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                ></path>
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGithubSignup}
              disabled={loading}
            >
              <Github className="mr-2 h-4 w-4" />
              Github
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-foreground hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>

      <AlertDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open) {
            handleConfirm(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Link Account</AlertDialogTitle>
            <AlertDialogDescription>{confirmState?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirm(true)}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Signup;

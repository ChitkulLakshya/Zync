/**
 * @fileoverview Signup.tsx
 * @module Signup
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
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup, GithubAuthProvider, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Github } from '@/components/ui/GithubIcon';
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/utils";
import { postLoginRedirect } from "@/lib/postLoginRedirect";

const Signup = () => {
  // What: State variables for user inputs (email, password, phone).
  // Why: Manages the form data typed by the user before submission.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // What: State to track loading status during authentication.
  // Why: Prevents double-submission and allows the UI to show a loading spinner.
  const [loading, setLoading] = useState(false);

  // What: State and callbacks for a custom confirmation dialog.
  // Why: Provides a better user experience than native browser alerts when linking accounts.
  const [confirmState, setConfirmState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const handleConfirm = useCallback((value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  }, [confirmState]);

  // What: Router hooks for navigation and accessing URL state.
  // Why: Used to redirect after signup and to pre-fill the email if passed from another page.
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // What: Effect to pre-fill email field.
  // Why: If a user started signing up elsewhere and was redirected here, this saves them from retyping their email.
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  // What: Effect to check if user is already logged in.
  // Why: Redirects authenticated users away from the signup page to their dashboard.
  useEffect(() => {
    if (auth.currentUser) {
      void postLoginRedirect(navigate, auth.currentUser);
    }
  }, [navigate]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {

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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || email.split("@")[0],
          photoURL: result.user.photoURL,
          phoneNumber: phoneNumber || undefined
        })
      });

      toast({
        title: "Success",
        description: "Account created successfully",
      });
      await postLoginRedirect(navigate, result.user);
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


  const handleAccountLinking = async (error: any) => {
    if (error.code === 'auth/account-exists-with-different-credential') {
      const pendingCred = GithubAuthProvider.credentialFromError(error) || GoogleAuthProvider.credentialFromError(error);
      const email = error.customData?.email;

      if (!email || !pendingCred) {
        toast({ title: "Error", description: "Could not link accounts automatically.", variant: "destructive" });
        return;
      }

      try {
        const { fetchSignInMethodsForEmail } = await import("firebase/auth");
        const { linkWithCredential } = await import("firebase/auth");

        const methods = await fetchSignInMethodsForEmail(auth, email);

        if (methods.length > 0) {
          const providerId = methods[0];
          let provider: any;
          if (providerId === 'google.com') {provider = new GoogleAuthProvider();}
          else if (providerId === 'github.com') {provider = new GithubAuthProvider();}

          if (provider) {
            const confirmLink = await showConfirm(`You already have an account with ${providerId}. Sign in with it to link your new credential?`);
            if (!confirmLink) {return;}

            const result = await signInWithPopup(auth, provider);
            await linkWithCredential(result.user, pendingCred);

            toast({ title: "Success", description: "Accounts linked successfully!" });
            await postLoginRedirect(navigate, result.user);
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

  const handleGithubSignup = async () => {
    setLoading(true);
    try {
      const provider = new GithubAuthProvider();
      provider.addScope('repo');
      provider.addScope('read:user');
      provider.setCustomParameters({
        prompt: 'consent'
      });

      const result = await signInWithPopup(auth, provider);

      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken;

      if (githubToken && result.user) {
        try {
          const firebaseToken = await result.user.getIdToken();
          await fetch(`${API_BASE_URL}/api/github/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${firebaseToken}` },
            body: JSON.stringify({ accessToken: githubToken, username: result.user.displayName || 'unknown' })
          });
        } catch (e) {
          console.warn('Failed to save GitHub token:', e);
        }
      }

      toast({ title: "Success", description: "Signed up with GitHub successfully" });
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
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      toast({ title: "Success", description: "Signed up with Google successfully" });
      await postLoginRedirect(navigate, result.user);
    } catch (error: any) {
      await handleAccountLinking(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo + Name */}
        <div className="flex flex-col items-center mb-8">
          <img src="/zync-white.webp" alt="Zync" className="h-24 w-auto rounded-2xl block dark:hidden" />
          <img src="/zync-dark.webp" alt="Zync" className="h-24 w-auto rounded-2xl hidden dark:block" />
          <h1 className="text-3xl font-bold tracking-tight mt-4">Zync</h1>
        </div>

      <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-semibold">Create an account</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
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
              <p className="text-xs text-muted-foreground">Used for account recovery. Verification not required.</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
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

          <div className="grid gap-2">
            <Button variant="outline" className="w-full" onClick={handleGoogleSignup} disabled={loading}>
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
              Google
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGithubSignup} disabled={loading}>
              <Github className="mr-2 h-4 w-4" />
              Github
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-foreground hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
      </div>

      <AlertDialog open={!!confirmState} onOpenChange={(open) => { if (!open) {handleConfirm(false);} }}>
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

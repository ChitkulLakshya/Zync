/**
 * @fileoverview LoginMobile.tsx
 * @module LoginMobile
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
// Imports React hooks to manage component state and lifecycle side effects.
import { useCallback, useEffect, useState } from "react";
// Imports React Router components for navigation and routing within the mobile app.
import { Link, useLocation, useNavigate } from "react-router-dom";
// Imports Firebase Auth methods to authenticate users and manage their session state securely.
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
// Imports UI icons for visual enhancement on the login page.
import { ArrowRight } from "lucide-react";
// Imports the local Github SVG component to bypass the missing export issue in lucide-react.
import { Github } from '@/components/ui/GithubIcon';
// Imports the configured Firebase auth instance to ensure all auth calls point to the correct project.
import { auth } from "@/lib/firebase";
// Imports utility functions like the API base URL and avatar generators to fetch backend data and display initials.
import { API_BASE_URL, getFullUrl, getUserInitials } from "@/lib/utils";
// Imports the postLoginRedirect utility to dynamically route users to their dashboard or welcome page after login.
import { postLoginRedirect } from "@/lib/postLoginRedirect";
// Imports the signout utility to clear local state and safely log the user out if they switch accounts.
import { signOutAndClearState } from "@/lib/auth-signout";
// Imports the toast hook to trigger non-intrusive notifications (like errors or success messages) on screen.
import { useToast } from "@/hooks/use-toast";
// Imports the standard button component from our UI library for consistent interactive elements.
import { Button } from "@/components/ui/button";
// Imports the input field component to capture the user's email and password.
import { Input } from "@/components/ui/input";
// Imports the label component to ensure accessibility for screen readers on the input fields.
import { Label } from "@/components/ui/label";
// Imports Card components to wrap the login form in a visually distinct, elevated container.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Imports Avatar components to display the user's profile picture if they are already logged in.
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Imports the specialized LinkedIn button to provide a third-party OAuth login option.
import { LinkedinSignInButton } from "@/components/auth/LinkedinSignInButton";
import { InstallPromptView, useAppInstallStatus } from "@/features/install-wall";

// Defines the main React component for the mobile-specific login view.
const LoginMobile = () => {
  // Initializes state to store the user's typed email address.
  const [email, setEmail] = useState("");
  // Initializes state to store the user's typed password securely.
  const [password, setPassword] = useState("");
  // Initializes state to track if an authentication request is in progress to disable buttons and show loading spinners.
  const [loading, setLoading] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  // Initializes state to hold the Firebase User object if a session already exists.
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Initializes the navigate function to programmatically route the user to different pages.
  const navigate = useNavigate();
  // Initializes the location object to read URL parameters (like custom tokens from email links).
  const location = useLocation();
  // Destructures the toast function to easily trigger UI notifications.
  const { toast } = useToast();
  const { hasCheckedStatus, requiresInstallWall, isIOS, isAndroid } = useAppInstallStatus();

  // Synchronizes the local currentUser state with Firebase's global authentication observer.
  useEffect(() => {
    // Subscribes to auth changes (login, logout, token refresh).
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      // Updates state with the new user or null if logged out.
      setCurrentUser(user);
    });
    // Unsubscribes from the listener when the component unmounts to prevent memory leaks.
    return () => unsubscribe();
  }, []);

  // Listens for external URL parameters like custom auth tokens or errors from OAuth redirects.
  useEffect(() => {
    // Parses query parameters from the current URL.
    const params = new URLSearchParams(location.search);
    // Retrieves a custom token if present (e.g. from backend OAuth exchange).
    const customToken = params.get("customToken");
    // Retrieves any error messages passed through the URL.
    const authError = params.get("error");

    // If an error exists in the URL, display it to the user.
    if (authError) {
      // Triggers a destructive toast notification showing the decoded error message.
      toast({ variant: "destructive", title: "Login Error", description: decodeURIComponent(authError) });
      // Replaces the current URL with the clean login route to remove the error parameters.
      navigate("/login", { replace: true });
      // Exits the effect early since an error occurred.
      return;
    }

    // If a custom token exists, attempt to log the user in with it.
    if (customToken) {
      // Calls Firebase to authenticate using the backend-generated custom token.
      signInWithCustomToken(auth, customToken)
        .then(async (cred) => {
          // On success, shows a positive toast notification.
          toast({ title: "Success", description: "Logged in successfully" });
          // Redirects the user to the appropriate post-login destination using their credentials.
          await postLoginRedirect(navigate, cred.user);
        })
        .catch((error: any) => {
          // On failure, shows a destructive toast with the Firebase error message.
          toast({ variant: "destructive", title: "Login Error", description: error.message });
        });
    }
  }, [location.search, navigate, toast]);

  // Defines a handler for users who are already logged in and simply want to proceed to the app.
  const handleContinue = async () => {
    // Checks if the user is actually loaded into state.
    if (currentUser) {
      setIsContinuing(true);
      try {
        // Redirects them to the dashboard or welcome flow based on their account age.
        await postLoginRedirect(navigate, currentUser);
      } finally {
        setIsContinuing(false);
      }
    }
  };

  // Defines a handler to log out the current user and allow them to sign in with a different account.
  const handleSwitchAccount = async () => {
    try {
      // Sets the signing out state to true.
      setIsSigningOut(true);
      // Calls the global sign-out utility to clear caches, indexedDB, and log out from Firebase.
      await signOutAndClearState(auth);
      // Clears the local state so the standard login form renders instead of the "Welcome Back" screen.
      setCurrentUser(null);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Defines the handler for the standard email/password form submission.
  const handleEmailLogin = async (event: React.FormEvent) => {
    // Prevents the browser from performing a full page reload on form submit.
    event.preventDefault();
    // Sets loading to true to disable the form fields.
    setLoading(true);
    try {
      // Calls Firebase to authenticate with the provided email and password.
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Shows a success toast to assure the user.
      toast({ title: "Success", description: "Logged in successfully" });
      // Redirects them into the application seamlessly.
      await postLoginRedirect(navigate, cred.user);
    } catch (error: any) {
      // If auth fails (wrong password, etc.), shows the error message in a red toast.
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      // Stops the loading spinner.
      setLoading(false);
    }
  };

  // Defines a helper to handle the edge case where a user tries to sign in with Google but their email was already registered via GitHub (or vice versa).
  const handleAccountLinking = useCallback(
    async (error: any) => {
      // If the error is not related to credential conflicts, just show a standard error.
      if (error.code !== "auth/account-exists-with-different-credential") {
        toast({ variant: "destructive", title: "Error", description: error.message });
        return;
      }

      // Extracts the email address that caused the conflict from the error object.
      const emailFromError = error.customData?.email;
      // If the email is missing, we cannot assist them further, so we fail gracefully.
      if (!emailFromError) {
        toast({ variant: "destructive", title: "Error", description: "Account linking failed." });
        return;
      }

      // Instructs the user to log in with their original provider (Google/GitHub/LinkedIn).
      toast({
        variant: "destructive",
        title: "Account Exists",
        description: "Use your existing provider first, then try again.",
      });
    },
    [toast],
  );

  // Defines the handler for the GitHub OAuth login button.
  const handleGithubLogin = async () => {
    // Sets loading state to true.
    setLoading(true);
    try {
      // Initializes the GitHub OAuth provider configuration object.
      const provider = new GithubAuthProvider();
      // Requests access to the user's private and public repositories so Zync can fetch their architecture data.
      provider.addScope("repo");
      // Requests access to their profile data to fetch their avatar and username.
      provider.addScope("read:user");
      // Forces the consent screen to appear so the user explicitly authorizes Zync.
      provider.setCustomParameters({ prompt: "consent" });
      // Triggers the popup window for GitHub authentication.
      const result = await signInWithPopup(auth, provider);

      // Extracts the raw GitHub access token from the authentication result.
      const credential = GithubAuthProvider.credentialFromResult(result);
      // Safely retrieves the token string.
      const githubToken = credential?.accessToken;
      // If a GitHub token was returned along with a valid user object:
      if (githubToken && result.user) {
        // Retrieves the Firebase JWT token to securely authenticate the backend request.
        const firebaseToken = await result.user.getIdToken();
        // Sends the GitHub access token to the Zync backend so it can be securely stored for background repository syncing.
        await fetch(`${API_BASE_URL}/api/github/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${firebaseToken}` },
          // Sends the token and the user's display name as a JSON payload.
          body: JSON.stringify({ accessToken: githubToken, username: result.user.displayName || "unknown" }),
        });
      }

      // Shows a success message that GitHub login worked.
      toast({ title: "Success", description: "Logged in with GitHub successfully" });
      // Routes the user to the app.
      await postLoginRedirect(navigate, result.user);
    } catch (error: any) {
      // If the GitHub login failed because the email belongs to a Google account, triggers the linking handler.
      await handleAccountLinking(error);
    } finally {
      // Resets loading state.
      setLoading(false);
    }
  };

  // Defines the handler for the Google OAuth login button.
  const handleGoogleLogin = async () => {
    // Sets loading state to true.
    setLoading(true);
    try {
      // Initializes the Google OAuth provider configuration object.
      const provider = new GoogleAuthProvider();
      // Forces the account selection screen to appear so users with multiple Google accounts can choose the right one.
      provider.setCustomParameters({ prompt: "select_account" });
      // Triggers the popup window for Google authentication.
      const result = await signInWithPopup(auth, provider);
      // Shows a success message.
      toast({ title: "Success", description: "Logged in with Google successfully" });
      // Routes the user to the app.
      await postLoginRedirect(navigate, result.user);
    } catch (error: any) {
      // If the Google login failed because the email belongs to a GitHub account, triggers the linking handler.
      await handleAccountLinking(error);
    } finally {
      // Resets loading state.
      setLoading(false);
    }
  };

  if (hasCheckedStatus && requiresInstallWall) {
    return <InstallPromptView isIOS={isIOS} isAndroid={isAndroid} appName="ZYNC" />;
  }

  // Checks if a user session is already active (i.e. they closed the tab without logging out).
  if (currentUser) {
    // Renders a simplified "Welcome Back" screen instead of the full login form.
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
              <Button onClick={handleContinue} className="w-full" disabled={isContinuing || isSigningOut}>
                {isContinuing ? "Connecting..." : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleSwitchAccount} className="w-full" disabled={isContinuing || isSigningOut}>
                {isSigningOut ? "Signing out..." : "Switch account"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Renders the main login form if no active user session exists.
  return (
    <div className="min-h-screen bg-transparent px-4 flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4">
        {/* Logo + Name */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <img src="/zync-white.webp" alt="Zync" className="h-16 sm:h-20 md:h-24 w-auto rounded-xl sm:rounded-2xl block dark:hidden" />
          <img src="/zync-dark.webp" alt="Zync" className="h-16 sm:h-20 md:h-24 w-auto rounded-xl sm:rounded-2xl hidden dark:block" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3 sm:mt-4">Zync</h1>
        </div>

        <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-none">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Login</CardTitle>
            <CardDescription>Access your account on mobile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* The primary email and password form block */}
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

            {/* The third-party OAuth social login buttons block */}
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

            {/* A small link redirecting to the signup page for new users */}
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

// Exports the mobile login page component for routing.
export default LoginMobile;

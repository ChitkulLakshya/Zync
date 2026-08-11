/**
 * @fileoverview InstallPromptView.tsx
 * @module InstallPromptView
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
// Imports essential React hooks (useEffect, useMemo, useState) required for managing side effects, derived state, and local component state.
import { useEffect, useState } from "react";
// Imports specific icons (Download, Share2, Smartphone, CheckCircle2) from the 'lucide-react' library to enhance the UI visually.
import { Download, Bell, BellOff, CheckCircle2 } from "lucide-react";
// Imports the reusable 'Button' component from the local UI library for consistent styling of interactive elements.
import { Button } from "@/components/ui/button";
// Imports various Card sub-components from the local UI library to structure the prompt interface neatly.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppInstallStatus } from "../hooks/useAppInstallStatus";

// Extends the standard DOM Event interface to include properties specific to the 'beforeinstallprompt' event, ensuring TypeScript understands this PWA-specific event.
interface BeforeInstallPromptEvent extends Event {
  // Readonly array of strings representing the platforms the app can be installed on.
  readonly platforms: string[];
  // A function that returns a Promise, used to programmatically trigger the native browser install prompt.
  prompt: () => Promise<void>;
  // A Promise that resolves to an object detailing the user's choice (accepted or dismissed) after the prompt is shown.
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Defines the expected props for the InstallPromptView component to ensure consumers pass the correct environmental flags.
interface InstallPromptViewProps {
  // Boolean flag indicating if the device is running iOS.
  isIOS: boolean;
  // Boolean flag indicating if the device is running Android.
  isAndroid: boolean;
  // Optional string for the application name, defaulting to "ZYNC" if not provided.
  appName?: string;
}

// Declares the functional component 'InstallPromptView', destructuring its props and assigning a default value of "ZYNC" to 'appName'.
const InstallPromptView = ({ isIOS, isAndroid, appName = "ZYNC" }: InstallPromptViewProps) => {
  const { isStandalone } = useAppInstallStatus();
  // Initializes a state variable 'deferredPrompt' to null, used to capture and hold the native 'beforeinstallprompt' event for later triggering on Android.
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Initializes a boolean state variable 'isInstalling' to false, tracking whether the install process is currently active to disable UI elements.
  const [isInstalling, setIsInstalling] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const [isRequestingNotif, setIsRequestingNotif] = useState(false);

  // Uses the useEffect hook to listen for the 'beforeinstallprompt' event when the component mounts, which is critical for customizing the PWA install flow on Android.
  useEffect(() => {
    // Defines the event handler function that runs when the browser fires the 'beforeinstallprompt' event.
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevents the browser's default immediate mini-infobar from appearing, allowing us to show our custom UI instead.
      event.preventDefault();
      // Stores the event object in the 'deferredPrompt' state so we can call its .prompt() method later when the user clicks our custom install button.
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    // Attaches the event listener to the global window object.
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    // Returns a cleanup function that removes the event listener when the component unmounts, preventing memory leaks and duplicate listeners.
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  // Empty dependency array ensures this effect only runs once on mount.
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleEnableNotifications = async () => {
    if (typeof Notification === "undefined") { return; }
    setIsRequestingNotif(true);
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    } finally {
      setIsRequestingNotif(false);
    }
  };

  // Returns the JSX structure that defines the visual layout of the install prompt view.
  // Renders a full-viewport height container with a background color and padding, ensuring the prompt takes up the whole screen natively.
  return (
    <div className="min-h-[100dvh] w-full bg-background px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md items-center justify-center">
        <Card className="w-full border-border/10 bg-card/50 shadow-none backdrop-blur-xl">
          <CardHeader className="space-y-4 text-center pt-6">
            <div className="mx-auto flex flex-col items-center gap-3">
              <img
                src="/zync-white.webp"
                alt={appName}
                className="h-20 w-20 rounded-2xl object-contain block dark:hidden"
              />
              <img
                src="/zync-dark.webp"
                alt={appName}
                className="h-20 w-20 rounded-2xl object-contain hidden dark:block"
              />
              <div className="space-y-1">
                <CardTitle className="text-xl md:text-2xl">Install {appName}</CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Install the app to get the full experience with push notifications.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button
              type="button"
              className="h-12 w-full text-base"
              onClick={handleInstallClick}
              disabled={isInstalling}
            >
              <Download className="mr-2 h-5 w-5" />
              {isInstalling ? "Installing..." : "Install App"}
            </Button>

            {!isIOS && !deferredPrompt && (
              <p className="text-center text-xs text-muted-foreground">
                If nothing happens, open your browser menu and tap <strong>Install app</strong>.
              </p>
            )}

            {isStandalone && (
            <div className="rounded-xl border border-border/10 bg-card/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                {notifPermission === "granted" ? (
                  <Bell className="h-4 w-4 text-emerald-500" />
                ) : notifPermission === "denied" ? (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Bell className="h-4 w-4 text-foreground" />
                )}
                <p className="text-sm font-medium">Enable Notifications</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {notifPermission === "granted"
                  ? "Notifications are enabled. You'll receive push notifications for tasks and meetings."
                  : notifPermission === "denied"
                  ? "Notifications are blocked. Enable them in your browser settings to receive task and meeting alerts."
                  : "Get instant alerts when tasks are assigned or meetings are scheduled in your team."}
              </p>
              {notifPermission !== "granted" && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full"
                  onClick={handleEnableNotifications}
                  disabled={isRequestingNotif || notifPermission === "denied"}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  {isRequestingNotif
                    ? "Requesting..."
                    : notifPermission === "denied"
                    ? "Blocked \u2013 Enable in Settings"
                    : "Allow Notifications"}
                </Button>
              )}
              {notifPermission === "granted" && (
                <div className="flex items-center gap-2 text-sm text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Notifications enabled</span>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Exports the 'InstallPromptView' component as the default export of this module, allowing it to be easily imported in other files.
export default InstallPromptView;



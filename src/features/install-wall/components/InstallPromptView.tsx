// Imports essential React hooks (useEffect, useMemo, useState) required for managing side effects, derived state, and local component state.
import { useEffect, useMemo, useState } from "react";
// Imports specific icons (Download, Share2, Smartphone, CheckCircle2) from the 'lucide-react' library to enhance the UI visually.
import { Download, Share2, Smartphone, CheckCircle2 } from "lucide-react";
// Imports the reusable 'Button' component from the local UI library for consistent styling of interactive elements.
import { Button } from "@/components/ui/button";
// Imports various Card sub-components from the local UI library to structure the prompt interface neatly.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Imports the 'Badge' component from the local UI library to highlight specific status labels, like "Mobile Install Required".
import { Badge } from "@/components/ui/badge";

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
  // Initializes a state variable 'deferredPrompt' to null, used to capture and hold the native 'beforeinstallprompt' event for later triggering on Android.
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Initializes a boolean state variable 'isInstalling' to false, tracking whether the install process is currently active to disable UI elements.
  const [isInstalling, setIsInstalling] = useState(false);

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

  // Memoizes a boolean indicating if auto-install is possible: it requires the device to be Android AND the 'beforeinstallprompt' event to have been captured.
  const canAutoInstall = useMemo(() => isAndroid && Boolean(deferredPrompt), [isAndroid, deferredPrompt]);

  // Defines an asynchronous click handler for the install button, wrapping the native PWA install prompt logic.
  const handleInstallClick = async () => {
    // Exits early if there is no deferred prompt available, preventing errors if the button is somehow clicked before the event fires.
    if (!deferredPrompt) {
      return;
    }

    // Starts a try...finally block to ensure the 'isInstalling' state is correctly reset regardless of whether the install succeeds or fails.
    try {
      // Sets the 'isInstalling' state to true, indicating to the UI that the install process is underway (e.g., to show a loading state).
      setIsInstalling(true);
      // Programmatically triggers the native browser installation prompt using the stored event.
      await deferredPrompt.prompt();
      // Waits for the user to respond to the native prompt (either accepting or dismissing the installation).
      await deferredPrompt.userChoice;
    } finally {
      // Resets the 'isInstalling' state to false, as the native prompt interaction is finished.
      setIsInstalling(false);
      // Clears the deferred prompt from state, as it can only be used once.
      setDeferredPrompt(null);
    }
  };

  // Returns the JSX structure that defines the visual layout of the install prompt view.
  // Renders a full-viewport height container with a background color and padding, ensuring the prompt takes up the whole screen natively.
  return (
    <div className="min-h-[100dvh] w-full bg-background px-4 py-6">
      {/* Centers the inner card vertically and horizontally within the viewport. */}
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md items-center justify-center">
        {/* Renders a Card component with a subtle border and glassmorphism (backdrop-blur) effect for a modern aesthetic. */}
        <Card className="w-full border-border/10 bg-card/50 shadow-none backdrop-blur-xl">
          {/* Defines the header section of the Card containing the icon, badge, and titles. */}
          <CardHeader className="space-y-3 text-center">
            {/* Renders a circular container for the Smartphone icon to make it visually prominent. */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/10 text-foreground">
              {/* Renders the Smartphone icon from lucide-react. */}
              <Smartphone className="h-6 w-6" />
            </div>
            {/* Groups the text elements with vertical spacing. */}
            <div className="space-y-2">
              {/* Renders a secondary badge indicating that installation is a requirement. */}
              <Badge variant="secondary" className="text-xs">
                Mobile Install Required
              </Badge>
              {/* Renders the main title of the card, dynamically including the application name. */}
              <CardTitle className="text-xl md:text-2xl">Install {appName} to Continue</CardTitle>
              {/* Renders a descriptive subtitle explaining why installation is necessary for the best experience. */}
              <CardDescription className="text-sm md:text-base">
                For the best real-time collaboration experience on mobile, {appName} must run as an installed app.
              </CardDescription>
            </div>
          </CardHeader>

          {/* Defines the main content area of the Card containing platform-specific instructions or buttons. */}
          <CardContent className="space-y-4">
            {/* Conditionally renders iOS-specific instructions if the 'isIOS' prop is true, as iOS does not support the 'beforeinstallprompt' API for custom install buttons.
                Wraps the iOS instructions in a distinct bordered box for clarity. */}
            {isIOS && (
              <div className="rounded-xl border border-border/10 bg-card/50 p-4">
                {/* Renders the instruction heading for iOS. */}
                <p className="mb-3 text-sm font-medium">On iPhone/iPad:</p>
                {/* Renders an ordered list of steps the iOS user must take manually. */}
                <ol className="space-y-2 text-sm text-muted-foreground">
                  {/* List item for step 1: tapping the share button. */}
                  <li className="flex items-start gap-2">
                    {/* Wraps the icon for alignment. */}
                    <span className="mt-0.5 text-foreground">
                      {/* Renders the native Apple Share icon equivalent. */}
                      <Share2 className="h-4 w-4" />
                    </span>
                    {/* Renders the text instruction for step 1. */}
                    <span>Tap the Share button in Safari.</span>
                  </li>
                  {/* List item for step 2: selecting "Add to Home Screen". */}
                  <li className="flex items-start gap-2">
                    {/* Wraps the icon for alignment. */}
                    <span className="mt-0.5 text-foreground">
                      {/* Renders a Download icon to represent adding to home screen. */}
                      <Download className="h-4 w-4" />
                    </span>
                    {/* Renders the text instruction for step 2, bolding the specific button name. */}
                    <span>Select <strong>Add to Home Screen</strong>.</span>
                  </li>
                  {/* List item for step 3: opening the app. */}
                  <li className="flex items-start gap-2">
                    {/* Wraps the icon for alignment. */}
                    <span className="mt-0.5 text-foreground">
                      {/* Renders a CheckCircle2 icon to represent completion. */}
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    {/* Renders the text instruction for step 3, dynamically including the app name. */}
                    <span>Open {appName} from your home screen.</span>
                  </li>
                </ol>
              </div>
            )}

            {/* Conditionally renders Android-specific text if 'isIOS' is false, explaining what the install button will do.
                Wraps the Android context text in a bordered box. */}
            {!isIOS && (
              <div className="rounded-xl border border-border/10 bg-card/50 p-4">
                {/* Renders the context heading for Android. */}
                <p className="mb-2 text-sm font-medium">Android install</p>
                {/* Renders the explanatory text for Android users. */}
                <p className="text-sm text-muted-foreground">
                  Tap install to add {appName} to your home screen and launch it in app mode.
                </p>
              </div>
            )}

            {/* Conditionally renders the interactive install button only if the device is Android.
                Renders a full-width Button component to trigger the PWA install prompt. */}
            {isAndroid && (
              <Button
                type="button"
                className="h-11 w-full"
                onClick={handleInstallClick}
                disabled={!canAutoInstall || isInstalling}
              >
                {/* Renders a Download icon inside the button. */}
                <Download className="mr-2 h-4 w-4" />
                {/* Dynamically changes the button text based on whether the install process is currently active. */}
                {isInstalling ? "Opening install prompt..." : "Install App"}
              </Button>
            )}

            {/* Conditionally renders fallback instructions for Android if the 'beforeinstallprompt' event was not caught (e.g., in some specific browsers or if already installed).
                Renders centered fallback text instructing the user to use the browser menu. */}
            {isAndroid && !deferredPrompt && (
              <p className="text-center text-xs text-muted-foreground">
                If install button is disabled, open browser menu and tap <strong>Install app</strong>.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Exports the 'InstallPromptView' component as the default export of this module, allowing it to be easily imported in other files.
export default InstallPromptView;



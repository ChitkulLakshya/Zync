import { useEffect, useMemo, useState } from "react";
import { Download, Share2, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallPromptViewProps {
  isIOS: boolean;
  isAndroid: boolean;
  appName?: string;
}

const InstallPromptView = ({ isIOS, isAndroid, appName = "ZYNC" }: InstallPromptViewProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const canAutoInstall = useMemo(() => isAndroid && Boolean(deferredPrompt), [isAndroid, deferredPrompt]);

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

  return (
    <div className="min-h-[100dvh] w-full bg-background px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md items-center justify-center">
        <Card className="w-full border-border/10 bg-card/50 shadow-none backdrop-blur-xl">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/10 text-foreground">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <Badge variant="secondary" className="text-xs">
                Mobile Install Required
              </Badge>
              <CardTitle className="text-xl md:text-2xl">Install {appName} to Continue</CardTitle>
              <CardDescription className="text-sm md:text-base">
                For the best real-time collaboration experience on mobile, {appName} must run as an installed app.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {isIOS && (
              <div className="rounded-xl border border-border/10 bg-card/50 p-4">
                <p className="mb-3 text-sm font-medium">On iPhone/iPad:</p>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-foreground">
                      <Share2 className="h-4 w-4" />
                    </span>
                    <span>Tap the Share button in Safari.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-foreground">
                      <Download className="h-4 w-4" />
                    </span>
                    <span>Select <strong>Add to Home Screen</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <span>Open {appName} from your home screen.</span>
                  </li>
                </ol>
              </div>
            )}

            {!isIOS && (
              <div className="rounded-xl border border-border/10 bg-card/50 p-4">
                <p className="mb-2 text-sm font-medium">Android install</p>
                <p className="text-sm text-muted-foreground">
                  Tap install to add {appName} to your home screen and launch it in app mode.
                </p>
              </div>
            )}

            {isAndroid && (
              <Button
                type="button"
                className="h-11 w-full"
                onClick={handleInstallClick}
                disabled={!canAutoInstall || isInstalling}
              >
                <Download className="mr-2 h-4 w-4" />
                {isInstalling ? "Opening install prompt..." : "Install App"}
              </Button>
            )}

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

export default InstallPromptView;


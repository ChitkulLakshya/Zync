import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface NotificationPermissionGateProps {
  onContinue: () => void;
  appName?: string;
}

const NotificationPermissionGate = ({
  onContinue,
  appName = 'ZYNC',
}: NotificationPermissionGateProps) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequest = async () => {
    if (typeof Notification === 'undefined') { return; }
    setIsRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } finally {
      setIsRequesting(false);
    }
  };

  const icon =
    permission === 'granted' ? (
      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
    ) : permission === 'denied' ? (
      <BellOff className="h-6 w-6 text-muted-foreground" />
    ) : (
      <Bell className="h-6 w-6 text-foreground" />
    );

  return (
    <div className="min-h-[100dvh] w-full bg-background px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md items-center justify-center">
        <Card className="w-full border-border/10 bg-card/50 shadow-none backdrop-blur-xl">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/10">
              {icon}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl md:text-2xl">Enable Notifications</CardTitle>
              <CardDescription className="text-sm md:text-base">
                {appName} needs notification access to alert you about new tasks and meeting invitations in real time.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {permission === 'default' && (
              <>
                <div className="rounded-xl border border-border/10 bg-card/50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-foreground" />
                    <p className="text-sm font-medium">Task & Meeting Alerts</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get instant push notifications when a task is assigned to you or a meeting is scheduled in your team.
                  </p>
                </div>
                <Button
                  type="button"
                  className="h-11 w-full"
                  onClick={handleRequest}
                  disabled={isRequesting}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  {isRequesting ? 'Requesting...' : 'Allow Notifications'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={onContinue}
                >
                  Skip for now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {permission === 'granted' && (
              <>
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="text-sm text-emerald-600">
                    Notifications are enabled. You'll receive push alerts for tasks and meetings.
                  </p>
                </div>
                <Button type="button" className="h-11 w-full" onClick={onContinue}>
                  Continue to {appName}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {permission === 'denied' && (
              <>
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-600">Notifications are blocked</p>
                    <p className="text-xs text-muted-foreground">
                      Enable them in your browser or system settings to receive task and meeting alerts.
                    </p>
                  </div>
                </div>
                <Button type="button" className="h-11 w-full" onClick={onContinue}>
                  Continue to {appName}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationPermissionGate;

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMe } from '@/hooks/useMe';
import { useTheme } from 'next-themes';
import { signOutAndClearState } from '@/lib/auth-signout';
import { LogOut, Moon, Sun, Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFullUrl } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/components/ui/use-toast';

const MobileSettings = () => {
  const { data: userData } = useMe();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const handleSignOut = async () => {
    try {
      await signOutAndClearState(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Profile */}
      <Card className="border border-border/10">
        <CardContent className="pt-4 flex items-center gap-3">
          <Avatar className="h-16 w-16 border border-border/20">
            <AvatarImage src={userData?.photoURL ? getFullUrl(userData.photoURL) : undefined} />
            <AvatarFallback className="text-lg">{(userData?.displayName || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{userData?.displayName || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{userData?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="border border-border/10">
        <CardContent className="pt-4 space-y-3">
          <p className="text-sm font-medium">Appearance</p>
          <div className="flex gap-2">
            <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border text-xs ${theme === 'light' ? 'border-foreground/20 bg-secondary/50' : 'border-border/10'}`}>
              <Sun className="w-4 h-4" /> Light
            </button>
            <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border text-xs ${theme === 'dark' ? 'border-foreground/20 bg-secondary/50' : 'border-border/10'}`}>
              <Moon className="w-4 h-4" /> Dark
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border border-border/10">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? (
                <Bell className="w-4 h-4 text-emerald-500" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">Push Notifications</p>
            </div>
            <Button
              variant={typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'outline' : 'default'}
              size="sm"
              onClick={async () => {
                if (typeof Notification === 'undefined') { return; }
                if (Notification.permission === 'granted') { return; }
                const result = await Notification.requestPermission();
                if (result === 'granted') {
                  toast({ title: 'Notifications Enabled', description: 'You will receive push notifications for tasks and meetings.' });
                } else {
                  toast({ title: 'Notifications Blocked', description: 'Enable them in your browser settings to receive alerts.', variant: 'destructive' });
                }
              }}
              disabled={typeof Notification !== 'undefined' && Notification.permission === 'granted'}
            >
              {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'Enabled' : 'Enable'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get alerts for task assignments and meeting invitations.
          </p>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={handleSignOut}>
        <LogOut className="w-4 h-4" /> Sign Out
      </Button>
    </div>
  );
};

export default MobileSettings;

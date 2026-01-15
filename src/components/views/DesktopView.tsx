import { useState, useEffect, useRef } from "react";
import { API_BASE_URL, getFullUrl } from "@/lib/utils";
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  Home,
  FolderKanban,
  Calendar,
  CheckSquare,
  FileText,

  Clock,
  Users,
  Settings,
  MoreHorizontal,
  Video,
  MessageSquare,
  Circle,
  Loader2,
  LogOut,
  Star,
  Github,
  Trash2,
  Send,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { getUserName, getUserInitials } from "@/lib/utils";
import { NotesView } from "@/components/notes/NotesView";
import TasksView from "./TasksView";
import ActivityLogView from "./ActivityLogView";
import Workspace from "@/components/workspace/Workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from "firebase/database";
import { Switch } from "@/components/ui/switch";
import { collection, query, where, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import ChatView from "./ChatView";
import SettingsView from "./SettingsView";
import DesignView from "./DesignView";
import MyProjectsView from "./MyProjectsView";
import CalendarView from "./CalendarView";
import DashboardView from "./DashboardView";
import PeopleView from "./PeopleView";
import ChatLayout from "./ChatLayout";
import CreateProject from "@/components/dashboard/CreateProject";
import TeamGateway from "./TeamGateway";
import { usePresence } from "@/hooks/usePresence";
import {
  PanelResizeHandle,
  Panel,
  PanelGroup,
  ImperativePanelHandle
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

const DesktopView = ({ isPreview = false }: { isPreview?: boolean }) => {
  const [activeSection, setActiveSection] = useState(() => {
    if (isPreview) return "My Workspace";
    return localStorage.getItem("zync-active-section") || "Dashboard";
  });



  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    const panel = sidebarRef.current;
    if (panel) {
      if (isCollapsed) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  useEffect(() => {
    if (!isPreview) {
      localStorage.setItem("zync-active-section", activeSection);
    }
  }, [activeSection, isPreview]);

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation(); // Get current URL location
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);

  // Handle custom chat open event
  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveSection("Chat");
      navigate('/dashboard/chat');
      if (customEvent.detail) {
        setSelectedChatUser(customEvent.detail);
      }
    };

    window.addEventListener("zync-open-chat", handleOpenChat);
    return () => window.removeEventListener("zync-open-chat", handleOpenChat);
  }, [navigate]);

  // Map URL paths to section names
  const pathToSection: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/home': 'Dashboard',
    '/dashboard/workspace': 'My Workspace',
    '/dashboard/projects': 'My Projects',
    '/dashboard/calendar': 'Calendar',
    '/dashboard/design': 'Design',
    '/dashboard/tasks': 'Tasks',
    '/dashboard/notes': 'Notes',

    '/dashboard/activity': 'Activity log',
    '/dashboard/people': 'People',
    '/dashboard/meet': 'Meet',
    '/dashboard/settings': 'Settings',
    '/dashboard/chat': 'Chat',
    '/dashboard/new-project': 'New Project',
  };

  // Map section names to URL paths
  const sectionToPath: Record<string, string> = {
    'Dashboard': '/dashboard',
    'My Workspace': '/dashboard/workspace',
    'My Projects': '/dashboard/projects',
    'Calendar': '/dashboard/calendar',
    'Design': '/dashboard/design',
    'Tasks': '/dashboard/tasks',
    'Notes': '/dashboard/notes',

    'Activity log': '/dashboard/activity',
    'People': '/dashboard/people',
    'Meet': '/dashboard/meet',
    'Settings': '/dashboard/settings',
    'Chat': '/dashboard/chat',
    'New Project': '/dashboard/new-project',
  };

  // Sync active section with URL path
  useEffect(() => {
    const section = pathToSection[location.pathname];
    if (section && section !== activeSection) {
      setActiveSection(section);
    }
  }, [location.pathname]);

  // Update URL when section changes (only if not caused by URL change)
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    const path = sectionToPath[section];
    if (path && location.pathname !== path) {
      navigate(path);
    }
  };

  // Handle GitHub App Installation Callback (works on any dashboard section)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const installationId = params.get('installation_id');

    if (installationId && currentUser) {
      const connectGitHub = async () => {
        try {
          const token = await currentUser.getIdToken();
          await fetch(`${API_BASE_URL}/api/github/install`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ installationId })
          });

          toast({
            title: "GitHub Connected",
            description: "App installation verified successfully."
          });

          // Remove query params and stay on current path
          navigate(location.pathname, { replace: true });
        } catch (error) {
          console.error("Failed to save installation ID", error);
          toast({
            title: "Connection Failed",
            description: "Failed to save GitHub installation.",
            variant: "destructive"
          });
        }
      };
      connectGitHub();
    }
  }, [location.search, currentUser, navigate, toast]);

  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<any[]>([]);
  // const [userStatuses, setUserStatuses] = useState<Record<string, any>>({});
  const userStatuses = usePresence(currentUser?.uid);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Session Timer State
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Start Session on Login
  useEffect(() => {
    if (currentUser && !isPreview) {
      const storedSession = localStorage.getItem('currentSession');
      let shouldStartNew = true;

      if (storedSession) {
        const { id, startTime } = JSON.parse(storedSession);
        const start = new Date(startTime);
        // If session is from today (less than 12 hours old for safety), resume it
        if (new Date().getTime() - start.getTime() < 12 * 60 * 60 * 1000) {
          setSessionId(id);
          setSessionStartTime(start);
          shouldStartNew = false;
        }
      }

      if (shouldStartNew && !sessionId) {
        const startSession = async () => {
          if (!currentUser?.uid) {
            console.error("Cannot start session: User ID is missing");
            return;
          }
          try {
            console.log("Starting session for user:", currentUser.uid);
            const response = await fetch(`${API_BASE_URL}/api/sessions/start`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUser.uid })
            });

            if (response.ok) {
              const data = await response.json();
              setSessionId(data._id);
              setSessionStartTime(new Date(data.startTime));
              localStorage.setItem('currentSession', JSON.stringify({
                id: data._id,
                startTime: data.startTime
              }));
            } else {
              const errorData = await response.json();
              console.error("Failed to start session:", response.status, errorData);
            }
          } catch (error) {
            console.error("Failed to start session (network error):", error);
          }
        };
        startSession();
      }
    }
  }, [currentUser, isPreview]);

  // Timer & Heartbeat
  useEffect(() => {
    if (!sessionStartTime) return;

    const timerInterval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);

      const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const seconds = (diff % 60).toString().padStart(2, '0');

      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    const heartbeatInterval = setInterval(async () => {
      if (sessionId) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, { method: 'PUT' });

          // Self-healing: If session is not found (404), it means server restarted or session invalid.
          if (response.status === 404) {
            console.warn("Session expired or server restarted, resetting session...");
            localStorage.removeItem("currentSession");
            setSessionId(null);
            // Reload to trigger fresh session creation
            window.location.reload();
          }
        } catch (error) {
          console.error("Heartbeat failed", error);
        }
      }
    }, 60000); // Every minute

    // Save on close
    const handleBeforeUnload = () => {
      if (sessionId) {
        const url = `${API_BASE_URL}/api/sessions/${sessionId}`;

        // Use sendBeacon for reliable execution during unload
        // sendBeacon sends a POST request by default
        const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
        const success = navigator.sendBeacon(url, blob);

        if (!success) {
          // Fallback if sendBeacon fails or data is too large (unlikely here)
          fetch(url, {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timerInterval);
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionStartTime, sessionId]);

  // Fetch Activity Logs
  useEffect(() => {
    if (activeSection === "Activity log" && currentUser && !isPreview) {
      const fetchLogs = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/sessions/${currentUser.uid}`);
          if (response.ok) {
            const data = await response.json();
            setActivityLogs(data);
          }
        } catch (error) {
          console.error("Failed to fetch activity logs", error);
        }
      };
      fetchLogs();
    }
  }, [activeSection, currentUser, isPreview]);

  const handleDeleteLog = async (logId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${logId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setActivityLogs(prev => prev.filter(log => log._id !== logId));
        toast({ title: "Success", description: "Log deleted successfully." });
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete log.", variant: "destructive" });
    }
  };

  const handleClearLogs = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/user/${currentUser.uid}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setActivityLogs([]);
        toast({ title: "Success", description: "All logs cleared successfully." });
      } else {
        throw new Error('Failed to clear');
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to clear logs.", variant: "destructive" });
    }
  };

  // Presence Logic (RTDB Removed)
  /*
  useEffect(() => {
    // RTDB Logic Removed
  }, []);
  */

  // Listen for all users' status (RTDB Removed)
  /*
  useEffect(() => {
    // RTDB Logic Removed
  }, []);
  */

  // Global Message Delivery Listener
  useEffect(() => {
    if (!currentUser || isPreview) return;

    // Listen for messages sent TO the current user that are NOT yet delivered
    // This marks them as delivered as long as the user is online (DesktopView is mounted)
    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", currentUser.uid),
      where("delivered", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach(async (doc) => {
        try {
          await updateDoc(doc.ref, {
            delivered: true,
            deliveredAt: serverTimestamp()
          });
        } catch (error) {
          console.error("Error marking message as delivered:", error);
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, isPreview]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user && !isPreview) {
        // Sync user to backend
        try {
          await fetch(`${API_BASE_URL}/api/users/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0],
              photoURL: user.photoURL,
            }),
          });
        } catch (error) {
          console.error("Error syncing user:", error);
        }
      }
    });

    return () => unsubscribe();
  }, [isPreview]);

  // ... existing state ...
  const [userData, setUserData] = useState<any>(null);
  const [githubProfile, setGithubProfile] = useState<any>(null);

  // Fetch Full User Data (including integrations)
  useEffect(() => {
    if (currentUser?.uid) {
      fetch(`${API_BASE_URL}/api/users/${currentUser.uid}`)
        .then(res => res.json())
        .then(data => {
          setUserData(data);
          // If connected to GitHub, fetch public profile
          if (data?.integrations?.github?.connected && data?.integrations?.github?.username) {
            const username = data.integrations.github.username;
            fetch(`https://api.github.com/users/${username}`)
              .then(ghRes => ghRes.json())
              .then(ghData => setGithubProfile(ghData))
              .catch(err => console.error("Failed to fetch GitHub profile:", err));
          }
        })
        .catch(err => console.error("Error fetching user details:", err));
    }
  }, [currentUser, activeSection]); // Re-fetch when section changes or user loads

  // ... existing effects ...

  useEffect(() => {
    if ((activeSection === "People" || activeSection === "Notes" || activeSection === "Chat" || activeSection === "Meet" || activeSection === "Tasks") && !isPreview) {
      const fetchUsers = async () => {
        try {
          if (!currentUser) return;
          const token = await currentUser.getIdToken();
          const response = await fetch(`${API_BASE_URL}/api/users`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setUsersList(data);
          }
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      };
      fetchUsers();
    }
  }, [activeSection, isPreview, currentUser]);



  const [isGenerating, setIsGenerating] = useState(false);

  const sidebarItems = [
    { icon: Home, label: "Dashboard", active: activeSection === "Dashboard" },
    {
      icon: FolderKanban, label: "My Workspace", active: activeSection === "My Workspace", children: [
        { label: "Roadmap" },
        // { label: "Schedule" }, // Moved to top level
      ]
    },
    { icon: Calendar, label: "Calendar", active: activeSection === "Calendar" },
    { icon: Star, label: "Design", active: activeSection === "Design" },
    { icon: Github, label: "My Projects", active: activeSection === "My Projects" },
    { icon: CheckSquare, label: "Tasks", active: activeSection === "Tasks" },
    { icon: FileText, label: "Notes", active: activeSection === "Notes" },

    { icon: Clock, label: "Activity log", active: activeSection === "Activity log" },
    { icon: Users, label: "People", active: activeSection === "People" },
    { icon: Video, label: "Meet", active: activeSection === "Meet" },
    { icon: Settings, label: "Settings", active: activeSection === "Settings" },
  ];

  const tasks: any[] = [];
  const waitingList: any[] = [];

  // Mock Users Data for Preview
  const mockUsers = [
    { _id: 1, displayName: "Oliver Campbell", email: "oliver@zync.io", status: "online", avatar: "OC" },
    { _id: 2, displayName: "Sarah Chen", email: "sarah@zync.io", status: "online", avatar: "SC" },
    { _id: 3, displayName: "Mike Wilson", email: "mike@zync.io", status: "offline", avatar: "MW" },
    { _id: 4, displayName: "Emily Davis", email: "emily@zync.io", status: "away", avatar: "ED" },
  ];

  const displayUsers = isPreview
    ? mockUsers
    : usersList.filter(user => user.uid !== currentUser?.uid);

  /* 
  const handleCreateMeeting = () => {
    // Legacy Google Meet link
    const meetLink = `https://meet.google.com/new`;
    window.open(meetLink, "_blank");
  };
  */

  // Meeting Invite Logic
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [manualMeetingUrl, setManualMeetingUrl] = useState("");

  const toggleInviteUser = (uid: string) => {
    setInvitedUserIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleCreateMeetingWithInvites = async () => {
    setIsGenerating(true);
    try {
      // Call Backend to Generate Link & Invite
      if (invitedUserIds.length > 0 && currentUser) {
        // Anti-Popup Blocker: Open a placeholder window immediately
        const newWindow = window.open("", "_blank");
        if (newWindow) {
          newWindow.document.write("Loading your Google Meet...");
        }

        const idToken = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/meet/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            senderId: currentUser.uid,
            receiverIds: invitedUserIds
            // meetingUrl is generated by backend
          })
        });

        const data = await res.json();
        if (data.meetingUrl) {
          // Update the placeholder window with the real URL
          if (newWindow) {
            newWindow.location.href = data.meetingUrl;
          } else {
            // Fallback if blocked entirely
            window.open(data.meetingUrl, "_blank");
          }
          toast({ title: "Meeting Started", description: "Google Meet link opened and invites sent." });
          setInvitedUserIds([]);
        } else {
          if (newWindow) newWindow.close();
          throw new Error(data.message || "Failed to generate meeting");
        }
      }



    } catch (error) {
      console.error("Meeting error:", error);
      toast({ title: "Error", description: "Failed to send invites, but meeting started.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };


  const handleChat = (user: any) => {
    setSelectedChatUser(user);
    handleSectionChange("Chat");
  };

  const renderContent = () => {
    switch (activeSection) {
      case "Dashboard":
        return <DashboardView currentUser={currentUser} />;

      case "My Workspace":
        return (
          <Workspace
            onNavigate={handleSectionChange}
            onSelectProject={(id) => navigate(`/projects/${id}`)}
            onOpenNote={(noteId) => {
              setActiveNoteId(noteId);
              handleSectionChange("Notes");
            }}
            currentUser={currentUser}
            usersList={usersList}
          />
        );

      case "My Projects":
        return <MyProjectsView currentUser={currentUser} />;

      case "Calendar":
        return <CalendarView />;

      case "Chat":
        if (userData && !userData.teamId) {
          return <TeamGateway title="Team Chat Locked" description="Join a team to start chatting with your colleagues." />;
        }
        return (
          <ChatLayout
            users={displayUsers}
            selectedUser={selectedChatUser}
            userStatuses={userStatuses}
            onSelectUser={setSelectedChatUser}
            isPreview={isPreview}
          />
        );

      case "People":
        return (
          <PeopleView

            userStatuses={userStatuses}
            onChat={handleChat}
            isPreview={isPreview}
          />
        );



      case "New Project":
        return (
          <CreateProject onProjectCreated={(data) => navigate(`/projects/${data._id}`)} />
        );

      case "Activity log":
        return (
          <ActivityLogView
            activityLogs={activityLogs}
            elapsedTime={elapsedTime}
            handleClearLogs={handleClearLogs}
            handleDeleteLog={handleDeleteLog}
          />
        );

      case "Meet":
        if (userData && !userData.teamId) {
          return <TeamGateway title="Video Meetings Restricted" description="You need to be part of a team to start video meetings." />;
        }
        return (
          <div className="flex-1 w-full flex flex-col items-center justify-center h-full p-6 text-center space-y-6">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Video className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold">Video Meetings</h2>
            <p className="text-muted-foreground max-w-md">
              Connect with your team instantly. Create a new meeting link and invite colleagues via email and chat.
            </p>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Meeting & Invite</DialogTitle>
                  <DialogDescription>
                    Generate a Google Meet link, paste it below, and select users to invite.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">

                  <div className="space-y-4 py-4">
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {usersList.filter(u => u.uid !== currentUser?.uid).map((user) => (
                        <div key={user.uid} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={getFullUrl(user.photoURL)} />
                              <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col text-left">
                              <span className="font-medium text-sm">{getUserName(user)}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                          <Switch
                            checked={invitedUserIds.includes(user.uid)}
                            onCheckedChange={() => toggleInviteUser(user.uid)}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                      ))}
                      {usersList.length <= 1 && <p className="text-sm text-center text-muted-foreground">No other users found to invite.</p>}
                    </div>
                  </div>

                </div>
                <DialogFooter>
                  <Button onClick={handleCreateMeetingWithInvites} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
                    Start Meeting
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        );

      case "Design":
        return <DesignView />;

      case "Tasks":
        return <TasksView currentUser={currentUser} users={usersList} />;

      case "Notes":
        return <NotesView
          user={currentUser ? {
            uid: currentUser.uid,
            displayName: currentUser.displayName || undefined,
            email: currentUser.email || undefined
          } : null}
          users={usersList}
          initialNoteId={activeNoteId}
        />;

      case "Settings":
        return <SettingsView />;

      case "Dashboard":
      default:
        // Dashboard View (GitHub Profile)
        return (
          <div className="flex-1 p-8 overflow-y-auto">
            <h2 className="text-3xl font-bold tracking-tight mb-6">Dashboard</h2>

            <div className="w-full max-w-full">
              {userData?.integrations?.github?.connected && githubProfile ? (
                <Card className="overflow-hidden border-border/50 shadow-lg min-h-[500px]">
                  <CardContent className="px-12 pb-12 pt-12">
                    <div className="flex flex-col md:flex-row gap-10 items-start">
                      {/* Avatar */}
                      <Avatar className="w-64 h-64 border-4 border-background shadow-xl">
                        <AvatarImage src={githubProfile.avatar_url} alt={githubProfile.login} />
                        <AvatarFallback className="text-6xl">{githubProfile.login?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-8">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-5xl font-bold tracking-tight mb-2">{githubProfile.name || githubProfile.login}</h3>
                            <p className="text-muted-foreground text-2xl">@{githubProfile.login}</p>
                          </div>
                          <Button onClick={() => window.open(githubProfile.html_url, '_blank')} variant="outline" className="gap-2">
                            <Github className="w-4 h-4" />
                            View on GitHub
                          </Button>
                        </div>

                        {githubProfile.bio && (
                          <p className="text-2xl text-foreground/80 max-w-6xl leading-relaxed">{githubProfile.bio}</p>
                        )}

                        <div className="flex items-center gap-12 pt-8">
                          <div className="flex items-center gap-3">
                            <Users className="w-6 h-6 text-muted-foreground" />
                            <span className="font-bold text-lg">{githubProfile.followers}</span> <span className="text-muted-foreground text-lg">Followers</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Users className="w-6 h-6 text-muted-foreground" />
                            <span className="font-bold text-lg">{githubProfile.following}</span> <span className="text-muted-foreground text-lg">Following</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <FolderKanban className="w-6 h-6 text-muted-foreground" />
                            <span className="font-bold text-lg">{githubProfile.public_repos}</span> <span className="text-muted-foreground text-lg">Public Repos</span>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="flex gap-8 text-lg text-muted-foreground pt-4">
                          {githubProfile.location && (
                            <div className="flex items-center gap-2">📍 {githubProfile.location}</div>
                          )}
                          {githubProfile.company && (
                            <div className="flex items-center gap-2">🏢 {githubProfile.company}</div>
                          )}
                          {githubProfile.blog && (
                            <div className="flex items-center gap-2">🔗 <a href={githubProfile.blog.startsWith('http') ? githubProfile.blog : `https://${githubProfile.blog}`} target="_blank" rel="noreferrer" className="hover:underline">{githubProfile.blog}</a></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>GitHub Integration</CardTitle>
                    <CardDescription>Connect your GitHub account to see your profile stats here.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => handleSectionChange("Settings")}>
                      <Github className="mr-2 h-4 w-4" />
                      Go to Settings to Connect
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

    }
  };

  return (
    <div className={`h-screen w-full bg-background text-foreground overflow-hidden`}>
      <PanelGroup direction="horizontal">
        <Panel
          ref={sidebarRef}
          defaultSize={16}
          minSize={4}
          maxSize={20}
          collapsible={true}
          collapsedSize={4}
          onCollapse={() => setIsCollapsed(true)}
          onExpand={() => setIsCollapsed(false)}
          className={cn(
            "bg-secondary/30 border-r border-border/50 flex flex-col transition-all duration-300 ease-in-out",
            isCollapsed && "min-w-[50px]"
          )}
        >
          <div className={cn("p-4 flex items-center gap-2 border-b border-border/50", isCollapsed ? "justify-center p-2" : "")}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold shrink-0">
              Z
            </div>
            {!isCollapsed && (
              <>
                <span className="font-bold text-lg truncate">Zync</span>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn("ml-auto h-8 w-8 text-muted-foreground", isCollapsed && "ml-0")}
              onClick={toggleSidebar}
            >
              {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <div className={cn("px-3 mb-2", isCollapsed ? "px-2" : "")}>
              <Button
                className={cn(
                  "w-full bg-primary text-primary-foreground hover:bg-primary/90",
                  isCollapsed ? "justify-center px-0" : "justify-start gap-2"
                )}
                onClick={() => handleSectionChange("New Project")}
                title="Create new project"
              >
                <Plus className="w-4 h-4" />
                {!isCollapsed && "Create new project"}
              </Button>
            </div>

            <nav className="space-y-1 px-2">
              {sidebarItems.map((item, index) => (
                <div key={index}>
                  <Button
                    variant={item.active ? "secondary" : "ghost"}
                    className={cn(
                      "w-full",
                      item.active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                      isCollapsed ? "justify-center px-0" : "justify-start gap-3"
                    )}
                    onClick={() => handleSectionChange(item.label)}
                    title={item.label}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && item.label}
                  </Button>
                  {!isCollapsed && item.children && item.active && (
                    <div className="ml-9 mt-1 space-y-1">
                      {item.children.map((child, childIndex) => (
                        <div
                          key={childIndex}
                          className="text-sm text-muted-foreground hover:text-foreground py-1 cursor-pointer"
                        >
                          {child.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>

          <div className={cn("p-4 border-t border-border/50", isCollapsed ? "p-2 items-center flex justify-center" : "")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className={cn("flex items-center gap-3 cursor-pointer hover:bg-secondary/50 p-2 rounded-md", isCollapsed ? "justify-center" : "")}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={currentUser?.photoURL || undefined} referrerPolicy="no-referrer" />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                      {isPreview ? "JD" : getUserInitials(userData || currentUser)}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-medium truncate">
                          {isPreview ? "John Doe" : getUserName(userData || currentUser)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{isPreview ? "john@example.com" : (currentUser?.email || "No email")}</div>
                      </div>
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSectionChange("Settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  if (isPreview) return;
                  localStorage.removeItem("zync-active-section");
                  await signOut(auth);
                  navigate("/login");
                }} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Panel>

        <PanelResizeHandle />

        <Panel defaultSize={84}>
          <div className={`flex flex-col h-full ${activeSection === "Chat" ? "overflow-hidden" : ""}`}>
            {/* Global Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background shrink-0">
              <div className="flex items-center gap-4">
                {(activeSection === "My Workspace" || activeSection === "Dashboard") ? (
                  <>
                    <span className="font-semibold text-foreground">Tools</span>
                    <Button size="sm" variant="hero" onClick={() => handleSectionChange("New Project")}>+ Add new</Button>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-secondary text-muted-foreground text-xs font-medium rounded-full cursor-pointer">Week view</span>
                      <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full cursor-pointer">Today</span>
                      <span className="px-3 py-1 text-muted-foreground text-xs font-medium rounded-full hover:bg-secondary cursor-pointer">Filters</span>
                    </div>
                  </>
                ) : (
                  <h2 className="text-lg font-semibold text-foreground">{activeSection}</h2>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{elapsedTime}</span>
                </div>
                <Search className="w-5 h-5 text-muted-foreground cursor-pointer" />
                <Bell className="w-5 h-5 text-muted-foreground cursor-pointer" />
                {!isPreview && <ThemeToggle />}
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  {isPreview ? "JD" : getUserInitials(userData || currentUser)}
                </div>
              </div >
            </div >

            {renderContent()}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default DesktopView;


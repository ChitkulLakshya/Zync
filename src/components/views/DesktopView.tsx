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
import { useTheme } from "next-themes";
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
import DashboardHome from "./DashboardHome";
import PeopleView from "./PeopleView";
import ChatLayout from "./ChatLayout";
import MessagesPage from "./MessagesPage";
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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeSection, setActiveSection] = useState(() => {
    if (isPreview) return "My Workspace";
    return localStorage.getItem("ZYNC-active-section") || "Dashboard";
  });



  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLocked, setIsLocked] = useState(true);

  const toggleSidebar = () => {
    const panel = sidebarRef.current;
    if (panel) {
      if (isLocked) {
        setIsLocked(false);
        panel.collapse();
      } else {
        setIsLocked(true);
        panel.expand();
      }
    }
  };

  const handleMouseEnter = () => {
    if (!isLocked) {
      sidebarRef.current?.expand();
    }
  };

  const handleMouseLeave = () => {
    if (!isLocked) {
      sidebarRef.current?.collapse();
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

    window.addEventListener("ZYNC-open-chat", handleOpenChat);
    return () => window.removeEventListener("ZYNC-open-chat", handleOpenChat);
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

  // Determine if we should show the landing page (DashboardHome)
  // Only show if we are effectively on the "Dashboard" root path and haven't navigated yet
  const [isLanding, setIsLanding] = useState(false);

  // Update URL when section changes (only if not caused by URL change)
  const handleSectionChange = (section: string) => {
    setIsLanding(false); // Dismiss landing page on any navigation
    localStorage.setItem("ZYNC_HAS_SEEN_LANDING", "true"); // Persist dismissal
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
  const [leaderTasks, setLeaderTasks] = useState<any[]>([]); // Tasks for Activity Graph
  const [teamSessions, setTeamSessions] = useState<any[]>([]); // Sessions for Time Graph
  const [ownedTeams, setOwnedTeams] = useState<any[]>([]);

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
            // console.log("Starting session for user:", currentUser.uid);
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
      fetchLogs();
    }
  }, [activeSection, currentUser, isPreview]);

  // Fetch Tasks for Activity Graph (Only for owned projects - Team Leader View)
  useEffect(() => {
    if (activeSection === "Activity log" && currentUser && !isPreview) {
      const fetchLeaderTasks = async () => {
        try {
          const token = await currentUser.getIdToken();
          const response = await fetch(`${API_BASE_URL}/api/projects?ownerId=${currentUser.uid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const projects = await response.json();
            // Filter only owned projects to ensure "Team Leader" context
            const ownedProjects = projects.filter((p: any) => p.ownerId === currentUser.uid);

            // Extract all tasks
            const allTasks = ownedProjects.flatMap((p: any) =>
              p.steps.flatMap((s: any) => s.tasks || [])
            );
            setLeaderTasks(allTasks);
          }
        } catch (error) {
          console.error("Failed to fetch tasks for activity graph", error);
        }
      };
      fetchLeaderTasks();
    }
  }, [activeSection, currentUser, isPreview]);

  // Fetch Team Sessions for Activity Graph
  useEffect(() => {
    if (activeSection === "Activity log" && currentUser && !isPreview && usersList.length > 0) {
      const fetchTeamSessions = async () => {
        try {
          const userIds = usersList.map(u => u.uid);
          const response = await fetch(`${API_BASE_URL}/api/sessions/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds })
          });
          if (response.ok) {
            const sessions = await response.json();
            setTeamSessions(sessions);
          }

          // Fetch Owned Teams
          const token = await currentUser.getIdToken();
          const teamsRes = await fetch(`${API_BASE_URL}/api/teams/owned`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (teamsRes.ok) {
            const teamsData = await teamsRes.json();
            setOwnedTeams(teamsData);
          }

        } catch (error) {
          console.error("Failed to fetch team sessions or teams", error);
        }
      };
      fetchTeamSessions();
    }
  }, [activeSection, currentUser, isPreview, usersList]);

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

      // Show landing page ONLY for new users (first login)
      if (user && user.metadata.creationTime === user.metadata.lastSignInTime && !localStorage.getItem("ZYNC_HAS_SEEN_LANDING")) {
        if (location.pathname === '/dashboard') {
          setIsLanding(true);
        }
      }

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
          } else {
            const errData = await response.json().catch(() => ({}));
            console.error(`Error fetching users: ${response.status} ${response.statusText}`, errData);
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
    { _id: 1, displayName: "Oliver Campbell", email: "oliver@ZYNC.io", status: "online", avatar: "OC" },
    { _id: 2, displayName: "Sarah Chen", email: "sarah@ZYNC.io", status: "online", avatar: "SC" },
    { _id: 3, displayName: "Mike Wilson", email: "mike@ZYNC.io", status: "offline", avatar: "MW" },
    { _id: 4, displayName: "Emily Davis", email: "emily@ZYNC.io", status: "away", avatar: "ED" },
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
    // If on Landing state, show DashboardHome
    // Note: DashboardHome should handle navigation via onNavigate which calls handleSectionChange
    if (isLanding) {
      return <DashboardHome onNavigate={handleSectionChange} />;
    }

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
            onMessages={() => handleSectionChange("Messages")}
            isPreview={isPreview}
          />
        );



      case "New Project":
        return (
          <CreateProject onProjectCreated={(data) => navigate(`/projects/${data._id}`)} />
        );

      case "Messages":
        return (
          <MessagesPage
            users={displayUsers}
            currentUser={currentUser}
            userStatuses={userStatuses}
            onNavigateBack={() => handleSectionChange("People")}
          />
        );

      case "Activity log":
        return (
          <ActivityLogView
            activityLogs={activityLogs}
            elapsedTime={elapsedTime}
            handleClearLogs={handleClearLogs}
            handleDeleteLog={handleDeleteLog}
            tasks={leaderTasks}
            users={usersList}
            teamSessions={teamSessions}
            currentTeamId={userData?.teamId}
            ownedTeams={ownedTeams}
            currentUserId={currentUser?.uid}
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

      default:
        return null;
    }
  };

  // Renamed to renderActiveView to avoid potential conflicts and clarify purpose
  const renderActiveView = () => {
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
            onMessages={() => handleSectionChange("Messages")}
            isPreview={isPreview}
          />
        );



      case "New Project":
        return (
          <CreateProject onProjectCreated={(data) => navigate(`/projects/${data._id}`)} />
        );

      case "Messages":
        return (
          <MessagesPage
            users={displayUsers}
            currentUser={currentUser}
            userStatuses={userStatuses}
            onNavigateBack={() => handleSectionChange("People")}
          />
        );

      case "Activity log":
        return (
          <ActivityLogView
            activityLogs={activityLogs}
            elapsedTime={elapsedTime}
            handleClearLogs={handleClearLogs}
            handleDeleteLog={handleDeleteLog}
            tasks={leaderTasks}
            users={usersList}
            teamSessions={teamSessions}
            currentTeamId={userData?.teamId}
            ownedTeams={ownedTeams}
            currentUserId={currentUser?.uid}
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

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (

    <div className="h-screen w-full bg-black text-foreground overflow-hidden relative font-sans">
      {/* Full Screen Landing Page Overlay */}
      {isLanding && (
        <div className={cn(
          "fixed inset-0 top-0 left-0 z-[100] w-screen h-screen bg-black flex flex-col items-center justify-center transition-all duration-1000 ease-in-out",
          isExiting ? "opacity-0 -translate-y-full blur-3xl scale-110" : "opacity-100 translate-y-0"
        )}>
          {/* Background Gradients for Landing Page */}
          <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-rose-600/30 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
          <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

          <DashboardHome onNavigate={(section) => {
            setIsExiting(true);
            setTimeout(() => handleSectionChange(section), 800);
          }} />
        </div>
      )}

      <PanelGroup direction="horizontal" autoSaveId="persistence" className="w-full h-full">
        {/* Sidebar Panel - Dark & Solid */}
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
            "bg-[#0F0F10] flex flex-col transition-all duration-300 ease-in-out h-full border-none",
            isCollapsed && "min-w-[70px]",
            // Animation logic: Hidden during landing, slides in when landing finishes
            isLanding ? "opacity-0 invisible" : "animate-in slide-in-from-left-10 duration-1000 fade-in fill-mode-forwards"
          )}
        >
          {/* Sidebar Content */}
          <div
            className="flex flex-col h-full w-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className={cn("p-4 flex items-center gap-2", isCollapsed ? "justify-center p-2 mb-4" : "mb-2")}>
              {mounted ? (
                <img src="/zync-white.webp" alt="Logo" className="h-8 w-8 object-contain rounded-lg" />
              ) : <div className="w-8 h-8 bg-primary rounded-lg" />}
              {!isCollapsed && <span className="font-bold text-lg text-white tracking-wide">ZYNC</span>}
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {/* Create New Project Button */}
              <div className="mb-6 px-1">
                <Button
                  className={cn("w-full bg-white text-black hover:bg-gray-200 transition-colors font-medium rounded-xl", isCollapsed ? "px-0 justify-center" : "justify-start gap-2")}
                  onClick={() => handleSectionChange("New Project")}
                >
                  <Plus className="w-5 h-5" />
                  {!isCollapsed && "New Project"}
                </Button>
              </div>

              {sidebarItems.map((item, index) => (
                <div key={index}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full rounded-lg transition-all duration-200",
                      item.active ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5",
                      isCollapsed ? "justify-center px-0 py-3" : "justify-start gap-3 py-2 px-3"
                    )}
                    onClick={() => handleSectionChange(item.label)}
                  >
                    <item.icon className={cn("w-5 h-5", item.active ? "text-white" : "text-zinc-400")} />
                    {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </Button>
                </div>
              ))}
            </div>

            {/* User Profile / Bottom */}
            <div className="p-4 mt-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className={cn("flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors", isCollapsed ? "justify-center" : "")}>
                    <Avatar className="w-9 h-9 border border-white/10">
                      <AvatarImage src={currentUser?.photoURL || undefined} referrerPolicy="no-referrer" />
                      <AvatarFallback className="bg-zinc-800 text-zinc-400">{isPreview ? "JD" : getUserInitials(userData || currentUser)}</AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{isPreview ? "John Doe" : getUserName(userData || currentUser)}</p>

                      </div>
                    )}
                    {!isCollapsed && <MoreHorizontal className="w-4 h-4 text-zinc-500 ml-auto" />}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={10} className="w-56 bg-[#0F0F10] border border-white/10 text-white shadow-xl rounded-xl">
                  <DropdownMenuLabel className="text-zinc-400 font-normal text-xs uppercase tracking-wider">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => handleSectionChange("Settings")} className="focus:bg-white/10 focus:text-white cursor-pointer py-2">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={async () => {
                    if (isPreview) return;
                    localStorage.removeItem("ZYNC-active-section");
                    localStorage.removeItem("ZYNC_HAS_SEEN_LANDING"); // Reset landing page state
                    await signOut(auth);
                    navigate("/login");
                  }} className="text-rose-500 focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer py-2">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-0 bg-transparent" />

        {/* Main Content Panel - The "Card" Look */}
        <Panel defaultSize={84}>
          <div className="h-full w-full p-2 pl-0 bg-[#0F0F10]">
            <div className="h-full w-full bg-black rounded-[32px] overflow-hidden relative border border-white/5 shadow-2xl flex flex-col">

              {/* Background Gradients - Inside the Rounded Container */}
              <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-rose-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
              <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

              {/* Header - Always show for main app content */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-white tracking-tight">{activeSection}</h2>
                </div>
                <div className="flex items-center gap-4">
                  {/* Header Actions */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-300 tracking-wide">{elapsedTime}</span>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div
                className="flex-1 overflow-y-auto relative z-10 w-full hover:overflow-y-overlay custom-scrollbar"
              >
                {(isExiting || !isLanding) && renderActiveView()}
              </div>
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default DesktopView;

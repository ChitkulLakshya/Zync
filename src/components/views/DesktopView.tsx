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
  LogOut,
  WifiOff,
  RefreshCw,
  Star,
  Github,
  Trash2,
  Send,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { getUserName, getUserInitials, pickUserForDisplay } from "@/lib/utils";
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
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { signOutAndClearState } from "@/lib/auth-signout";
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

import { Switch } from "@/components/ui/switch";
import { connectChat, disconnectChat } from "@/services/chatSocketService";
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
import ProjectDetails from "@/pages/ProjectDetails";
import TeamGateway from "./TeamGateway";
import MeetView from "./MeetView";
import { usePresence } from "@/hooks/usePresence";
import {
  PanelResizeHandle,
  Panel,
  PanelGroup,
  ImperativePanelHandle
} from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSectionTransitionLoader } from "@/loading/useSectionTransitionLoader";

import { useMe } from "@/hooks/useMe";
import { useTaskUpdates } from "@/hooks/use-task-updates";

const DesktopView = ({ isPreview = false }: { isPreview?: boolean }) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const { data: userData, isLoading: userLoading, isError: userMeError, refetch: refetchMe } = useMe();

  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeSection, setActiveSection] = useState(() => {
    if (isPreview) { return "My Workspace"; }
    return localStorage.getItem("ZYNC-active-section") || "Dashboard";
  });
  const {
    beginTransition,
    showCompactSpinner,
    showSectionSkeleton,
  } = useSectionTransitionLoader("desktop");

  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [usersList, setUsersList] = useState<any[]>([]);

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
      localStorage.setItem("ZYNC-active-section", activeSection);
    }
  }, [activeSection, isPreview]);

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      currentUser.getIdToken().then(t => tokenRef.current = t);
    }
  }, [currentUser]);

  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);


  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;

      if (activeSection !== "Chat") {
        beginTransition(`${activeSection}->Chat`);
      }

      setIsLanding(false);
      localStorage.setItem("ZYNC_HAS_SEEN_LANDING", "true");
      setActiveSection("Chat");

      if (location.pathname !== "/dashboard/chat") {
        navigate('/dashboard/chat');
      }

      if (customEvent.detail) {
        setSelectedChatUser(customEvent.detail);
      }
    };

    window.addEventListener("ZYNC-open-chat", handleOpenChat);
    return () => window.removeEventListener("ZYNC-open-chat", handleOpenChat);
  }, [activeSection, beginTransition, location.pathname, navigate]);


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


  useEffect(() => {
    const section = location.pathname.startsWith('/dashboard/workspace/project/')
      ? 'My Workspace'
      : pathToSection[location.pathname];
    if (section && section !== activeSection) {
      setActiveSection(section);
    }
  }, [location.pathname]);


  const [isLanding, setIsLanding] = useState(false);


  const handleSectionChange = (section: string) => {
    if (section !== activeSection) {
      beginTransition(`${activeSection}->${section}`);
    }

    setIsLanding(false);
    localStorage.setItem("ZYNC_HAS_SEEN_LANDING", "true");
    setActiveSection(section);
    const path = sectionToPath[section];
    if (path && location.pathname !== path) {
      navigate(path);
    }
  };


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const installationId = params.get('installation_id');

    if (installationId && currentUser) {
      const connectGitHub = async () => {
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch(`${API_BASE_URL}/api/github/install`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ installationId })
          });

          if (!res.ok) {
            throw new Error(`API returned ${res.status}`);
          }

          toast({
            title: "GitHub Connected",
            description: "App installation verified successfully."
          });
        } catch (error) {
          console.error("Failed to save installation ID", error);
          toast({
            title: "Connection Failed",
            description: "Failed to save GitHub installation.",
            variant: "destructive"
          });
        } finally {
          // Redirect the user perfectly back to the "Add Project" popup in the workspace
          navigate('/dashboard/workspace?action=create_project', { replace: true });
        }
      };
      connectGitHub();
    }
  }, [location.search, currentUser, navigate, toast]);

  const userStatuses = usePresence(currentUser?.uid);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);


  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [leaderTasks, setLeaderTasks] = useState<any[]>([]);
  const [teamSessions, setTeamSessions] = useState<any[]>([]);
  const [ownedTeams, setOwnedTeams] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const activityFetchLastRunRef = useRef(0);

  const buildActivityLogTasks = (projects: any[]) => {
    return projects.flatMap((project: any) =>
      (project.steps || []).flatMap((step: any) =>
        (step.tasks || []).map((task: any) => ({
          ...task,
          projectId: project._id || project.id,
          projectName: project.name,
          githubRepoName: project.githubRepoName,
          githubRepoOwner: project.githubRepoOwner,
          githubRepo: project.githubRepo,
          repoIds: project.githubRepoIds,
          projectOwnerId: project.ownerUid || project.ownerId,
        }))
      )
    );
  };

  const filterCommitCapableTasks = (tasks: any[], userId: string) => {
    return tasks.filter((task: any) => {
      const assignedTo = task?.assignedTo;
      const assignedUserIds = Array.isArray(task?.assignedUserIds) ? task.assignedUserIds : [];
      const hasRepoLink = Boolean(
        task?.githubRepoOwner ||
        task?.githubRepoName ||
        task?.githubRepo ||
        (Array.isArray(task?.repoIds) && task.repoIds.length > 0)
      );
      const hasCommitCode = Boolean(task?.commitCode);

      return hasRepoLink && hasCommitCode && (assignedTo === userId || assignedUserIds.includes(userId));
    });
  };


  useEffect(() => {
    if (currentUser && !isPreview) {
      const storedSession = localStorage.getItem('currentSession');
      let shouldStartNew = true;

      if (storedSession) {
        const { id, startTime } = JSON.parse(storedSession);
        const start = new Date(startTime);

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

            const token = await currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/sessions/start`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
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


  useEffect(() => {
    if (!sessionStartTime) { return; }

    const timerInterval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);

      const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const seconds = (diff % 60).toString().padStart(2, '0');

      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [sessionStartTime]);


  useEffect(() => {
    if (activeSection !== "Activity log" || !currentUser || isPreview) {
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      const now = Date.now();
      // Prevent burst re-fetches when dependent state updates rapidly.
      if (now - activityFetchLastRunRef.current < 20_000) {return;}
      activityFetchLastRunRef.current = now;

      try {
        const token = await currentUser.getIdToken();
        
        // Use batching/parallelism for initial load
        const [sessionsRes, projectsRes, ownedTeamsRes, myTeamsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/sessions/${currentUser.uid}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/projects`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/teams/owned`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/teams/mine`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (cancelled) {
          return;
        }

        if (sessionsRes.ok) {
          const logsData = await sessionsRes.json();
          setActivityLogs(logsData);
        }

        if (projectsRes.ok) {
          const projects = await projectsRes.json();
          if (Array.isArray(projects)) {
            const allTasks = buildActivityLogTasks(projects);
            const myTasks = filterCommitCapableTasks(allTasks, currentUser.uid);
            const receivedTasks = myTasks.filter((t: any) => t.assignedBy !== currentUser.uid && t.createdBy !== currentUser.uid);
            setLeaderTasks(receivedTasks);
          }
        }

        if (ownedTeamsRes.ok) {
          const teamsData = await ownedTeamsRes.json();
          setOwnedTeams(Array.isArray(teamsData) ? teamsData : []);
        }

        if (myTeamsRes.ok) {
          const myTeamsData = await myTeamsRes.json();
          const normalizedMyTeams = Array.isArray(myTeamsData) ? myTeamsData : [];
          setMyTeams(normalizedMyTeams);

          // Fallback for rate-limited /owned endpoint: derive owner teams from /mine.
          if (!ownedTeamsRes.ok) {
            const ownerTeamsFromMine = normalizedMyTeams.filter((team: any) => {
              const owner = team?.ownerId || team?.ownerUid || team?.leaderId || team?.createdBy || team?.createdByUid;
              return owner === currentUser.uid;
            });
            setOwnedTeams(ownerTeamsFromMine);
          }
        }

        // Fetch team-member specific sessions if needed
        if (usersList.length > 0) {
          const teamSessionsRes = await fetch(`${API_BASE_URL}/api/sessions/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userIds: usersList.map(u => u.uid) })
          });
          if (!cancelled && teamSessionsRes.ok) {
            const sessions = await teamSessionsRes.json();
            setTeamSessions(sessions);
          }
        }

      } catch (error) {
        if (!cancelled) {
          console.error("Initial analytics fetch failed:", error);
        }
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 30000); // Throttled to 30s instead of 10s

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeSection, currentUser, isPreview, usersList]);

  const handleDeleteLog = async (logId: string) => {
    if (!currentUser) { return; }
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/sessions/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
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
    if (!currentUser) { return; }
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/sessions/user/${currentUser.uid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
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


  // Connect to WebSocket chat when user is authenticated
  useEffect(() => {
    if (!currentUser || isPreview) { return; }

    connectChat(currentUser.uid);

    return () => {
      disconnectChat();
    };
  }, [currentUser, isPreview]);

  // Real-time task updates — refresh activity logs when tasks change
  useTaskUpdates({
    userId: currentUser?.uid,
    onTaskChange: (event) => {
      // Refresh activity logs when any task event occurs
      if (activeSection === "Activity log" && currentUser && !isPreview) {
        const refreshLogs = async () => {
          try {
            const token = await currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/sessions/${currentUser.uid}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              const data = await response.json();
              setActivityLogs(data);
            }
          } catch (error) {
            console.error("Failed to refresh activity logs", error);
          }
        };
        refreshLogs();
      }
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user && user.metadata.creationTime === user.metadata.lastSignInTime && !localStorage.getItem("ZYNC_HAS_SEEN_LANDING")) {
        if (location.pathname === '/dashboard') {
          setIsLanding(true);
        }
      }
    });

    return () => unsubscribe();
  }, [isPreview]);


  const [githubProfile, setGithubProfile] = useState<any>(null);


  useEffect(() => {
    if (userData?.githubIntegration?.connected && userData?.githubIntegration?.username) {
      const username = userData.githubIntegration.username;
      fetch(`https://api.github.com/users/${username}`)
        .then(ghRes => ghRes.json())
        .then(ghData => setGithubProfile(ghData))
        .catch(err => console.error("Failed to fetch GitHub profile:", err));
    }
  }, [userData]);


  useEffect(() => {
    if ((activeSection === "People" || activeSection === "Notes" || activeSection === "Chat" || activeSection === "Meet" || activeSection === "Tasks" || activeSection === "Activity log") && !isPreview) {
      const fetchUsers = async () => {
        try {
          if (!currentUser) { return; }
          const token = await currentUser.getIdToken();
          const response = await fetch(`${API_BASE_URL}/api/users`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setUsersList(Array.isArray(data) ? data : []);
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


  const mockUsers = [
    { _id: 1, displayName: "Oliver Campbell", email: "oliver@zync-meet.vercel.app", status: "online", avatar: "OC" },
    { _id: 2, displayName: "Sarah Chen", email: "sarah@zync-meet.vercel.app", status: "online", avatar: "SC" },
    { _id: 3, displayName: "Mike Wilson", email: "mike@zync-meet.vercel.app", status: "offline", avatar: "MW" },
    { _id: 4, displayName: "Emily Davis", email: "emily@zync-meet.vercel.app", status: "away", avatar: "ED" },
  ];

  const displayUsers = isPreview
    ? mockUsers
    : usersList.filter(user => user.uid !== currentUser?.uid);


  const handleChat = (user: any) => {
    setSelectedChatUser(user);
    handleSectionChange("Chat");
  };


  const renderActiveView = () => {
    switch (activeSection) {
      case "Dashboard":
        return <DashboardView currentUser={currentUser} />;

      case "My Workspace":
        if (location.pathname.startsWith('/dashboard/workspace/project/')) {
          return <ProjectDetails />;
        }
        return (
          <Workspace
            onNavigate={handleSectionChange}
            onSelectProject={(id) => navigate(`/dashboard/workspace/project/${id}`, { state: { from: '/dashboard/workspace' } })}
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
        /*
        if (userData && !userData.teamId) {
          return <TeamGateway title="Team Chat Locked" description="Join a team to start chatting with your colleagues." />;
        }
        */
        return (
          <ChatLayout
            users={displayUsers}
            selectedUser={selectedChatUser}
            userStatuses={userStatuses}
            onSelectUser={setSelectedChatUser}
            isPreview={isPreview}
            currentUserData={userData}
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
          <CreateProject onProjectCreated={(data) => navigate(`/projects/${data.id}`)} />
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
          <div className="h-[96%] flex overflow-hidden rounded-3xl m-2 sm:m-4 mt-1 bg-transparent border-none shadow-none relative">
            <div className="relative z-10 w-full h-full overflow-y-auto">
              <ActivityLogView
                activityLogs={activityLogs}
                elapsedTime={elapsedTime}
                handleClearLogs={handleClearLogs}
                handleDeleteLog={handleDeleteLog}
                tasks={leaderTasks}
                users={usersList}
                teamSessions={teamSessions}
                currentTeamId={typeof userData?.teamId === 'object' ? (userData?.teamId?.id || userData?.teamId?._id) : userData?.teamId}
                currentTeamName={typeof userData?.teamId === 'object' ? userData?.teamId?.name : undefined}
                currentTeamOwnerId={typeof userData?.teamId === 'object' ? (userData?.teamId?.ownerId || userData?.teamId?.ownerUid || userData?.teamId?.leaderId) : undefined}
                currentTeamLogoId={typeof userData?.teamId === 'object' ? userData?.teamId?.logoId : undefined}
                ownedTeams={ownedTeams}
                myTeams={myTeams}
                currentUserId={currentUser?.uid}
                currentUserDisplayName={getUserName(pickUserForDisplay(userData, currentUser))}
                currentUserPhotoURL={currentUser?.photoURL || userData?.photoURL || null}
                currentUserEmail={currentUser?.email || userData?.email || undefined}
              />
            </div>
          </div>
        );

      case "Meet":
        if (userData && !userData.teamId) {
          return <TeamGateway title="Video Meetings Restricted" description="You need to be part of a team to start video meetings." />;
        }
        return <MeetView currentUser={currentUser} usersList={usersList} userStatuses={userStatuses} />;

      case "Design":
        return <DesignView />;

      case "Tasks":
        return <TasksView currentUser={currentUser} users={usersList} />;

      case "Notes":
        return <NotesView
          user={currentUser ? {
            uid: currentUser.uid,
            displayName: currentUser.displayName || undefined,
            email: currentUser.email || undefined,
            photoURL: currentUser.photoURL || undefined
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

  if (userLoading && !isPreview) {
    return (
      <div className="h-screen w-full bg-black text-zinc-300 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading workspace…
        </div>
      </div>
    );
  }

  return (

    <div className="h-screen w-full relative text-foreground overflow-hidden font-sans">
      {/* Full-viewport canvas — main column is transparent so this is visible (not body bg-black). */}
      <div className="pointer-events-none fixed inset-0 z-0 dashboard-backdrop" aria-hidden />

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

      <PanelGroup direction="horizontal" autoSaveId="persistence" className="relative z-[1] h-full w-full bg-transparent">
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
            "relative bg-black flex flex-col transition-all duration-300 ease-in-out h-full border-none after:content-[''] after:absolute after:top-0 after:-right-1 after:h-full after:w-2 after:bg-black after:pointer-events-none after:z-[90]",
            isCollapsed && "min-w-[70px]",
            // Animation logic: Hidden during landing, slides in when landing finishes
            isLanding ? "opacity-0 invisible" : ""
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
                <img src="/zync-dark.webp" alt="Logo" className="h-8 w-8 object-contain rounded-lg" />
              ) : <div className="w-8 h-8 bg-primary rounded-lg" />}
              {!isCollapsed && <span className="font-bold text-lg text-white tracking-wide">Zync</span>}
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
                      <AvatarFallback className="bg-zinc-800 text-zinc-400">{isPreview ? "JD" : getUserInitials(pickUserForDisplay(userData, currentUser))}</AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{isPreview ? "John Doe" : getUserName(pickUserForDisplay(userData, currentUser))}</p>

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
                    if (isPreview) { return; }
                    localStorage.removeItem("ZYNC-active-section");
                    localStorage.removeItem("ZYNC_HAS_SEEN_LANDING"); // Reset landing page state
                    await signOutAndClearState(auth);
                    navigate("/login");
                  }} className="text-rose-500 focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer py-2">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Hard mask to remove sidebar/content seam */}
          <div className="absolute top-0 right-0 h-full w-[2px] bg-black pointer-events-none z-[80]" />
        </Panel>

      <PanelResizeHandle className="w-px bg-transparent opacity-0" />

        {/* Main Content Panel - The "Card" Look */}
        <Panel defaultSize={84} className="min-h-0 bg-transparent">
          <div className="h-full w-full p-0 bg-transparent -ml-2">
            <div className="h-full w-full bg-transparent rounded-[32px] overflow-hidden relative border-none shadow-none flex flex-col">
              {/* Header - Always show for main app content */}
              <div className="flex items-center justify-between px-8 py-5 bg-transparent backdrop-blur-none sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{activeSection}</span>
                    {showCompactSpinner && (
                      <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" aria-label="Switching section" />
                    )}
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  {/* Header Actions */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-300 tracking-wide">{elapsedTime}</span>
                  </div>
                </div>
              </div>

              {userMeError && !isPreview && (
                <div className="px-4 pt-3 shrink-0 z-30">
                  <Alert className="border-destructive/40 bg-destructive/10 text-foreground">
                    <WifiOff className="h-4 w-4 text-destructive" />
                    <AlertTitle className="text-destructive">Can&apos;t reach the server</AlertTitle>
                    <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-muted-foreground">
                      <span>
                        We couldn&apos;t load your account data. Try again in a moment or refresh the page.
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-2 border-destructive/30"
                        onClick={() => void refetchMe()}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Content Area */}
              <div
                className="flex-1 overflow-y-auto relative z-10 w-full bg-transparent hover:overflow-y-overlay custom-scrollbar"
              >
                {(isExiting || !isLanding) && renderActiveView()}
                {showSectionSkeleton && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] p-6 md:p-8 pointer-events-none">
                    <div className="space-y-4 animate-pulse">
                      <div className="h-8 w-64 rounded-md bg-zinc-800/90" />
                      <div className="h-24 w-full rounded-xl bg-zinc-800/80" />
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="h-36 rounded-xl bg-zinc-800/80" />
                        <div className="h-36 rounded-xl bg-zinc-800/80" />
                        <div className="h-36 rounded-xl bg-zinc-800/80" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default DesktopView;

/**
 * @fileoverview MobileView.tsx
 * @module MobileView
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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  LayoutDashboard,
  Folder,
  CheckSquare,
  Users,
  Calendar,
  FileText,
  Video,
  Settings,
  Bell
} from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import Workspace from "@/components/workspace/Workspace";
import TasksView from "./TasksView";
import CalendarView from "./CalendarView";
import { NotesView } from "@/components/notes/NotesView";
import MeetView from "./MeetView";
import SettingsView from "./SettingsView";
import { API_BASE_URL, getFullUrl } from "@/lib/utils";
import { useMe } from "@/hooks/useMe";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WifiOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import MobileActivityLogView from "@/components/views/mobile/MobileActivityLogView";
import MobileDashboardView from "@/components/views/mobile/MobileDashboardView";
import MobileTeamView from "@/components/views/mobile/MobileTeamView";
import MessagesPage from "./MessagesPage";

const MobileView = () => {
  const [activeTab, setActiveTab] = useState("Home");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { isError: userMeError, refetch: refetchMe } = useMe();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [leaderTasks, setLeaderTasks] = useState<any[]>([]);
  const [teamTasks, setTeamTasks] = useState<any[]>([]);
  const [teamSessions, setTeamSessions] = useState<any[]>([]);
  const [ownedTeams, setOwnedTeams] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (currentUser) {
      const fetchUsers = async () => {
        try {
          const token = await currentUser.getIdToken();
          const response = await fetch(`${API_BASE_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` }
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
  }, [currentUser]);

  const handleNavigate = (path: string) => {
    if (path === "New Project") {
      navigate("/new-project");
    } else if (path === "Projects") {
      setActiveTab("Projects");
    }
  };

  const handleSelectProject = (id: string) => {
    navigate(`/projects/${id}`, { state: { from: '/dashboard/workspace' } });
  };

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
    const storedSession = localStorage.getItem("currentSession");
    if (!storedSession) { return; }
    try {
      const parsed = JSON.parse(storedSession);
      if (parsed?.startTime) {
        setSessionStartTime(new Date(parsed.startTime));
      }
    } catch {

    }
  }, []);

  useEffect(() => {
    if (!sessionStartTime) { return; }
    const timer = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000));
      const hours = Math.floor(diff / 3600).toString().padStart(2, "0");
      const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, "0");
      const seconds = (diff % 60).toString().padStart(2, "0");
      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStartTime]);

  useEffect(() => {
    if (activeTab !== "Activity" || !currentUser) { return; }

    let cancelled = false;
    const fetchActivityData = async () => {
      try {
        const token = await currentUser.getIdToken();
        const [sessionsRes, projectsRes, ownedTeamsRes, myTeamsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/sessions/${currentUser.uid}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/projects`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/teams/owned`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/teams/mine`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (cancelled) { return; }

        if (sessionsRes.ok) {
          const logsData = await sessionsRes.json();
          setActivityLogs(Array.isArray(logsData) ? logsData : []);
        }

        if (projectsRes.ok) {
          const projects = await projectsRes.json();
          if (Array.isArray(projects)) {
            const allTasks = buildActivityLogTasks(projects);
            setTeamTasks(allTasks);
            const myTasks = filterCommitCapableTasks(allTasks, currentUser.uid);
            const receivedTasks = myTasks.filter(
              (task: any) => task.assignedBy !== currentUser.uid && task.createdBy !== currentUser.uid
            );
            setLeaderTasks(receivedTasks);
          }
        }

        if (ownedTeamsRes.ok) {
          const teams = await ownedTeamsRes.json();
          setOwnedTeams(Array.isArray(teams) ? teams : []);
        }

        if (myTeamsRes.ok) {
          const teams = await myTeamsRes.json();
          setMyTeams(Array.isArray(teams) ? teams : []);
        }

        if (usersList.length > 0) {
          const teamSessionsRes = await fetch(`${API_BASE_URL}/api/sessions/batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userIds: usersList.map((user) => user.uid) }),
          });
          if (!cancelled && teamSessionsRes.ok) {
            const sessions = await teamSessionsRes.json();
            setTeamSessions(Array.isArray(sessions) ? sessions : []);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load mobile activity data:", error);
        }
      }
    };

    fetchActivityData();
    const intervalId = setInterval(fetchActivityData, 30000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeTab, currentUser, usersList]);

  const handleDeleteLog = async (logId: string) => {
    if (!currentUser) { return; }
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/sessions/${logId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setActivityLogs((prev) => prev.filter((log) => log._id !== logId));
      } else {
        throw new Error("Failed to delete log");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete log.", variant: "destructive" });
    }
  };

  const handleClearLogs = async () => {
    if (!currentUser) { return; }
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/sessions/user/${currentUser.uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setActivityLogs([]);
      } else {
        throw new Error("Failed to clear logs");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear logs.", variant: "destructive" });
    }
  };


  const canViewActivityLog = myTeams.some(
    (t) => t.ownerId === currentUser?.uid || t.admins?.includes(currentUser?.uid)
  );

  const drawerItems = [
    { id: 'Home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Projects', label: 'Projects', icon: Folder },
    { id: 'Tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'People', label: 'Team', icon: Users },
    ...(canViewActivityLog ? [{ id: 'Activity', label: 'Activity', icon: Bell }] : []),
    { id: 'Calendar', label: 'Calendar', icon: Calendar },
    { id: 'Notes', label: 'Notes', icon: FileText },
    { id: 'Meet', label: 'Meet', icon: Video },
    { id: 'Settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "Home":
        return currentUser ? <MobileDashboardView currentUser={currentUser} /> : null;
      case "Projects":
        return currentUser ? (
          <div className="p-4">
            <Workspace
              onNavigate={handleNavigate}
              onSelectProject={handleSelectProject}
              currentUser={currentUser}
            />
          </div>
        ) : null;
      case "Tasks":
        return currentUser ? <TasksView currentUser={currentUser} users={usersList} /> : null;
      case "Activity":
        return (
          <MobileActivityLogView
            activityLogs={activityLogs}
            tasks={leaderTasks}
            users={usersList}
            teamSessions={teamSessions}
            ownedTeams={ownedTeams}
            myTeams={myTeams}
            currentUserId={currentUser?.uid}
            currentUserProfile={
              currentUser
                ? {
                    displayName: currentUser.displayName || undefined,
                    email: currentUser.email || undefined,
                    photoURL: currentUser.photoURL || undefined,
                  }
                : null
            }
            teamTasks={teamTasks}
            elapsedTime={elapsedTime}
            onClearLogs={handleClearLogs}
            onDeleteLog={handleDeleteLog}
          />
        );
      case "People":
        return (
          <MobileTeamView
            currentUser={currentUser}
            onChat={(user) => {
              setSelectedChatUser(user);
              setActiveTab("Messages");
            }}
          />
        );
      case "Messages":
        return (
          <MessagesPage
            users={usersList}
            currentUser={currentUser}
            userStatuses={{}}
            initialSelectedUser={selectedChatUser}
            onNavigateBack={() => setActiveTab("People")}
          />
        );
      case "Calendar":
        return <CalendarView />;
      case "Notes":
        return <NotesView user={currentUser ? { uid: currentUser.uid, displayName: currentUser.displayName || undefined, email: currentUser.email || undefined, photoURL: currentUser.photoURL || undefined } : null} users={usersList} />;
      case "Meet":
        return <MeetView currentUser={currentUser} usersList={usersList} userStatuses={{}} />;
      case "Settings":
        return <SettingsView />;
      default:
        return null;
    }
  };

  const DrawerContent = (
    <ScrollArea className="h-full py-2">
      <div className="space-y-1 px-2">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Menu
        </div>
        {drawerItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={`w-full justify-start gap-3 h-11 font-medium ${activeTab === item.id ? "bg-card/50 backdrop-blur-sm border border-border/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <MobileLayout
      hideActivityLog={!canViewActivityLog}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={currentUser ? {
        displayName: currentUser.displayName || undefined,
        email: currentUser.email || undefined,
        photoURL: currentUser.photoURL ? getFullUrl(currentUser.photoURL) : undefined
      } : null}
      drawerContent={DrawerContent}
      headerTitle={activeTab === 'Home' ? 'Dashboard' : activeTab}
    >
      {userMeError && currentUser && (
        <div className="p-3 border-b border-border/10 bg-transparent shrink-0">
          <Alert className="border border-destructive/20 bg-card/50 backdrop-blur-md text-foreground rounded-xl">
            <WifiOff className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive text-sm">Can&apos;t reach the server</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 text-xs text-muted-foreground">
              <span>We couldn&apos;t load your account data. Try again later or refresh the page.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit gap-2"
                onClick={() => void refetchMe()}
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      {renderContent()}
    </MobileLayout>
  );
};

export default MobileView;

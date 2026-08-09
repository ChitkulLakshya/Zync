/**
 * @fileoverview DesktopView.tsx
 * @module DesktopView
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
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, getFullUrl } from '@/lib/utils';
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
  Trash2,
  Send,
   ChevronsLeft,
  ChevronsRight,
  PanelLeft,
} from 'lucide-react';
import { Github } from '@/components/ui/GithubIcon';
import { getUserName, getUserInitials, pickUserForDisplay } from '@/lib/utils';
import { NotesView } from '@/components/notes/NotesView';
import TasksView from './TasksView';
import AssignedTasksView from './AssignedTasksView';
import TaskBoardView from './TaskBoardView';
import ActivityLogView from './ActivityLogView';
import Workspace from '@/components/workspace/Workspace';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { signOutAndClearState } from '@/lib/auth-signout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Switch } from '@/components/ui/switch';
import { connectChat, disconnectChat } from '@/services/chatSocketService';
import ChatView from './ChatView';
import SettingsView from './SettingsView';
import DesignView from './DesignView';
import MyProjectsView from './MyProjectsView';
import CalendarView from './CalendarView';
import DashboardView from './DashboardView';
import DashboardHome from './DashboardHome';
import PeopleView from './PeopleView';
import ChatLayout from './ChatLayout';
import MessagesPage from './MessagesPage';
import CreateProject from '@/components/dashboard/CreateProject';
import ProjectDetails from '@/pages/ProjectDetails';
import TeamGateway from './TeamGateway';
import MeetView from './MeetView';
import ArchitectureView from '@/components/zlam/ArchitectureView';
import { usePresence } from '@/hooks/usePresence';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSectionTransitionLoader } from '@/loading/useSectionTransitionLoader';

import { useMe } from '@/hooks/useMe';
import { useTaskUpdates } from '@/hooks/use-task-updates';

const DesktopView = ({ isPreview = false }: { isPreview?: boolean }) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const {
    data: userData,
    isLoading: userLoading,
    isError: userMeError,
    refetch: refetchMe,
  } = useMe();

  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeSection, setActiveSection] = useState(() => {
    if (isPreview) {
      return 'Dashboard';
    }
    return localStorage.getItem('ZYNC-active-section') || 'Dashboard';
  });
  const { beginTransition, showCompactSpinner } = useSectionTransitionLoader('desktop');

  const [tasksSubView, setTasksSubView] = useState<'My Tasks' | 'Task Board' | 'Assigned Tasks'>(() => {
    if (isPreview) {
      return 'My Tasks';
    }
    const stored = localStorage.getItem('ZYNC-tasks-sub-view');
    return stored === 'Task Board' ? 'Task Board' : stored === 'Assigned Tasks' ? 'Assigned Tasks' : 'My Tasks';
  });

  useEffect(() => {
    if (!isPreview) {
      localStorage.setItem('ZYNC-tasks-sub-view', tasksSubView);
    }
  }, [tasksSubView, isPreview]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [usersList, setUsersList] = useState<any[]>([]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  const handleMouseEnter = () => {
    if (!isLocked && isCollapsed) {
      setIsCollapsed(false);
    }
  };

  const handleMouseLeave = () => {
    if (!isLocked && !isCollapsed) {
      setIsCollapsed(true);
    }
  };

  useEffect(() => {
    if (!isPreview) {
      localStorage.setItem('ZYNC-active-section', activeSection);
    }
  }, [activeSection, isPreview]);

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      currentUser.getIdToken().then((t) => (tokenRef.current = t));
    }
  }, [currentUser]);

  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);

  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;

      if (activeSection !== 'Chat') {
        beginTransition(`${activeSection}->Chat`);
      }

      setIsLanding(false);
      localStorage.setItem('ZYNC_HAS_SEEN_LANDING', 'true');
      setActiveSection('Chat');

      if (location.pathname !== '/dashboard/chat') {
        navigate('/dashboard/chat');
      }

      if (customEvent.detail) {
        setSelectedChatUser(customEvent.detail);
      }
    };

    window.addEventListener('ZYNC-open-chat', handleOpenChat);
    return () => window.removeEventListener('ZYNC-open-chat', handleOpenChat);
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
    Dashboard: '/dashboard',
    'My Workspace': '/dashboard/workspace',
    'My Projects': '/dashboard/projects',
    Calendar: '/dashboard/calendar',
    Design: '/dashboard/design',
    Tasks: '/dashboard/tasks',
    Notes: '/dashboard/notes',
    'Activity log': '/dashboard/activity',
    People: '/dashboard/people',
    Meet: '/dashboard/meet',
    Settings: '/dashboard/settings',
    Chat: '/dashboard/chat',
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
    setIsExiting(false);
    localStorage.setItem('ZYNC_HAS_SEEN_LANDING', 'true');
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
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ installationId }),
          });

          if (!res.ok) {
            throw new Error(`API returned ${res.status}`);
          }

          toast({
            title: 'GitHub Connected',
            description: 'App installation verified successfully.',
          });
        } catch (error) {
          console.error('Failed to save installation ID', error);
          toast({
            title: 'Connection Failed',
            description: 'Failed to save GitHub installation.',
            variant: 'destructive',
          });
        } finally {

          navigate('/dashboard/workspace?action=create_project', { replace: true });
        }
      };
      connectGitHub();
    }
  }, [location.search, currentUser, navigate, toast]);

  const userStatuses = usePresence(currentUser?.uid);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
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

      return (
        hasRepoLink && hasCommitCode && (assignedTo === userId || assignedUserIds.includes(userId))
      );
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
            console.error('Cannot start session: User ID is missing');
            return;
          }
          try {
            const token = await currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/sessions/start`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ userId: currentUser.uid }),
            });

            if (response.ok) {
              const data = await response.json();
              setSessionId(data._id);
              setSessionStartTime(new Date(data.startTime));
              localStorage.setItem(
                'currentSession',
                JSON.stringify({
                  id: data._id,
                  startTime: data.startTime,
                })
              );
            } else {
              const errorData = await response.json();
              console.error('Failed to start session:', response.status, errorData);
            }
          } catch (error) {
            console.error('Failed to start session (network error):', error);
          }
        };
        startSession();
      }
    }
  }, [currentUser, isPreview]);

  useEffect(() => {
    if (!sessionStartTime) {
      return;
    }

    const timerInterval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);

      const hours = Math.floor(diff / 3600)
        .toString()
        .padStart(2, '0');
      const minutes = Math.floor((diff % 3600) / 60)
        .toString()
        .padStart(2, '0');
      const seconds = (diff % 60).toString().padStart(2, '0');

      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [sessionStartTime]);

  useEffect(() => {
    if (activeSection !== 'Activity log' || !currentUser || isPreview) {
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      const now = Date.now();

      if (now - activityFetchLastRunRef.current < 20_000) {
        return;
      }
      activityFetchLastRunRef.current = now;

      try {
        const token = await currentUser.getIdToken();


        const [sessionsRes, projectsRes, ownedTeamsRes, myTeamsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/sessions/${currentUser.uid}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/projects`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/teams/owned`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/teams/mine`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
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
            const receivedTasks = myTasks.filter(
              (t: any) => t.assignedBy !== currentUser.uid && t.createdBy !== currentUser.uid
            );
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


          if (!ownedTeamsRes.ok) {
            const ownerTeamsFromMine = normalizedMyTeams.filter((team: any) => {
              const owner =
                team?.ownerId ||
                team?.ownerUid ||
                team?.leaderId ||
                team?.createdBy ||
                team?.createdByUid;
              return owner === currentUser.uid;
            });
            setOwnedTeams(ownerTeamsFromMine);
          }
        }


        if (usersList.length > 0) {
          const teamSessionsRes = await fetch(`${API_BASE_URL}/api/sessions/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userIds: usersList.map((u) => u.uid) }),
          });
          if (!cancelled && teamSessionsRes.ok) {
            const sessions = await teamSessionsRes.json();
            setTeamSessions(sessions);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Initial analytics fetch failed:', error);
        }
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeSection, currentUser, isPreview, usersList]);

  const handleDeleteLog = async (logId: string) => {
    if (!currentUser) {
      return;
    }
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/sessions/${logId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setActivityLogs((prev) => prev.filter((log) => log._id !== logId));
        toast({ title: 'Success', description: 'Log deleted successfully.' });
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to delete log.', variant: 'destructive' });
    }
  };

  const handleClearLogs = async () => {
    if (!currentUser) {
      return;
    }
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/sessions/user/${currentUser.uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setActivityLogs([]);
        toast({ title: 'Success', description: 'All logs cleared successfully.' });
      } else {
        throw new Error('Failed to clear');
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to clear logs.', variant: 'destructive' });
    }
  };


  useEffect(() => {
    if (!currentUser || isPreview) {
      return;
    }

    connectChat(currentUser.uid);

    return () => {
      disconnectChat();
    };
  }, [currentUser, isPreview]);


  useTaskUpdates({
    userId: currentUser?.uid,
    onTaskChange: (event) => {

      if (activeSection === 'Activity log' && currentUser && !isPreview) {
        const refreshLogs = async () => {
          try {
            const token = await currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/sessions/${currentUser.uid}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
              const data = await response.json();
              setActivityLogs(data);
            }
          } catch (error) {
            console.error('Failed to refresh activity logs', error);
          }
        };
        refreshLogs();
      }
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (
        user &&
        user.metadata.creationTime === user.metadata.lastSignInTime &&
        !localStorage.getItem('ZYNC_HAS_SEEN_LANDING')
      ) {
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
        .then((ghRes) => ghRes.json())
        .then((ghData) => setGithubProfile(ghData))
        .catch((err) => console.error('Failed to fetch GitHub profile:', err));
    }
  }, [userData]);

  useEffect(() => {
    if (
      (activeSection === 'People' ||
        activeSection === 'Notes' ||
        activeSection === 'Chat' ||
        activeSection === 'Meet' ||
        activeSection === 'Tasks' ||
        activeSection === 'Activity log') &&
      !isPreview
    ) {
      const fetchUsers = async () => {
        try {
          if (!currentUser) {
            return;
          }
          const token = await currentUser.getIdToken();
          const response = await fetch(`${API_BASE_URL}/api/users`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUsersList(Array.isArray(data) ? data : []);
          } else {
            const errData = await response.json().catch(() => ({}));
            console.error(
              `Error fetching users: ${response.status} ${response.statusText}`,
              errData
            );
          }
        } catch (error) {
          console.error('Error fetching users:', error);
        }
      };
      fetchUsers();
    }
  }, [activeSection, isPreview, currentUser]);

  const [isGenerating, setIsGenerating] = useState(false);

  const canViewActivityLog = myTeams.some(
    (t) => t.ownerId === currentUser?.uid || t.admins?.includes(currentUser?.uid)
  );

  const sidebarItems = [
    { icon: Home, label: 'Dashboard', active: activeSection === 'Dashboard' },
    {
      icon: FolderKanban,
      label: 'My Workspace',
      active: activeSection === 'My Workspace',
      children: [{ label: 'Roadmap' }],
    },
    { icon: Calendar, label: 'Calendar', active: activeSection === 'Calendar' },
    { icon: Star, label: 'Design', active: activeSection === 'Design' },
    { icon: Github, label: 'My Projects', active: activeSection === 'My Projects' },
    { icon: CheckSquare, label: 'Tasks', active: activeSection === 'Tasks' },
    { icon: FileText, label: 'Notes', active: activeSection === 'Notes' },
    ...(canViewActivityLog
      ? [{ icon: Clock, label: 'Activity log', active: activeSection === 'Activity log' }]
      : []),
    { icon: Users, label: 'People', active: activeSection === 'People' },
    { icon: Video, label: 'Meet', active: activeSection === 'Meet' },
    { icon: Settings, label: 'Settings', active: activeSection === 'Settings' },
  ];

  const tasks: any[] = [];
  const waitingList: any[] = [];

  const mockUsers = [
    {
      _id: 1,
      displayName: 'Oliver Campbell',
      email: 'oliver@zync-meet.vercel.app',
      status: 'online',
      avatar: 'OC',
    },
    {
      _id: 2,
      displayName: 'Sarah Chen',
      email: 'sarah@zync-meet.vercel.app',
      status: 'online',
      avatar: 'SC',
    },
    {
      _id: 3,
      displayName: 'Mike Wilson',
      email: 'mike@zync-meet.vercel.app',
      status: 'offline',
      avatar: 'MW',
    },
    {
      _id: 4,
      displayName: 'Emily Davis',
      email: 'emily@zync-meet.vercel.app',
      status: 'away',
      avatar: 'ED',
    },
  ];

  const displayUsers = isPreview
    ? mockUsers
    : usersList.filter((user) => user.uid !== currentUser?.uid);

  const handleChat = (user: any) => {
    setSelectedChatUser(user);
    handleSectionChange('Chat');
  };

  const renderActiveView = () => {
    switch (activeSection) {
      case 'Dashboard':
        if (isLanding) {
          return (
            <DashboardHome
              onNavigate={(section) => {
                setIsExiting(true);
                setTimeout(() => handleSectionChange(section), 400);
              }}
            />
          );
        }
        return <DashboardView currentUser={currentUser} />;

      case 'My Workspace':
        if (location.pathname.startsWith('/dashboard/workspace/project/')) {
          if (location.pathname.endsWith('/architecture')) {
            return <ArchitectureView />;
          }
          return <ProjectDetails />;
        }
        return (
          <Workspace
            onNavigate={handleSectionChange}
            onSelectProject={(id) =>
              navigate(`/dashboard/workspace/project/${id}`, {
                state: { from: '/dashboard/workspace' },
              })
            }
            onOpenNote={(noteId) => {
              setActiveNoteId(noteId);
              handleSectionChange('Notes');
            }}
            currentUser={currentUser}
            usersList={usersList}
          />
        );

      case 'My Projects':
        return <MyProjectsView currentUser={currentUser} />;

      case 'Calendar':
        return <CalendarView />;

      case 'Chat':
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

      case 'People':
        return (
          <PeopleView
            userStatuses={userStatuses}
            onChat={handleChat}
            onMessages={() => handleSectionChange('Messages')}
            isPreview={isPreview}
          />
        );

      case 'New Project':
        return <CreateProject onProjectCreated={(data) => handleSectionChange('My Workspace')} />;

      case 'Messages':
        return (
          <MessagesPage
            users={displayUsers}
            currentUser={currentUser}
            userStatuses={userStatuses}
            onNavigateBack={() => handleSectionChange('People')}
          />
        );

      case 'Activity log':
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
                currentTeamId={
                  typeof userData?.teamId === 'object'
                    ? userData?.teamId?.id || userData?.teamId?._id
                    : userData?.teamId
                }
                currentTeamName={
                  typeof userData?.teamId === 'object' ? userData?.teamId?.name : undefined
                }
                currentTeamOwnerId={
                  typeof userData?.teamId === 'object'
                    ? userData?.teamId?.ownerId ||
                      userData?.teamId?.ownerUid ||
                      userData?.teamId?.leaderId
                    : undefined
                }
                currentTeamLogoId={
                  typeof userData?.teamId === 'object' ? userData?.teamId?.logoId : undefined
                }
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

      case 'Meet':
        if (userData && !userData.teamId) {
          return (
            <TeamGateway
              title="Video Meetings Restricted"
              description="You need to be part of a team to start video meetings."
            />
          );
        }
        return (
          <MeetView currentUser={currentUser} usersList={usersList} userStatuses={userStatuses} />
        );

      case 'Design':
        return <DesignView />;

      case 'Tasks':
        return tasksSubView === 'Task Board' ? (
          <TaskBoardView currentUser={currentUser} users={usersList} />
        ) : tasksSubView === 'Assigned Tasks' ? (
          <AssignedTasksView currentUser={currentUser} users={usersList} />
        ) : (
          <TasksView currentUser={currentUser} users={usersList} />
        );

      case 'Notes':
        return (
          <NotesView
            user={
              currentUser
                ? {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName || undefined,
                    email: currentUser.email || undefined,
                    photoURL: currentUser.photoURL || undefined,
                  }
                : null
            }
            users={usersList}
            initialNoteId={activeNoteId}
          />
        );

      case 'Settings':
        return <SettingsView />;

      default:
        return null;
    }
  };
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-sidebar">
      {/* Top Banner (if any) */}

      <div className="relative z-[1] flex h-full w-full bg-sidebar overflow-hidden">
        {/* Sidebar Panel - The Base Tray */}
        <div
          className={cn(
            'relative bg-transparent flex flex-col transition-all duration-300 ease-in-out h-full shrink-0 border-none select-none z-10 overflow-hidden',
            isCollapsed ? 'w-[76px]' : 'w-[260px]'
          )}
        >
          {/* Sidebar Content */}
          <div
            className="flex flex-col h-full w-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className={cn(
                'p-4 flex items-center gap-2',
                isCollapsed ? 'justify-center p-2 mb-4' : 'mb-2'
              )}
            >
              {mounted ? (
                <>
                  <img
                    src="/zync-white.webp"
                    alt="Logo"
                    className="h-9 w-auto object-contain block dark:hidden"
                  />
                  <img
                    src="/zync-dark.webp"
                    alt="Logo"
                    className="h-9 w-auto object-contain hidden dark:block"
                  />
                </>
              ) : (
                <div className="w-8 h-8 bg-foreground rounded-xl" />
              )}
              {!isCollapsed && (
                <span className="font-bold text-lg text-sidebar-foreground tracking-wide">
                  Zync
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {/* Create New Project Button */}
              <div className="mb-6 px-1">
                <Button
                  className={cn(
                    'w-full bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium rounded-xl',
                    isCollapsed ? 'px-0 justify-center' : 'justify-start gap-2'
                  )}
                  onClick={() => handleSectionChange('New Project')}
                >
                  <Plus className="w-5 h-5" />
                  {!isCollapsed && 'New Project'}
                </Button>
              </div>

              {sidebarItems.map((item, index) => (
                <div key={index}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full rounded-lg transition-all duration-200',
                      item.active
                        ? 'bg-sidebar-accent text-sidebar-foreground'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                      isCollapsed ? 'justify-center px-0 py-3' : 'justify-start gap-3 py-2 px-3'
                    )}
                    onClick={() => handleSectionChange(item.label)}
                  >
                    <item.icon
                      className={cn(
                        'w-5 h-5',
                        item.active ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    />
                    {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </Button>
                </div>
              ))}
            </div>

            {/* User Profile / Bottom */}
            <div className="p-4 mt-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-xl hover:bg-foreground/10 cursor-pointer transition-colors',
                      isCollapsed ? 'justify-center' : ''
                    )}
                  >
                    <Avatar className="w-9 h-9 border border-border">
                      <AvatarImage
                        src={currentUser?.photoURL || undefined}
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {isPreview
                          ? 'JD'
                          : getUserInitials(pickUserForDisplay(userData, currentUser))}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-sidebar-foreground truncate">
                          {isPreview
                            ? 'John Doe'
                            : getUserName(pickUserForDisplay(userData, currentUser))}
                        </p>
                      </div>
                    )}
                    {!isCollapsed && <MoreHorizontal className="w-4 h-4 text-zinc-500 ml-auto" />}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="w-56 bg-card/50 backdrop-blur-xl border border-border/10 text-foreground shadow-elevation4 rounded-2xl"
                >
                  <DropdownMenuLabel className="text-muted-foreground font-normal text-xs uppercase tracking-wider">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    onClick={() => handleSectionChange('Settings')}
                    className="focus:bg-foreground/10 focus:text-foreground cursor-pointer py-2"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    onClick={async () => {
                      if (isPreview) {
                        return;
                      }
                      localStorage.removeItem('ZYNC-active-section');
                      await signOutAndClearState(auth);
                      navigate('/');
                    }}
                    className="text-rose-500 focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer py-2"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main Content Panel - The Floating Canvas */}
        <div className="flex-1 min-w-0 h-full bg-transparent py-2 pr-2 relative z-20 overflow-hidden flex flex-col">
          <div className="h-full w-full p-0 bg-transparent flex flex-col min-h-0">
            <div className="h-full w-full bg-background border border-sidebar-border/40 shadow-elevation4 rounded-[32px] overflow-hidden relative flex flex-col">
              {/* Header - Always show for main app content */}
              <div className="flex items-center justify-between px-8 py-5 bg-transparent backdrop-blur-none sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="h-9 w-9 rounded-xl border border-border/10 bg-card/40 hover:bg-card text-muted-foreground hover:text-foreground transition-all shrink-0"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    <PanelLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                    {activeSection !== 'Tasks' && <span>{activeSection}</span>}
                    
                    {activeSection === 'Tasks' && (
                      <div className="inline-flex items-center gap-1 bg-card/50 border border-border/10 rounded-xl p-1 backdrop-blur-md">
                        {(['My Tasks', 'Task Board', 'Assigned Tasks'] as const).map((label) => (
                          <button
                            key={label}
                            onClick={() => setTasksSubView(label)}
                            className={cn(
                              'h-8 px-3 text-sm font-medium rounded-lg transition-colors',
                              tasksSubView === label
                                ? 'bg-secondary text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {showCompactSpinner && (
                      <RefreshCw
                        className="w-4 h-4 animate-spin text-zinc-400"
                        aria-label="Switching section"
                      />
                    )}
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  {/* Header Actions */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 rounded-full border border-border/10">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-300 tracking-wide">
                      {elapsedTime}
                    </span>
                  </div>
                </div>
              </div>



              {userMeError && !isPreview && (
                <div className="px-4 pt-3 shrink-0 z-30">
                  <Alert className="border-destructive/40 bg-destructive/10 text-foreground">
                    <WifiOff className="h-4 w-4 text-destructive" />
                    <AlertTitle className="text-destructive">
                      Can&apos;t reach the server
                    </AlertTitle>
                    <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-muted-foreground">
                      <span>
                        We couldn&apos;t load your account data. Try again in a moment or refresh
                        the page.
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
              <div className="flex-1 overflow-y-auto relative z-10 w-full bg-transparent hover:overflow-y-overlay custom-scrollbar">
                <AnimatePresence mode="wait">
                  {userLoading && !isPreview ? (
                    <motion.div
                      key="skeleton"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      className="p-8 h-full flex flex-col gap-6"
                    >
                      {/* Bento grid style liquid glass skeleton */}
                      <div className="flex gap-6 h-[30%]">
                        <motion.div
                          className="w-2/3 h-full rounded-3xl bg-surface-glass-thin backdrop-blur-md border border-border/5"
                          animate={{ opacity: [0.4, 0.8, 0.4] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.div
                          className="w-1/3 h-full rounded-3xl bg-surface-glass-thin backdrop-blur-md border border-border/5"
                          animate={{ opacity: [0.4, 0.8, 0.4] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: 0.2,
                          }}
                        />
                      </div>
                      <div className="flex gap-6 h-[70%]">
                        <motion.div
                          className="w-1/4 h-full rounded-3xl bg-surface-glass-thin backdrop-blur-md border border-border/5"
                          animate={{ opacity: [0.4, 0.8, 0.4] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: 0.1,
                          }}
                        />
                        <motion.div
                          className="w-3/4 h-full rounded-3xl bg-surface-glass-thin backdrop-blur-md border border-border/5"
                          animate={{ opacity: [0.4, 0.8, 0.4] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: 0.3,
                          }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isExiting ? 0 : 1 }}
                      transition={{ duration: 0.16 }}
                      className="h-full w-full"
                    >
                      {renderActiveView()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopView;

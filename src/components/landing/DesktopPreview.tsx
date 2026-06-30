/**
 * @fileoverview DesktopPreview.tsx
 * @module DesktopPreview
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
 * @author Chitkul Lakshya <chitkullakshya@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimulatedCursor } from '@/components/landing/SimulatedCursor';
import { Home, FolderKanban, Calendar as CalendarIcon, CheckSquare, FileText, Clock, Users, Video, Settings, Star, Search, Bell, Plus, ChevronDown, ArrowRight, User, Terminal, Layout, ExternalLink, GitCommit, Kanban, BookMarked, MessageSquare, CalendarDays, StickyNote, GitPullRequest, GitFork, AlertCircle, Pin, FolderGit2, Trash2, ArrowUpRight,  } from 'lucide-react';
import { Github } from '@/components/ui/GithubIcon';;
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from '@/components/kibo-ui/contribution-graph';
import { eachDayOfInterval, formatISO, format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/components/views/CalendarView.css';
import { cn } from '@/lib/utils';

import ActivityLogView from '@/components/views/ActivityLogView';
import PeopleView from '@/components/views/PeopleView';
import MeetView from '@/components/views/MeetView';
import SettingsView from '@/components/views/SettingsView';
import DashboardView from '@/components/views/DashboardView';
import { NotesView } from '@/components/notes/NotesView';
import mockDesigns from './previewDesigns.json';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});

const DesignCard = ({ item }: { item: any }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
    }
  }, []);

  return (
    <a
      href="#demo"
      onClick={(e) => e.preventDefault()}
      className="group relative block break-inside-avoid mb-6 cursor-default"
    >
      <div className="relative overflow-hidden bg-card/50 backdrop-blur-md border border-border/10 rounded-2xl">
        <div
          className={cn(
            'absolute inset-0 bg-secondary/10 flex items-center justify-center z-10 transition-opacity duration-500',
            loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        >
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce" />
          </div>
        </div>
        {!loaded && <div className="w-full pb-[75%]" />}
        <img
          ref={imgRef}
          src={item.image}
          alt={item.title}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'w-full h-auto object-cover transition-all duration-700 will-change-transform group-hover:scale-[1.02]',
            loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
          )}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] z-20">
          <div className="bg-card/50 backdrop-blur-md border border-border/10 text-foreground px-4 py-2 rounded-full flex items-center gap-2 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75">
            <span className="text-xs font-bold uppercase tracking-wider">{item.source}</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-between items-start gap-4 px-1">
        <h3 className="text-sm font-medium leading-tight text-foreground/90 line-clamp-1 group-hover:text-foreground transition-colors">
          {item.title}
        </h3>
      </div>
    </a>
  );
};

const DesktopPreview = () => {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const hasInteractedRef = useRef(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [ghostState, setGhostState] = useState<
    'idle' | 'entering' | 'clicking' | 'leaving' | 'done'
  >('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const sequence = async () => {

      await new Promise((r) => setTimeout(r, 2000));
      if (hasInteractedRef.current) {
        return;
      }
      setGhostState('entering');


      await new Promise((r) => setTimeout(r, 1000));
      if (hasInteractedRef.current) {
        return;
      }
      setGhostState('clicking');


      await new Promise((r) => setTimeout(r, 200));
      if (hasInteractedRef.current) {
        return;
      }
      setActiveSection('My Workspace');


      await new Promise((r) => setTimeout(r, 400));
      if (hasInteractedRef.current) {
        return;
      }
      setGhostState('leaving');


      await new Promise((r) => setTimeout(r, 800));
      if (!hasInteractedRef.current) {
        setGhostState('done');
      }
    };

    sequence();
  }, []);

  const handleInteraction = (e?: React.MouseEvent) => {
    if (!hasInteractedRef.current) {
      hasInteractedRef.current = true;
      setHasInteracted(true);
      setGhostState('done');
    }

    if (e && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();


      const scaleX = rect.width / containerRef.current.offsetWidth;
      const scaleY = rect.height / containerRef.current.offsetHeight;
      const x = (e.clientX - rect.left) / scaleX;
      const y = (e.clientY - rect.top) / scaleY;
      setMousePos({ x, y });
    }
  };


  const mockName = 'Alex Designer';
  const mockEmail = 'alex@demo.zync.app';
  const mockLogin = 'alexdesigner';
  const mockAvatar = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Alex';

  const sidebarItems = [
    { icon: Home, label: 'Dashboard' },
    { icon: FolderKanban, label: 'My Workspace' },
    { icon: CalendarIcon, label: 'Calendar' },
    { icon: Star, label: 'Design' },
    { icon: CheckSquare, label: 'Tasks' },
    { icon: FileText, label: 'Notes' },
    { icon: Clock, label: 'Activity log' },
    { icon: Users, label: 'People' },
    { icon: Video, label: 'Meet' },
    { icon: Settings, label: 'Settings' },
  ];

  const yearStart = new Date(2026, 0, 1);
  const yearEnd = new Date(2026, 11, 31);
  const days = eachDayOfInterval({ start: yearStart, end: yearEnd });


  const dummyUsers = [
    {
      uid: '1',
      displayName: mockName,
      email: mockEmail,
      photoURL: mockAvatar,
      closeFriends: ['2', '4', '5', '6'],
    },
    {
      uid: '2',
      displayName: 'Sarah Connor',
      email: 'sarah@demo.zync.app',
      photoURL: 'https://i.pravatar.cc/150?u=Sarah',
    },
    {
      uid: '3',
      displayName: 'John Doe',
      email: 'john@demo.zync.app',
      photoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=John',
    },
    {
      uid: '4',
      displayName: 'Ada Lovelace',
      email: 'ada@demo.zync.app',
      photoURL: 'https://i.pravatar.cc/150?u=Ada',
    },
    {
      uid: '5',
      displayName: 'Grace Hopper',
      email: 'grace@demo.zync.app',
      photoURL: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Grace',
    },
    {
      uid: '6',
      displayName: 'Alan Turing',
      email: 'alan@demo.zync.app',
      photoURL: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Alan',
    },
    {
      uid: '7',
      displayName: 'Linus Torvalds',
      email: 'linus@demo.zync.app',
      photoURL: 'https://i.pravatar.cc/150?u=Linus',
    },
  ];

  const graphData = days.map((date) => {
    const dayNum = date.getDate() + date.getMonth() * 30;
    const seed = (dayNum * 17) % 100;
    const count = seed < 40 ? 0 : seed < 70 ? 2 : seed < 90 ? 5 : 12;
    const level = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;
    return { date: formatISO(date, { representation: 'date' }), count, level };
  });

  const renderMyWorkspace = () => (
    <div className="flex-1 p-6 md:p-8 h-full bg-transparent overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">My Workspace</h2>
            <p className="text-muted-foreground mt-1 text-lg">
              Manage your AI-generated projects and assignments.
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Plus className="w-5 h-5" /> Add Project
          </Button>
        </div>
        <div>
          <div className="flex items-center mb-4">
            <h3 className="text-xl font-semibold">Pinned Notes</h3>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <FileText className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <Pin className="w-4 h-4 text-orange-500 fill-orange-500" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <h4 className="font-semibold truncate">Architecture Plan</h4>
                <p className="text-xs text-muted-foreground overflow-hidden h-4 mt-1">
                  Jan 16, 2026
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="grid gap-6 grid-cols-3">
          {[1, 2].map((i) => (
            <Card
              key={i}
              className="group hover:shadow-lg transition-all duration-200 border border-border/10 shadow-sm hover:border-border/30 bg-card/50"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="mb-2">
                    Project
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Owner
                  </Badge>
                </div>
                <CardTitle className="text-xl line-clamp-1 group-hover:text-foreground transition-colors">
                  {i === 1 ? 'Zync Dashboard' : 'API Gateway'}
                </CardTitle>
                <CardDescription className="line-clamp-2 min-h-[40px]">
                  {i === 1
                    ? 'Main dashboard application with GitHub integration.'
                    : 'Central API gateway for microservices.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Created Jan 15, 2026</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <div className="flex items-center gap-2">
                      <span>Owner</span>
                      <div className="flex items-center gap-1 bg-secondary/50 pr-2 pl-1 py-0.5 rounded-full">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={mockAvatar} />
                          <AvatarFallback>AD</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-xs max-w-[90px] truncate">You</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 p-2 bg-secondary/30 rounded-md text-xs">
                  <Github className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate flex-1">
                    {mockLogin}/zync-project-{i}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t bg-secondary/10 flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 justify-between hover:bg-transparent px-0 text-foreground"
                >
                  View Architecture{' '}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  <CheckSquare className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="max-w-7xl mx-auto w-full p-6 md:p-8 space-y-8 h-full flex flex-col overflow-hidden bg-transparent custom-scrollbar">
      <div className="mb-8 flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your assigned work across all projects
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-10 pb-20 max-w-4xl">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-base font-medium text-foreground">Zync Dashboard</h3>
              <span className="text-[11px] font-medium text-muted-foreground bg-card/50 px-2 py-0.5 rounded-full tabular-nums border border-border/10 backdrop-blur-md">
                2
              </span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
            <div className="space-y-3">
              <div className="bg-card/50 border border-border/10 rounded-2xl p-4 transition-all duration-200 hover:border-border/30 hover:bg-card/80 backdrop-blur-xl">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-sky-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[15px] font-medium leading-snug">
                        Implement Frontend UI
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-card/50 border border-border/10 text-muted-foreground backdrop-blur-sm">
                        Frontend
                      </span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="px-1.5 py-0.5 rounded text-xs bg-sky-500/20 text-sky-400">
                        Active
                      </span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="tabular-nums">Jan 16</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-2 text-xs border-border/10 bg-card/50 hover:bg-card/80 backdrop-blur-md"
                  >
                    <Terminal className="w-3.5 h-3.5" /> Git Commands
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-2 text-xs border-border/10 bg-card/50 hover:bg-card/80 backdrop-blur-md"
                  >
                    <Layout className="w-3.5 h-3.5" /> Architecture
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-2 text-xs border-border/10 bg-card/50 hover:bg-card/80 backdrop-blur-md"
                  >
                    <Github className="w-3.5 h-3.5" /> Repository
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="h-full w-full overflow-y-auto custom-scrollbar bg-background">
      <DashboardView
        currentUser={null}
        isPreview={true}
        mockGitHubData={{
          stats: {
            login: 'Alex Designer',
            name: 'Alex Designer',
            public_repos: 12,
            followers: 8,
            following: 4,
            avatar_url: mockAvatar,
            html_url: '#',
            connected: true,
          },
          events: [],
          contributions: graphData,
        }}
        mockProjects={[
          { id: '1', name: 'Project Alpha', type: 'Web' },
          { id: '2', name: 'Design System', type: 'Design' },
        ]}
      />
    </div>
  );

  const renderNotes = () => (
    <div className="h-full w-full overflow-hidden bg-background">
      <NotesView
        user={{ uid: '1', displayName: mockName, email: mockEmail, photoURL: mockAvatar }}
        isPreview={true}
        mockFolders={[
          {
            id: 'f1',
            name: 'Personal',
            ownerId: '1',
            collaborators: [],
            type: 'personal',
            parentId: null,
            color: '#4f46e5',
          },
          {
            id: 'f2',
            name: 'Zync Ideas',
            ownerId: '1',
            collaborators: ['2'],
            type: 'team',
            parentId: null,
            color: '#4f46e5',
          },
        ]}
        mockNotes={[
          {
            id: 'n1',
            title: 'Brainstorming Session',
            content: 'We need to revamp the dashboard component.',
            folderId: 'f2',
            ownerId: '1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'n2',
            title: 'To-Do List',
            content: '- Finish the preview mode\n- Push to master',
            folderId: 'f1',
            ownerId: '1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]}
      />
    </div>
  );

  const renderActivityLog = () => {
    const fakeLogs = Array.from({ length: 45 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (i % 14));
      return {
        _id: 'log' + i,
        userId: '1',
        startTime: date.toISOString(),
        endTime: date.toISOString(),
        date: date.toISOString(),
        eventType: i % 3 === 0 ? 'Code Commit' : i % 3 === 1 ? 'Task Completed' : 'Meeting',
        title:
          i % 3 === 0 ? 'Pushed to main branch' : i % 3 === 1 ? 'Finished Setup' : 'Daily Standup',
        actorName: mockName,
      };
    });

    return (
      <div className="h-full w-full overflow-hidden custom-scrollbar bg-background rounded-[2rem]">
        <ActivityLogView
          activityLogs={fakeLogs}
          elapsedTime="142h 15m"
          handleClearLogs={() => {}}
          handleDeleteLog={() => {}}
          tasks={[
            { id: '1', name: 'Active Task 1', status: 'In Progress' },
            { id: '2', name: 'Active Task 2', status: 'In Progress' },
            {
              id: '3',
              name: 'Done Task',
              status: 'Done',
              commitUrl: 'yes',
              dueDate: new Date(Date.now() - 86400000).toISOString(),
            },
            { id: '4', name: 'Done Task', status: 'Done' },
            { id: '5', name: 'Done Task', status: 'Done' },
            {
              id: '6',
              name: 'Overdue Task',
              status: 'In Progress',
              dueDate: new Date(Date.now() - 86400000).toISOString(),
              commitUrl: 'yes',
            },
          ]}
          users={dummyUsers}
          myTeams={[{ id: 'demo', name: 'Zync Studio', ownerId: '1' }]}
          currentTeamId="demo"
          currentTeamName="Zync Studio"
          currentUserId="1"
          currentUserDisplayName={mockName}
          currentUserPhotoURL={mockAvatar}
          currentUserEmail={mockEmail}
        />
      </div>
    );
  };

  const renderPeople = () => (
    <div className="h-full w-full overflow-hidden bg-background">
      <PeopleView
        users={dummyUsers}
        userStatuses={{
          '1': { isOnline: true },
          '2': { isOnline: false, lastSeen: new Date(Date.now() - 3600000).toISOString() },
          '3': { isOnline: true },
        }}
        onChat={() => {}}
        isPreview={true}
        mockTeams={[
          { id: 'demo', name: 'Zync Studio', ownerId: '1', members: ['1', '2', '3'] } as any,
          { id: 'design', name: 'Design System', ownerId: '1', members: ['1', '4', '5'] } as any,
          { id: 'marketing', name: 'Marketing & SEO', ownerId: '2', members: ['1', '6'] } as any,
          { id: 'devops', name: 'DevOps Guild', ownerId: '7', members: ['1', '7', '3'] } as any,
        ]}
        mockMe={
          {
            uid: '1',
            displayName: mockName,
            email: mockEmail,
            photoURL: mockAvatar,
            closeFriends: ['2', '4', '5', '6'],
          } as any
        }
      />
    </div>
  );

  const renderMeet = () => (
    <div className="h-full w-full overflow-hidden bg-background">
      <MeetView
        currentUser={null}
        usersList={dummyUsers}
        userStatuses={{
          '1': { isOnline: true },
          '2': { isOnline: false, lastSeen: new Date(Date.now() - 3600000).toISOString() },
          '3': { isOnline: true },
        }}
        isPreview={true}
        mockTeams={[
          { id: 'demo', name: 'Zync Studio', ownerId: '1', members: ['1', '2', '3'] } as any,
          { id: 'design', name: 'Design System', ownerId: '1', members: ['1', '4', '5'] } as any,
          { id: 'marketing', name: 'Marketing & SEO', ownerId: '2', members: ['1', '6'] } as any,
          { id: 'devops', name: 'DevOps Guild', ownerId: '7', members: ['1', '7', '3'] } as any,
        ]}
        mockMe={
          {
            uid: '1',
            displayName: mockName,
            email: mockEmail,
            photoURL: mockAvatar,
            closeFriends: ['2', '4', '5', '6'],
          } as any
        }
      />
    </div>
  );

  const renderSettings = () => (
    <div className="h-full w-full overflow-hidden bg-background">
      <SettingsView
        isPreview={true}
        mockTeams={[
          { id: 'demo', name: 'Zync Studio', ownerId: '1', members: ['1', '2', '3'] } as any,
          { id: 'design', name: 'Design System', ownerId: '1', members: ['1', '4', '5'] } as any,
          { id: 'marketing', name: 'Marketing & SEO', ownerId: '2', members: ['1', '6'] } as any,
          { id: 'devops', name: 'DevOps Guild', ownerId: '7', members: ['1', '7', '3'] } as any,
        ]}
        mockMe={
          {
            uid: '1',
            displayName: mockName,
            email: mockEmail,
            photoURL: mockAvatar,
            closeFriends: ['2', '4', '5', '6'],
            providerData: [],
          } as any
        }
      />
    </div>
  );

  const renderDesign = () => (
    <div className="h-full bg-transparent overflow-y-auto w-full custom-scrollbar">
      <div className="w-full max-w-7xl mx-auto p-6 md:p-8 flex flex-col items-start gap-8">
        <div className="w-full flex flex-row justify-between items-end gap-6 border-b border-border/10 pb-6">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm tracking-wide uppercase font-medium">
              Curated Web Design
            </p>
          </div>
          <form className="w-full md:max-w-xs relative group">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <input
              className="w-full bg-transparent border-none outline-none pl-6 pr-2 py-2 text-base placeholder:text-muted-foreground/50 focus:placeholder:text-muted-foreground/30 transition-all font-medium"
              placeholder="Search..."
              value="web design"
              readOnly
            />
            <div className="absolute bottom-0 left-0 h-[1px] w-full bg-border group-focus-within:bg-foreground transition-colors duration-300" />
          </form>
        </div>
        <div className="flex flex-wrap gap-8 text-sm font-medium tracking-wide">
          {['All', 'Godly', 'SiteInspire', 'Dribbble', 'Lapa Ninja', 'Awwwards'].map((cat) => (
            <button
              key={cat}
              className={cn(
                'relative pb-1 uppercase transition-colors hover:text-foreground/80',
                cat === 'All' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {cat}
              {cat === 'All' && (
                <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="px-6 md:px-8 pb-20 max-w-7xl mx-auto">
        <div className="columns-4 gap-6 space-y-6">
          {mockDesigns.map((item, index) => (
            <DesignCard key={`${item.id}-${index}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );

  const mockCalendarEvents = [
    {
      title: "New Year's Day",
      start: new Date(2026, 0, 1),
      end: new Date(2026, 0, 2),
      allDay: true,
      resource: { type: 'holiday' },
    },
    {
      title: 'Project Kickoff',
      start: new Date(2026, 0, 15, 10, 0),
      end: new Date(2026, 0, 15, 11, 0),
      resource: { type: 'project' },
    },
    {
      title: 'Sprint Review',
      start: new Date(),
      end: new Date(new Date().setHours(new Date().getHours() + 1)),
      resource: { type: 'project' },
    },
  ];

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#3174ad';
    if (event.resource?.type === 'project') {
      backgroundColor = '#10b981';
    } else if (event.resource?.type === 'holiday') {
      backgroundColor = '#f43f5e';
    }
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        margin: '2px 4px',
      },
    };
  };

  const renderCalendar = () => (
    <div className="max-w-7xl mx-auto w-full p-6 md:p-8 space-y-8 h-full flex flex-col custom-scrollbar">
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Holidays:</span>
          <Badge variant="outline" className="h-9 px-3">
            US
          </Badge>
        </div>
      </div>
      <Card className="flex-1 p-4 shadow-sm border border-border/10 bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden min-h-[600px]">
        <BigCalendar
          localizer={localizer}
          events={mockCalendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day', 'agenda']}
          defaultView="month"
          toolbar={true}
          popup={true}
          step={60}
          showMultiDayTimes
        />
      </Card>
    </div>
  );

  return (
    <div
      ref={containerRef}
      onClickCapture={(e) => handleInteraction(e)}
      onMouseMoveCapture={(e) => handleInteraction(e)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="w-full h-full bg-sidebar rounded-2xl border-0 overflow-hidden flex relative"
      style={{ boxShadow: 'var(--shadow-xl), var(--glass-bevel)' }}
    >
      {/* VisionOS Pill */}
      <AnimatePresence>
        {!hasInteracted && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%', scale: 0.95 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="absolute bottom-6 left-1/2 z-[100] px-5 py-2.5 rounded-full bg-surface-glass-thin backdrop-blur-ultra border border-border/10 shadow-[inset_0_1px_0_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center gap-3 pointer-events-none"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-[13px] font-medium tracking-wide text-foreground/90 shadow-sm">
              ✧ Interactive Preview
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ghost Cursor Sequence */}
      <AnimatePresence>
        {ghostState !== 'idle' && ghostState !== 'done' && !hasInteracted && (
          <motion.div
            className="absolute z-[110] pointer-events-none"
            variants={{
              entering: { left: '80%', top: '80%', opacity: 0 },
              moving: {
                left: '80px',
                top: '100px',
                opacity: 1,
                scale: 1,
                transition: { duration: 1, ease: 'easeOut' },
              },
              clicking: {
                left: '80px',
                top: '100px',
                opacity: 1,
                scale: 0.9,
                transition: { duration: 0.2 },
              },
              leaving: {
                left: '-10%',
                top: '150px',
                opacity: 0,
                scale: 1,
                transition: { duration: 0.8, ease: 'easeIn' },
              },
            }}
            initial="entering"
            animate={
              ghostState === 'entering'
                ? 'moving'
                : ghostState === 'clicking'
                  ? 'clicking'
                  : 'leaving'
            }
            exit="leaving"
          >
            <SimulatedCursor
              x={0}
              y={0}
              name="Demo"
              color="#f87171"
              isClicking={ghostState === 'clicking'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* The User's Own Trailing Cursor */}
      <AnimatePresence>
        {isHovering && hasInteracted && (
          <motion.div
            className="absolute top-0 left-0 z-[120] pointer-events-none will-change-transform"
            transition={{ type: 'spring', damping: 20, stiffness: 300, mass: 0.5 }}
            initial={{ opacity: 0, scale: 0.5, x: mousePos.x, y: mousePos.y }}
            animate={{ opacity: 1, scale: 1, x: mousePos.x, y: mousePos.y }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <SimulatedCursor
              x={0}
              y={0}
              name="You"
              color="hsl(var(--foreground))"
              isClicking={false}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <aside className="w-48 bg-transparent flex flex-col shrink-0">
        <div className="p-3 h-12 flex items-center">
          <>
            <img
              src="/zync-white.webp"
              alt="Zync"
              className="h-9 w-auto rounded-lg block dark:hidden"
            />
            <img
              src="/zync-dark.webp"
              alt="Zync"
              className="h-9 w-auto rounded-lg hidden dark:block"
            />
          </>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveSection(item.label)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${activeSection === item.label ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-2">
          <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/40 cursor-pointer transition-colors">
            <Avatar className="w-6 h-6 border-0">
              <AvatarImage src={mockAvatar} />
              <AvatarFallback>{mockName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-foreground truncate">{mockName}</div>
              <div className="text-[9px] text-muted-foreground truncate">Premium</div>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      </aside>
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background border border-sidebar-border/40 shadow-elevation4 rounded-2xl my-2 mr-2">
        <header className="h-10 border-b border-border/10 flex items-center justify-end px-4 bg-background/60 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <Bell className="w-3.5 h-3.5" />
            </Button>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <div
            className="absolute top-0 left-0"
            style={{
              width: '142.857%',
              height: '142.857%',
              transform: 'scale(0.7)',
              transformOrigin: 'top left',
            }}
          >
            {activeSection === 'Dashboard' && renderDashboard()}
            {activeSection === 'My Workspace' && renderMyWorkspace()}
            {activeSection === 'Tasks' && renderTasks()}
            {activeSection === 'Activity log' && renderActivityLog()}
            {activeSection === 'People' && renderPeople()}
            {activeSection === 'Design' && renderDesign()}
            {activeSection === 'Calendar' && renderCalendar()}
            {activeSection === 'Meet' && renderMeet()}
            {activeSection === 'Notes' && renderNotes()}
            {activeSection === 'Settings' && renderSettings()}
            {![
              'Dashboard',
              'My Workspace',
              'Tasks',
              'Activity log',
              'Design',
              'Calendar',
              'People',
              'Meet',
              'Settings',
              'Notes',
            ].includes(activeSection) && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-10 h-10 bg-secondary/50 rounded-full flex items-center justify-center mb-2">
                  <h3 className="text-xs font-semibold text-foreground">{activeSection}</h3>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  This module is visually accurate to the live application.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DesktopPreview;

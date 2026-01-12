import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/utils";
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
  FolderOpen,
  Clock,
  Users,
  Settings,
  MoreHorizontal,
  Star,
  Video,
  MessageSquare,
  Circle,
  Loader2,
  LogOut,
  Trash2,
  Github
} from "lucide-react";
import { NotesView } from "@/components/notes/NotesView";
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
// import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from "firebase/database";
import { collection, query, where, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import ChatView from "./ChatView";
import SettingsView from "./SettingsView";
import DesignView from "./DesignView";
import MyProjectsView from "./MyProjectsView"; // Import new view
import CalendarView from "./CalendarView";

const DesktopView = ({ isPreview = false }: { isPreview?: boolean }) => {
  const [activeSection, setActiveSection] = useState(() => {
    if (isPreview) return "My Workspace";
    return localStorage.getItem("zync-active-section") || "My Workspace";
  });

  useEffect(() => {
    if (!isPreview) {
      localStorage.setItem("zync-active-section", activeSection);
    }
  }, [activeSection, isPreview]);

  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveSection("Chat");
      if (customEvent.detail) {
        // logic to look up full user if needed, or use the partial data
        // For now, we use the partial data which is enough for ChatView to query messages
        // We might want to fetch the full user details in ChatView or here if they are missing
        setSelectedChatUser(customEvent.detail);
      }
    };

    window.addEventListener("zync-open-chat", handleOpenChat);
    return () => window.removeEventListener("zync-open-chat", handleOpenChat);
  }, []);

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation(); // Get current URL location
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Sync active section with URL path for /dashboard/projects
  useEffect(() => {
    if (location.pathname === '/dashboard/projects') {
      setActiveSection("My Projects");
    }
  }, [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string, any>>({});
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

  useEffect(() => {
    if ((activeSection === "People" || activeSection === "Notes" || activeSection === "Chat") && !isPreview) {
      const fetchUsers = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/users`);
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
  }, [activeSection, isPreview]);

  // New Project State
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName || !projectDescription) {
      toast({
        title: "Missing fields",
        description: "Please fill in both project name and description.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const user = auth.currentUser;
      const ownerId = user ? user.uid : "anonymous";

      const response = await fetch(`${API_BASE_URL}/api/projects/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          ownerId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate project");
      }

      const data = await response.json();

      toast({
        title: "Project Created!",
        description: "AI has generated your project architecture.",
      });

      navigate(`/projects/${data._id}`);

    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Something went wrong while generating the project.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
    { icon: FolderOpen, label: "Files", active: activeSection === "Files" },
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

  const handleCreateMeeting = () => {
    const meetLink = `https://meet.google.com/new`;
    window.open(meetLink, "_blank");
    toast({
      title: "Meeting Created",
      description: "Redirecting to Google Meet...",
    });
  };

  const handleChat = (user: any) => {
    setSelectedChatUser(user);
    setActiveSection("Chat");
  };

  const renderContent = () => {
    switch (activeSection) {
      case "My Workspace":
        return (
          <Workspace
            onNavigate={setActiveSection}
            onSelectProject={(id) => navigate(`/projects/${id}`)}
            onOpenNote={(noteId) => {
              setActiveNoteId(noteId);
              setActiveSection("Notes");
            }}
            currentUser={currentUser}
          />
        );

      case "My Projects":
        return <MyProjectsView currentUser={currentUser} />;

      case "Calendar":
        return <CalendarView />;

      case "Chat":
        return (
          <div className="flex h-full w-full">
            {/* Chat Sidebar (User List) */}
            <div className="w-80 border-r border-border/50 flex flex-col bg-secondary/10">
              <div className="p-4 border-b border-border/50">
                <h2 className="text-lg font-semibold mb-4">Messages</h2>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search people..." className="pl-8" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {displayUsers.map((user) => {
                  const status = !isPreview && userStatuses[user.uid]
                    ? userStatuses[user.uid].state
                    : user.status;
                  const isSelected = selectedChatUser?.uid === user.uid;

                  return (
                    <div
                      key={user._id || user.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50 transition-colors ${isSelected ? 'bg-secondary/50' : ''}`}
                      onClick={() => setSelectedChatUser(user)}
                    >
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={user.photoURL} />
                          <AvatarFallback>{user.avatar || (user.displayName || user.name || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${status === "online" ? "bg-green-500" :
                          status === "away" ? "bg-yellow-500" : "bg-gray-400"
                          }`} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-medium truncate">{user.displayName || user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedChatUser ? (
                <ChatView
                  selectedUser={{
                    ...selectedChatUser,
                    status: userStatuses[selectedChatUser.uid]?.state || selectedChatUser.status || 'offline'
                  }}
                // No onBack prop needed for desktop split view
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-background/50">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                  <p>Select a user to start chatting</p>
                </div>
              )}
            </div>
          </div>
        );

      case "People":
        return (
          <div className="flex-1 w-full p-6 space-y-6 h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">People</h2>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Invite Member
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayUsers.map((user) => {
                const status = !isPreview && userStatuses[user.uid]
                  ? userStatuses[user.uid].state
                  : user.status;

                return (
                  <Card key={user._id || user.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={user.photoURL} />
                          <AvatarFallback>{user.avatar || (user.displayName || user.name || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${status === "online" ? "bg-green-500" :
                          status === "away" ? "bg-yellow-500" : "bg-gray-400"
                          }`} />
                      </div>
                      <div className="flex flex-col">
                        <CardTitle className="text-base">{user.displayName || user.name}</CardTitle>
                        <CardDescription className="text-xs">{user.email}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant={status === "online" ? "default" : "secondary"} className="capitalize">
                          {status}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => handleChat(user)}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Chat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        );



      case "New Project":
        return (
          <div className="flex-1 p-8">
            <div className="max-w-3xl mx-auto space-y-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Create New Project</h2>

                <p className="text-muted-foreground mt-2 text-lg">
                  Describe your project idea, and our AI will generate a complete architecture and development plan for you.
                </p>
              </div>

              <Card className="border-none shadow-none bg-transparent p-0">
                <CardContent className="p-0">
                  <form onSubmit={handleCreateProject} className="space-y-8">
                    <div className="space-y-4">
                      <Label htmlFor="name" className="text-base">Project Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., E-commerce Platform, Task Manager"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        disabled={isGenerating}
                        className="h-12 text-lg"
                      />
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="description" className="text-base">Project Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your project in detail. What features does it have? Who is it for?"
                        className="min-h-[300px] text-lg p-4 resize-none"
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        disabled={isGenerating}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" size="lg" className="px-8" disabled={isGenerating}>
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Architecture...
                          </>
                        ) : (
                          "Generate Project Plan"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "Activity log":
        return (
          <div className="p-6 h-full">
            <h2 className="text-2xl font-bold mb-6">Activity Log</h2>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div className="space-y-1.5">
                  <CardTitle>Session History</CardTitle>
                  <CardDescription>Track your active time on the platform.</CardDescription>
                </div>
                {activityLogs.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleClearLogs}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear History
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-5 p-4 font-medium border-b bg-muted/50">
                    <div>Date</div>
                    <div>Start Time</div>
                    <div>End Time</div>
                    <div>Duration</div>
                    <div className="text-right">Actions</div>
                  </div>
                  {activityLogs.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No activity logs found.</div>
                  ) : (
                    activityLogs.map((log) => {
                      const start = new Date(log.startTime);
                      const end = new Date(log.endTime);
                      const durationSeconds = log.duration || Math.round((end.getTime() - start.getTime()) / 1000);
                      const hours = Math.floor(durationSeconds / 3600);
                      const minutes = Math.floor((durationSeconds % 3600) / 60);

                      const formattedDuration = hours > 0
                        ? `${hours} hr ${minutes} min`
                        : `${minutes} min`;

                      return (
                        <div key={log._id} className="grid grid-cols-5 p-4 border-b last:border-0 hover:bg-muted/20 items-center">
                          <div>{log.date}</div>
                          <div>{start.toLocaleTimeString()}</div>
                          <div>{end.toLocaleTimeString()}</div>
                          <div className="font-medium">
                            {formattedDuration}
                          </div>
                          <div className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLog(log._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "Meet":
        return (
          <div className="flex-1 w-full flex flex-col items-center justify-center h-full p-6 text-center space-y-6">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Video className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold">Video Meetings</h2>
            <p className="text-muted-foreground max-w-md">
              Connect with your team instantly. Create a new Google Meet link and share it with your colleagues.
            </p>
            <Button size="lg" onClick={handleCreateMeeting} className="gap-2">
              <Plus className="w-5 h-5" />
              Create New Meeting
            </Button>
          </div>
        );

      case "Design":
        return <DesignView />;

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
        // Default Schedule View
        return (
          <div className="flex-1 flex flex-col h-full">
            {/* Timeline */}
            <div className="flex-1 flex flex-col">
              {/* Schedule Grid */}
              <div className="flex-1">

                {/* Date Header */}
                <div className="flex border-b border-border/50 sticky top-0 bg-background z-10">
                  <div className="w-40 p-3 text-sm text-muted-foreground border-r border-border/50">September 2021</div>
                  {["1 Mon", "2 Tue", "3 Wed", "4 Thu", "5 Fri"].map((day, i) => (
                    <div key={day} className={`flex-1 p-3 text-center text-sm font-medium border-r border-border/50 ${i === 1 ? "bg-primary/5" : ""}`}>
                      <span className={i === 1 ? "text-primary" : "text-muted-foreground"}>{day}</span>
                    </div>
                  ))}
                </div>

                {/* Time slots with tasks */}
                <div className="flex">
                  <div className="w-40 border-r border-border/50">
                    {/* User row */}
                    <div className="flex items-center gap-2 px-3 py-3 border-b border-border/50">
                      <div className="w-6 h-6 rounded-full bg-task-teal flex items-center justify-center text-[10px] text-primary-foreground">OC</div>
                      <div>
                        <div className="text-xs font-medium text-foreground">Oliver Campbell</div>
                        <div className="text-[10px] text-muted-foreground">3.50h</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-3 border-b border-border/50">
                      <div className="w-6 h-6 rounded-full bg-task-pink flex items-center justify-center text-[10px] text-primary-foreground">CR</div>
                      <div>
                        <div className="text-xs font-medium text-foreground">Charlie Rogers</div>
                        <div className="text-[10px] text-muted-foreground">4.20h</div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks grid */}
                  <div className="flex-1 grid grid-cols-5">
                    {[...Array(5)].map((_, colIndex) => (
                      <div key={colIndex} className={`border-r border-border/50 p-2 space-y-2 ${colIndex === 1 ? "bg-primary/5" : ""}`}>
                        {tasks.slice(colIndex * 2, colIndex * 2 + 3).map((task) => (
                          <div
                            key={task.id}
                            className={`p-2 rounded-lg border ${task.color} cursor-pointer hover:shadow-md transition-shadow`}
                          >
                            <div className="text-xs font-medium text-foreground line-clamp-2">{task.title}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] text-muted-foreground">{task.time}</span>
                              <span className="text-[10px] text-muted-foreground">•</span>
                              <span className="text-[10px] text-muted-foreground">{task.due}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Waiting List */}
              <div className="w-64 border-l border-border/50 bg-secondary/30">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Waiting list</span>
                    <span className="w-5 h-5 rounded-full bg-muted text-xs flex items-center justify-center text-muted-foreground">15</span>
                  </div>
                  <div className="flex gap-1">
                    <Plus className="w-4 h-4 text-muted-foreground cursor-pointer" />
                    <Search className="w-4 h-4 text-muted-foreground cursor-pointer" />
                  </div>
                </div>
                <div className="p-3 space-y-2 overflow-y-auto max-h-[500px]">
                  {waitingList.map((item, i) => (
                    <div key={i} className="bg-card rounded-lg p-3 border border-border/50 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.color} mt-1.5 shrink-0`} />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-foreground line-clamp-2">{item.title}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-muted-foreground">{item.time}</span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground">{item.due}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`flex bg-background text-foreground ${activeSection === "Chat" ? "h-screen overflow-hidden" : "min-h-screen"}`}>

      {/* Sidebar */}
      <div className="w-64 bg-secondary/30 border-r border-border/50 flex flex-col sticky top-0 h-screen">

        <div className="p-4 flex items-center gap-2 border-b border-border/50">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
            Z
          </div>
          <span className="font-bold text-lg">Zync</span>
          <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-3 mb-2">
            <Button
              className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setActiveSection("New Project")}
            >
              <Plus className="w-4 h-4" />
              Create new project
            </Button>
          </div>

          <nav className="space-y-1 px-2">
            {sidebarItems.map((item, index) => (
              <div key={index}>
                <Button
                  variant={item.active ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-3 ${item.active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => {
                    if (item.label === "My Projects") {
                      navigate('/dashboard/projects');
                    } else {
                      if (location.pathname === '/dashboard/projects') {
                        navigate('/dashboard');
                      }
                      setActiveSection(item.label);
                    }
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
                {item.children && item.active && (
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

        <div className="p-4 border-t border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 p-2 rounded-md">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  {isPreview ? "JD" : (currentUser?.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : currentUser?.email?.substring(0, 2).toUpperCase() || "U")}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium truncate">
                    {isPreview ? "John Doe" : (currentUser?.displayName || currentUser?.email?.split('@')[0] || "User")}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{isPreview ? "john@example.com" : (currentUser?.email || "No email")}</div>
                </div>
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveSection("Settings")}>
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
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${activeSection === "Chat" ? "overflow-hidden" : ""}`}>

        {/* Global Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background shrink-0">
          <div className="flex items-center gap-4">
            {(activeSection === "My Workspace" || activeSection === "Dashboard") ? (
              <>
                <span className="font-semibold text-foreground">Tools</span>
                <Button size="sm" variant="hero" onClick={() => setActiveSection("New Project")}>+ Add new</Button>
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
              {isPreview ? "JD" : (currentUser?.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : currentUser?.email?.substring(0, 2).toUpperCase() || "U")}
            </div>
          </div>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default DesktopView;

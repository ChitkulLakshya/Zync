import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  Home,
  Video,
  User as UserIcon,
  LogOut,
  Plus,
  Users,
  CheckSquare,
  MessageSquare,
  Calendar as CalendarIcon,
  FileText
} from "lucide-react";
import Workspace from "@/components/workspace/Workspace";
import CalendarView from "./CalendarView";
import ChatView from "./ChatView";
import TasksView from "./TasksView";
import { NotesView } from "@/components/notes/NotesView";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL, getFullUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const MobileView = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();





  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Users when People tab is active
  useEffect(() => {
    if (activeTab === "people") {
      const fetchUsers = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(`${API_BASE_URL}/api/users`, { signal: controller.signal });
          if (response.ok) {
            const data = await response.json();
            setUsersList(data);
          } else {
            console.warn("Mobile Users Fetch failed");
            toast({ title: "Error", description: "Failed to load users.", variant: "destructive" });
          }
        } catch (error) {
          console.error("Error fetching users:", error);
        } finally {
          clearTimeout(timeoutId);
        }
      };
      fetchUsers();
    }
  }, [activeTab]);

  const handleNavigate = (path: string) => {
    // Map Workspace navigation strings to routes
    if (path === "New Project") {
      navigate("/new-project");
    } else if (path === "Projects") {
      setActiveTab("home");
    }
  };

  const handleSelectProject = (id: string) => {
    navigate(`/projects/${id}`);
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const handleCreateMeeting = () => {
    const meetLink = `https://meet.google.com/new`;
    window.open(meetLink, "_blank");
    toast({
      title: "Meeting Created",
      description: "Redirecting to Google Meet...",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">Z</span>
          </div>
          <span className="font-semibold text-lg">Zync</span>
        </div>

        <Sheet>
          <SheetTrigger>
            <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-primary/20">
              <AvatarImage src={getFullUrl(currentUser?.photoURL)} />
              <AvatarFallback>{currentUser?.displayName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
          </SheetTrigger>
          <SheetContent side="left" className="w-[80%] sm:w-[300px]">
            <div className="flex flex-col gap-6 mt-8">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={getFullUrl(currentUser?.photoURL)} />
                  <AvatarFallback>{currentUser?.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-lg">{currentUser?.displayName}</p>
                  <p className="text-sm text-muted-foreground break-all">{currentUser?.email}</p>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 space-y-2">
                <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === "home" && (
          <div className="px-2 py-4">
            {currentUser ? (
              <Workspace
                onNavigate={handleNavigate}
                onSelectProject={handleSelectProject}
                currentUser={currentUser}
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="h-full">
            <CalendarView />
          </div>
        )}

        {activeTab === "notes" && (
          <div className="h-full">
            <NotesView
              user={currentUser ? { uid: currentUser.uid, displayName: currentUser.displayName || undefined, email: currentUser.email || undefined } : null}
              users={usersList}
            />
          </div>
        )}

        {activeTab === "meet" && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Video className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold">Video Meetings</h2>
            <p className="text-muted-foreground max-w-md">
              Connect with your team instantly. Create a new Google Meet link.
            </p>
            <Button size="lg" onClick={handleCreateMeeting} className="gap-2">
              <Plus className="w-5 h-5" />
              Create New Meeting
            </Button>
          </div>
        )}

        {activeTab === "people" && (
          <div className="p-4 space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">People</h2>
            <div className="grid gap-3 grid-cols-1">
              {usersList.length === 0 ? (
                <p className="text-muted-foreground">Loading users...</p>
              ) : (
                usersList.filter(u => u.uid !== currentUser?.uid).map((user) => (
                  <Card key={user._id || user.uid} className="hover:bg-secondary/20 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={getFullUrl(user.photoURL)} />
                        <AvatarFallback>{(user.displayName || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <h3 className="font-semibold truncate">{user.displayName || "Unknown"}</h3>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Badge variant={user.status === "online" ? "default" : "secondary"}>
                        {user.status || 'offline'}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => {
                        setSelectedChatUser(user);
                        setActiveTab("chat");
                      }}>
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat View */}
        {activeTab === "chat" && selectedChatUser && (
          <div className="h-full z-50 fixed inset-0 bg-background">
            <ChatView
              selectedUser={selectedChatUser}
              onBack={() => {
                setActiveTab("people");
                setSelectedChatUser(null);
              }}
            />
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="h-full overflow-hidden">
            <TasksView currentUser={currentUser} />
          </div>
        )}

        {activeTab === "profile" && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
            <UserIcon className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">My Profile</h2>
            <p className="text-muted-foreground mb-6">Manage your account settings and preferences.</p>
            <Button onClick={() => setActiveTab("home")}>Back to Dashboard</Button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/40 pb-safe pt-2 px-1 z-50">
        <div className="flex items-center justify-between max-w-lg mx-auto h-16 px-1">
          {/* Left Group */}
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center justify-center min-w-[14%] gap-1 transition-colors ${activeTab === "home" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Home className="w-5 h-5" strokeWidth={activeTab === "home" ? 2.5 : 2} />
            <span className="text-[9px] font-medium">Home</span>
          </button>

          <button
            onClick={() => setActiveTab("people")}
            className={`flex flex-col items-center justify-center min-w-[14%] gap-1 transition-colors ${activeTab === "people" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="w-5 h-5" strokeWidth={activeTab === "people" ? 2.5 : 2} />
            <span className="text-[9px] font-medium">People</span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex flex-col items-center justify-center min-w-[14%] gap-1 transition-colors ${activeTab === "calendar" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <CalendarIcon className="w-5 h-5" strokeWidth={activeTab === "calendar" ? 2.5 : 2} />
            <span className="text-[9px] font-medium">Cal</span>
          </button>

          {/* Center FAB */}
          <div className="relative -top-6 min-w-[15%] flex justify-center">
            <button
              onClick={() => navigate("/new-project")}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform ring-4 ring-background"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Right Group */}
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex flex-col items-center justify-center min-w-[14%] gap-1 transition-colors ${activeTab === "notes" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <FileText className="w-5 h-5" strokeWidth={activeTab === "notes" ? 2.5 : 2} />
            <span className="text-[9px] font-medium">Notes</span>
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex flex-col items-center justify-center min-w-[14%] gap-1 transition-colors ${activeTab === "tasks" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <CheckSquare className="w-5 h-5" strokeWidth={activeTab === "tasks" ? 2.5 : 2} />
            <span className="text-[9px] font-medium">Tasks</span>
          </button>

          <button
            onClick={() => setActiveTab("meet")}
            className={`flex flex-col items-center justify-center min-w-[14%] gap-1 transition-colors ${activeTab === "meet" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Video className="w-5 h-5" strokeWidth={activeTab === "meet" ? 2.5 : 2} />
            <span className="text-[9px] font-medium">Meet</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default MobileView;

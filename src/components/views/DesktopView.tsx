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
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";

const DesktopView = () => {
  const sidebarItems = [
    { icon: Home, label: "Dashboard", active: false },
    { icon: FolderKanban, label: "My Workspace", active: true, children: [
      { label: "Roadmap" },
      { label: "Schedule" },
    ]},
    { icon: Star, label: "Favorites", active: false },
    { icon: FolderOpen, label: "My Projects", active: false, children: [
      { label: "Marketing" },
      { label: "Wedding" },
      { label: "House construction" },
    ]},
    { icon: CheckSquare, label: "Tasks", active: false },
    { icon: FileText, label: "Notes", active: false },
    { icon: FolderOpen, label: "Files", active: false },
    { icon: Clock, label: "Activity log", active: false },
    { icon: Users, label: "People", active: false },
    { icon: Settings, label: "Settings", active: false },
  ];

  const tasks = [
    { id: 1, title: "Check email", time: "0.20h", due: "Due today", color: "bg-task-orange/20 border-task-orange/40", user: "Oliver Campbell" },
    { id: 2, title: "Make competitors analysis for Nokia", time: "0.40h", due: "Due today", color: "bg-task-teal/20 border-task-teal/40", user: "Oliver Campbell" },
    { id: 3, title: "Weekly planning session", time: "1.00h", due: "10:00 - 10:40", color: "bg-task-teal/20 border-task-teal/40", user: "Oliver Campbell" },
    { id: 4, title: "Interview with John Warner", time: "0.40h", due: "10:00 - 10:40", color: "bg-task-pink/20 border-task-pink/40", user: "Oliver Campbell" },
    { id: 5, title: "Prepare the questions for the interviews", time: "0.30h", due: "2 days ago", color: "bg-task-orange/20 border-task-orange/40", user: "Oliver Campbell" },
    { id: 6, title: "Interview with Rebecca Johnson", time: "0.40h", due: "11:00 - 11:40", color: "bg-task-pink/20 border-task-pink/40", user: "Oliver Campbell" },
    { id: 7, title: "Come up with 5 slogan ideas for ALP Guitar School", time: "1.30h", due: "Due today", color: "bg-task-green/20 border-task-green/40", user: "Oliver Campbell" },
    { id: 8, title: "KYFO results analysis", time: "1.30h", due: "Due today", color: "bg-task-purple/20 border-task-purple/40", user: "Oliver Campbell" },
    { id: 9, title: "Write a Press Release feature launch", time: "4.00h", due: "Due today", color: "bg-task-yellow/20 border-task-yellow/40", user: "Oliver Campbell" },
    { id: 10, title: "Send a Press Release to partners", time: "0.20h", due: "Due today", color: "bg-task-green/20 border-task-green/40", user: "Oliver Campbell" },
  ];

  const waitingList = [
    { title: "Keyword research for Bordio Google Ads", time: "4.00h", due: "Due tomorrow", color: "bg-task-orange" },
    { title: "Upload products to Samsung GDN campaign", time: "0.30h", due: "Due today", color: "bg-task-pink" },
    { title: "Give feedback on a blog post", time: "0.15h", due: "3 days ago", color: "bg-task-teal" },
    { title: "Give feedback on slogan ideas for Guitar School", time: "0.15h", due: "10 days left", color: "bg-task-green" },
    { title: "Compare and choose software for email", time: "2.00h", due: "13 days left", color: "bg-task-purple" },
  ];

  return (
    <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
      {/* Browser Chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 border-b border-border/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-task-yellow/60" />
          <div className="w-3 h-3 rounded-full bg-task-green/60" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-background/80 rounded-md px-4 py-1 text-xs text-muted-foreground">
            app.projectflow.io/dashboard
          </div>
        </div>
      </div>
      
      <div className="flex h-[600px]">
        {/* Sidebar */}
        <div className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">P</span>
              </div>
              <span className="text-sm font-semibold text-sidebar-foreground">ProjectFlow</span>
            </div>
          </div>

          {/* Search */}
          <div className="p-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-sidebar-accent rounded-lg">
              <Search className="w-4 h-4 text-sidebar-foreground/50" />
              <span className="text-sm text-sidebar-foreground/50">Search...</span>
            </div>
          </div>

          {/* Nav Items */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {sidebarItems.map((item) => (
              <div key={item.label}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  item.active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                }`}>
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.children && <ChevronDown className="w-4 h-4" />}
                </div>
                {item.children && item.active && (
                  <div className="ml-6 space-y-1 mt-1">
                    {item.children.map((child) => (
                      <div key={child.label} className="px-3 py-1.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground cursor-pointer">
                        {child.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Teams */}
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-sidebar-foreground/50 uppercase tracking-wider">Teams</span>
              <Plus className="w-4 h-4 text-sidebar-foreground/50" />
            </div>
            {["Marketing", "Sales B2B", "Programmers", "Bug fixing"].map((team) => (
              <div key={team} className="px-3 py-1.5 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer">
                {team}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-background flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-foreground">Tools</span>
              <Button size="sm" variant="hero">+ Add new</Button>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-secondary text-muted-foreground text-xs font-medium rounded-full cursor-pointer">Week view</span>
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full cursor-pointer">Today</span>
                <span className="px-3 py-1 text-muted-foreground text-xs font-medium rounded-full hover:bg-secondary cursor-pointer">Filters</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">01:27:31</span>
              </div>
              <Search className="w-5 h-5 text-muted-foreground cursor-pointer" />
              <Bell className="w-5 h-5 text-muted-foreground cursor-pointer" />
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                OC
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 flex overflow-hidden">
            {/* Schedule Grid */}
            <div className="flex-1 overflow-auto">
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
      </div>
    </div>
  );
};

export default DesktopView;

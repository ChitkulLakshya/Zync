import { 
  Search, 
  Bell, 
  Plus, 
  Home, 
  FolderKanban, 
  Calendar, 
  MessageSquare,
  User,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";

const MobileView = () => {
  const weekDays = [
    { day: "Mon", date: 5 },
    { day: "Tue", date: 6, active: true },
    { day: "Wed", date: 7 },
    { day: "Thu", date: 8 },
    { day: "Fri", date: 9 },
  ];

  const tasks = [
    { title: "Review PR #234", time: "9:00 AM", duration: "30min", color: "bg-task-green/20 border-task-green/40", done: true },
    { title: "Team standup meeting", time: "10:00 AM", duration: "30min", color: "bg-task-teal/20 border-task-teal/40", done: false },
    { title: "Fix authentication bug", time: "11:30 AM", duration: "2h", color: "bg-task-orange/20 border-task-orange/40", done: false },
    { title: "Design review with Sarah", time: "2:00 PM", duration: "1h", color: "bg-task-pink/20 border-task-pink/40", done: false },
    { title: "Deploy version 2.1", time: "4:00 PM", duration: "1h", color: "bg-task-purple/20 border-task-purple/40", done: false },
    { title: "Write documentation", time: "5:30 PM", duration: "1.5h", color: "bg-task-yellow/20 border-task-yellow/40", done: false },
  ];

  const bottomNav = [
    { icon: Home, label: "Home", active: true },
    { icon: FolderKanban, label: "Projects", active: false },
    { icon: Calendar, label: "Calendar", active: false },
    { icon: MessageSquare, label: "Chat", active: false },
    { icon: User, label: "Profile", active: false },
  ];

  return (
    <div className="flex justify-center gap-8">
      {/* Phone 1 - Task List */}
      <div className="relative w-72 h-[600px] bg-sidebar rounded-[3rem] p-3 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-sidebar-foreground/20 rounded-full z-10" />
        
        {/* Screen */}
        <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden flex flex-col">
          {/* Status Bar */}
          <div className="flex justify-between items-center px-6 py-3 text-xs text-foreground">
            <span className="font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
              <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
              <div className="w-6 h-3 bg-task-green rounded-sm" />
            </div>
          </div>
          
          {/* App Content */}
          <div className="flex-1 flex flex-col px-4 pb-2 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">P</span>
                </div>
                <span className="font-semibold text-foreground text-sm">ProjectFlow</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  JD
                </div>
              </div>
            </div>

            {/* Date Selector */}
            <div className="flex items-center justify-between mb-3">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              <div className="flex gap-2">
                {weekDays.map((d) => (
                  <div
                    key={d.day}
                    className={`flex flex-col items-center px-3 py-2 rounded-xl transition-colors ${
                      d.active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <span className="text-[10px]">{d.day}</span>
                    <span className="text-sm font-semibold">{d.date}</span>
                  </div>
                ))}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Today's Tasks</span>
                <Plus className="w-4 h-4 text-primary" />
              </div>
              {tasks.map((task, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border ${task.color} ${task.done ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className={`text-xs font-medium text-foreground ${task.done ? "line-through" : ""}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{task.time}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">{task.duration}</span>
                      </div>
                    </div>
                    {task.done && (
                      <div className="w-5 h-5 rounded-full bg-task-green flex items-center justify-center">
                        <span className="text-primary-foreground text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-around py-2 mt-2 border-t border-border/50">
              {bottomNav.map((item) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-1 ${
                    item.active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phone 2 - Calendar View */}
      <div className="relative w-72 h-[600px] bg-sidebar rounded-[3rem] p-3 shadow-2xl hidden lg:block">
        {/* Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-sidebar-foreground/20 rounded-full z-10" />
        
        {/* Screen */}
        <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden flex flex-col">
          {/* Status Bar */}
          <div className="flex justify-between items-center px-6 py-3 text-xs text-foreground">
            <span className="font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
              <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
              <div className="w-6 h-3 bg-task-green rounded-sm" />
            </div>
          </div>
          
          {/* App Content */}
          <div className="flex-1 flex flex-col px-4 pb-2 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold text-foreground text-sm">January 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground" />
                <Plus className="w-5 h-5 text-primary" />
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="mb-4">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground font-medium py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {[...Array(35)].map((_, i) => {
                  const day = i - 3;
                  const isToday = day === 6;
                  const hasTask = [2, 6, 12, 15, 19, 22, 26].includes(day);
                  return (
                    <div
                      key={i}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors ${
                        day < 1 || day > 31 ? "text-muted-foreground/30" : 
                        isToday ? "bg-primary text-primary-foreground font-semibold" : 
                        "text-foreground"
                      }`}
                    >
                      {day >= 1 && day <= 31 && (
                        <>
                          {day}
                          {hasTask && !isToday && (
                            <div className="w-1 h-1 rounded-full bg-task-orange mt-0.5" />
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">January 6 - Schedule</span>
              </div>
              <div className="space-y-2">
                {[
                  { time: "9:00", title: "Morning standup", color: "bg-task-teal" },
                  { time: "10:30", title: "Client meeting", color: "bg-task-pink" },
                  { time: "12:00", title: "Lunch break", color: "bg-muted" },
                  { time: "14:00", title: "Code review", color: "bg-task-green" },
                  { time: "16:00", title: "Sprint planning", color: "bg-task-purple" },
                ].map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-[10px] text-muted-foreground w-10">{event.time}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${event.color}`} />
                      <span className="text-xs text-foreground">{event.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-around py-2 mt-2 border-t border-border/50">
              {bottomNav.map((item) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-1 ${
                    item.label === "Calendar" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileView;

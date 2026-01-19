
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { subDays, isAfter, parseISO } from "date-fns";
import { getFullUrl } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
    createdAt?: string | Date;
    status: string;
    assignedTo?: string;
    assignedToName?: string;
}

interface User {
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    teamId?: string;
}

interface Session {
    userId: string;
    startTime: string;
    endTime: string;
    activeDuration?: number; // Seconds
}

interface ActivityGraphProps {
    tasks?: Task[];
    users: User[];
    teamSessions?: Session[];
    currentTeamId?: string;
    ownedTeams?: any[];
    currentUserId?: string;
}

const AvatarLabel = (props: any) => {
    const { x, y, width, value, users } = props;
    const user = users.find((u: User) => u.displayName === value || u.email === value || u.uid === value); // Match by name/id logic

    if (!user) return null;

    return (
        <foreignObject x={x + width / 2 - 20} y={y - 50} width={40} height={40}>
            <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-background shadow-md transition-transform hover:scale-110">
                <img
                    src={getFullUrl(user.photoURL)}
                    alt={user.displayName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${user.displayName}&background=random`;
                    }}
                />
            </div>
        </foreignObject>
    );
};

export const ActivityGraph = ({ tasks = [], users, teamSessions = [], currentTeamId, ownedTeams = [], currentUserId }: ActivityGraphProps) => {
    const [timeRange, setTimeRange] = useState("weekly");
    const [mode, setMode] = useState<"tasks" | "time">("time");
    const [showTeamOnly, setShowTeamOnly] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(currentTeamId || null);
    const [openTeamSelect, setOpenTeamSelect] = useState(false);

    // Default to current team if available
    useMemo(() => {
        if (currentTeamId && !selectedTeamId) setSelectedTeamId(currentTeamId);
    }, [currentTeamId]);

    // Auto-switch mode if sessions available and no tasks, or user preference
    useMemo(() => {
        if (teamSessions.length > 0 && tasks.length === 0) setMode("time");
    }, [teamSessions, tasks]);

    const filteredData = useMemo(() => {
        const now = new Date();
        let startDate = subDays(now, 7); // Default weekly

        if (timeRange === "daily") startDate = subDays(now, 1);
        if (timeRange === "monthly") startDate = subDays(now, 30);

        // Map to store aggregated data per user
        const userMap: Record<string, {
            name: string,
            uid: string,
            // Task Fields
            Ready: number,
            InProgress: number,
            Done: number,
            // Time Fields
            ActiveHours: number
        }> = {};

        // Initialize User Map
        users.forEach(user => {
            // Filter out current user (self)
            if (currentUserId && user.uid === currentUserId) return;

            if (showTeamOnly) {
                // If using owned teams dropdown selector
                if (ownedTeams.length > 0) {
                    if (user.teamId !== selectedTeamId) return;
                } else if (currentTeamId) {
                    // Fallback to simple check
                    if (user.teamId !== currentTeamId) return;
                }
            }

            userMap[user.uid] = {
                name: user.displayName || user.email?.split('@')[0] || "Unknown",
                uid: user.uid,
                Ready: 0,
                InProgress: 0,
                Done: 0,
                ActiveHours: 0
            };
        });

        if (mode === "tasks") {
            const relevantTasks = tasks.filter(task => {
                if (!task.createdAt) return false;
                const taskDate = new Date(task.createdAt);
                return isAfter(taskDate, startDate);
            });

            relevantTasks.forEach(task => {
                if (task.assignedTo && userMap[task.assignedTo]) {
                    const statusKey = task.status === 'In Progress' ? 'InProgress' : (task.status === 'Done' || task.status === 'Completed' ? 'Done' : 'Ready');
                    userMap[task.assignedTo][statusKey] = (userMap[task.assignedTo][statusKey] || 0) + 1;
                }
            });

            return Object.values(userMap).filter(u => (u.Ready + u.InProgress + u.Done) > 0);
        } else {
            // TIME MODE
            const relevantSessions = teamSessions.filter(session => {
                const sessionDate = new Date(session.startTime);
                return isAfter(sessionDate, startDate);
            });

            relevantSessions.forEach(session => {
                if (userMap[session.userId]) {
                    let duration = 0;
                    if (session.activeDuration) {
                        duration = session.activeDuration;
                    } else {
                        // Fallback to start-end diff (less accurate for "active" but robust)
                        const start = new Date(session.startTime).getTime();
                        const end = new Date(session.endTime).getTime();
                        duration = (end - start) / 1000;
                    }

                    // Convert to Hours
                    userMap[session.userId].ActiveHours += (duration / 3600);
                }
            });

            // Round to 2 decimals
            Object.values(userMap).forEach(u => {
                u.ActiveHours = Math.round(u.ActiveHours * 100) / 100;
            });

            return Object.values(userMap).filter(u => u.ActiveHours > 0.01);
        }

    }, [tasks, users, teamSessions, timeRange, mode, showTeamOnly, currentTeamId, ownedTeams, selectedTeamId]);

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-xl font-bold">
                        {mode === 'time' ? 'Time Active by Team' : 'Tasks by Assignee'}
                    </CardTitle>
                    <CardDescription>
                        {mode === 'time' ? 'Total active hours tracked on platform' : 'User activity based on task creation/updates'}
                    </CardDescription>
                    <div className="flex gap-2 mt-2">
                        {teamSessions.length > 0 && tasks.length > 0 && (
                            <>
                                <button
                                    onClick={() => setMode('time')}
                                    className={`text-xs px-2 py-1 rounded-md border ${mode === 'time' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                                >
                                    Time
                                </button>
                                <button
                                    onClick={() => setMode('tasks')}
                                    className={`text-xs px-2 py-1 rounded-md border ${mode === 'tasks' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                                >
                                    Tasks
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {ownedTeams.length > 0 ? (
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="team-filter"
                                checked={showTeamOnly}
                                onCheckedChange={(checked) => setShowTeamOnly(checked as boolean)}
                            />
                            <Label htmlFor="team-filter" className="sr-only">Filter Team</Label>

                            <Popover open={openTeamSelect} onOpenChange={setOpenTeamSelect}>
                                <PopoverTrigger asChild>
                                    <button
                                        disabled={!showTeamOnly}
                                        role="combobox"
                                        aria-expanded={openTeamSelect}
                                        className={cn("w-[200px] justify-between flex items-center px-3 py-2 text-sm border rounded-md bg-background hover:bg-accent hover:text-accent-foreground", !showTeamOnly && "opacity-50 cursor-not-allowed")}
                                    >
                                        {selectedTeamId
                                            ? ownedTeams.find((team) => team._id === selectedTeamId)?.name
                                            : "Select team..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search team..." />
                                        <CommandEmpty>No team found.</CommandEmpty>
                                        <CommandGroup>
                                            {ownedTeams.map((team) => (
                                                <CommandItem
                                                    key={team._id}
                                                    value={team.name}
                                                    onSelect={() => {
                                                        setSelectedTeamId(team._id);
                                                        setOpenTeamSelect(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedTeamId === team._id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {team.name} ({users.filter(u => u.teamId === team._id).length})
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    ) : (
                        currentTeamId && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="team-filter"
                                    checked={showTeamOnly}
                                    onCheckedChange={(checked) => setShowTeamOnly(checked as boolean)}
                                />
                                <Label htmlFor="team-filter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    My Team ({users.filter(u => u.teamId === currentTeamId).length})
                                </Label>
                            </div>
                        )
                    )}

                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="h-[500px] pt-12">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredData} maxBarSize={100} margin={{ top: 60, right: 30, left: 0, bottom: 5 }}>
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            dy={10}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        {mode === 'tasks' ? (
                            <>
                                {/* Ready (Bottom Stack) */}
                                <Bar dataKey="Ready" stackId="a" fill="hsl(var(--muted))" radius={[0, 0, 4, 4]} />
                                {/* In Progress (Middle Stack) */}
                                <Bar dataKey="InProgress" stackId="a" fill="hsl(var(--primary))" />
                                {/* Done (Top Stack) */}
                                <Bar dataKey="Done" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="uid" content={<AvatarLabel users={users} />} />
                                </Bar>
                            </>
                        ) : (
                            <Bar dataKey="ActiveHours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="uid" content={<AvatarLabel users={users} />} />
                            </Bar>
                        )}
                    </BarChart>
                </ResponsiveContainer>

                {/* Legend Removed as requested */}
            </CardContent>
        </Card >
    );
};

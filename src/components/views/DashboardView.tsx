import { useState, useEffect } from "react";
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_BASE_URL } from "@/lib/utils";
import {
    ContributionGraph,
    ContributionGraphBlock,
    ContributionGraphCalendar,
    ContributionGraphFooter,
    ContributionGraphLegend,
    ContributionGraphTotalCount,
} from "@/components/kibo-ui/contribution-graph";
import { eachDayOfInterval, subDays, formatISO } from "date-fns";
import {
    Github,
    Users,
    GitFork,
    Star,
    GitCommit,
    GitPullRequest,
    Clock,
    ExternalLink,
    AlertCircle,
    ChevronDown,
    BookMarked,
    LogOut
} from "lucide-react";

interface GitHubStats {
    login: string;
    name: string;
    avatar_url: string;
    bio: string;
    public_repos: number;
    followers: number;
    following: number;
    html_url: string;
    created_at: string;
}

interface GitHubEvent {
    id: string;
    type: string;
    repo: string;
    created_at: string;
    payload: {
        action?: string;
        ref?: string;
        commits?: { sha: string; message: string }[];
    };
}

interface Contribution {
    date: string;
    count: number;
}

const DashboardView = ({ currentUser }: { currentUser: any }) => {
    const [stats, setStats] = useState<GitHubStats | null>(null);
    const [events, setEvents] = useState<GitHubEvent[]>([]);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const fetchGitHubData = async () => {
            if (!currentUser) return;

            if (stats) {
                setIsRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            try {
                const token = await currentUser.getIdToken();
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };

                // Fetch stats and events only if not already loaded (optimization)
                const promises: Promise<Response>[] = [
                    fetch(`${API_BASE_URL}/api/github/contributions?year=${selectedYear}`, { headers })
                ];

                if (!stats) promises.push(fetch(`${API_BASE_URL}/api/github/stats`, { headers }));
                if (events.length === 0) promises.push(fetch(`${API_BASE_URL}/api/github/events`, { headers }));

                const results = await Promise.all(promises);
                const contribRes = results[0];
                const statsRes = stats ? null : results[1];
                const eventsRes = events.length > 0 ? null : results[stats ? 1 : 2];

                if (statsRes && statsRes.ok) {
                    const statsData = await statsRes.json();
                    if (statsData.connected === false) {
                        setError("GitHub not connected. Sign in with GitHub to see your activity.");
                        setStats(null);
                    } else {
                        setStats(statsData);
                    }
                }

                if (eventsRes && eventsRes.ok) {
                    const eventsData = await eventsRes.json();
                    if (eventsData.connected !== false) {
                        setEvents(eventsData);
                    }
                }

                if (contribRes.ok) {
                    const contribData = await contribRes.json();
                    if (contribData.connected !== false) {
                        setContributions(contribData);
                    }
                }
            } catch (err) {
                console.error("Error fetching GitHub data:", err);
                setError("Failed to load GitHub data");
            } finally {
                setLoading(false);
                setIsRefreshing(false);
            }
        };

        fetchGitHubData();
    }, [currentUser, selectedYear]);

    const formatEventType = (type: string) => {
        const typeMap: Record<string, { label: string; icon: JSX.Element }> = {
            PushEvent: { label: "Pushed to", icon: <GitCommit className="h-4 w-4" /> },
            PullRequestEvent: { label: "Pull request", icon: <GitPullRequest className="h-4 w-4" /> },
            CreateEvent: { label: "Created", icon: <Star className="h-4 w-4" /> },
            IssuesEvent: { label: "Issue", icon: <AlertCircle className="h-4 w-4" /> },
            WatchEvent: { label: "Starred", icon: <Star className="h-4 w-4" /> },
            ForkEvent: { label: "Forked", icon: <GitFork className="h-4 w-4" /> },
        };
        return typeMap[type] || { label: type.replace("Event", ""), icon: <Github className="h-4 w-4" /> };
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const handleUnlink = async () => {
        if (!confirm("Are you sure you want to unlink your GitHub account?")) return;

        try {
            const token = await currentUser.getIdToken();
            await fetch(`${API_BASE_URL}/api/github/disconnect`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setStats(null);
            setEvents([]);
            setContributions([]);
            setError("GitHub disconnected.");
        } catch (err) {
            console.error("Error unlinking:", err);
        }
    };

    // Generate contribution data for the Kibo UI graph
    const contributionMap = contributions.reduce((acc, c) => {
        acc[c.date] = c.count;
        return acc;
    }, {} as Record<string, number>);

    const maxCount = Math.max(...contributions.map(c => c.count), 1);

    // Generate days for the updated selected year
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31);
    // Ensure we don't go into the future if it's the current year
    const today = new Date();
    const isCurrentYear = selectedYear === today.getFullYear();
    const end = isCurrentYear ? today : yearEnd;

    // However, GitHub style graphs usually show the full grid for the year
    const days = eachDayOfInterval({
        start: yearStart,
        end: yearEnd,
    });

    const graphData = days.map((date) => {
        const dateStr = formatISO(date, { representation: "date" });
        const count = contributionMap[dateStr] || 0;
        const level = count === 0 ? 0 : Math.ceil((count / maxCount) * 4);
        return {
            date: dateStr,
            count,
            level: Math.min(level, 4),
        };
    });

    // Calculate stats for Radar Chart
    const activityStats = [
        { subject: 'Commits', A: events.filter(e => e.type === 'PushEvent').length, fullMark: 100 },
        { subject: 'Pull Requests', A: events.filter(e => e.type === 'PullRequestEvent').length, fullMark: 100 },
        { subject: 'Code Review', A: events.filter(e => e.type === 'PullRequestReviewEvent').length, fullMark: 100 },
        { subject: 'Issues', A: events.filter(e => e.type === 'IssuesEvent').length, fullMark: 100 },
    ];

    // Get unique repositories
    const repositories = Array.from(new Set(events.map(e => e.repo))).slice(0, 5);

    // Calculate available years
    const currentYear = new Date().getFullYear();
    const startYear = stats?.created_at ? new Date(stats.created_at).getFullYear() : currentYear;
    const availableYears = Array.from({ length: currentYear - startYear + 1 }, (_, i) => currentYear - i);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            </div>
        );
    }

    if (error && !stats) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full gap-4">
                <Github className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Connect GitHub</h2>
                <p className="text-muted-foreground text-center max-w-md">{error}</p>
                <Button onClick={() => window.location.href = "/login"}>
                    Sign in with GitHub
                </Button>
            </div>
        );
    }



    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full max-w-7xl mx-auto">
            {/* Profile Header */}
            {stats && (
                <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 bg-card/40 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-6">
                            <Avatar className="h-20 w-20 border-4 border-primary/20">
                                <AvatarImage src={stats.avatar_url} />
                                <AvatarFallback className="text-2xl">{stats.login?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold">{stats.name || stats.login}</h1>
                                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                                        <Github className="h-3 w-3 mr-1" />
                                        @{stats.login}
                                    </Badge>
                                </div>
                                {stats.bio && <p className="text-muted-foreground mt-1">{stats.bio}</p>}
                                <div className="flex items-center gap-6 mt-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span><strong>{stats.followers}</strong> followers</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span><strong>{stats.following}</strong> following</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <GitFork className="h-4 w-4 text-muted-foreground" />
                                        <span><strong>{stats.public_repos}</strong> repos</span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="outline" asChild className="bg-background/50">
                                <a href={stats.html_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Profile
                                </a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Contribution Chart Section */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className={`flex-1 bg-card/50 border rounded-xl p-4 shadow-sm transition-opacity duration-200 ${isRefreshing ? 'opacity-60 pointer-events-none' : ''}`}>
                    <ContributionGraph data={graphData} blockSize={12} blockMargin={3} blockRadius={2} className="w-full">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ContributionGraphTotalCount className="text-lg font-semibold" />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
                                        Contribution settings
                                        <ChevronDown className="ml-1 h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleUnlink} className="text-destructive focus:text-destructive cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Unlink GitHub
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Graph */}
                        <div className="overflow-x-auto">
                            <ContributionGraphCalendar>
                                {({ activity, dayIndex, weekIndex }) => (
                                    <ContributionGraphBlock
                                        key={`${weekIndex}-${dayIndex}`}
                                        activity={activity}
                                        dayIndex={dayIndex}
                                        weekIndex={weekIndex}
                                    />
                                )}
                            </ContributionGraphCalendar>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-2 pt-2 text-xs text-muted-foreground">
                            <a href="#" className="hover:text-primary hover:underline">Learn how we count contributions</a>
                            <ContributionGraphLegend />
                        </div>
                    </ContributionGraph>
                </div>

                {/* Year Selector */}
                <div className="w-full md:w-32 flex flex-col gap-2">
                    {availableYears.map((year) => (
                        <Button
                            key={year}
                            type="button"
                            variant={selectedYear === year ? "default" : "ghost"}
                            className={`w-full justify-start ${selectedYear === year ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-muted-foreground hover:text-foreground"}`}
                            onClick={() => setSelectedYear(year)}
                            disabled={isRefreshing}
                        >
                            {year}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Activity Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card/50 border rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BookMarked className="h-5 w-5" />
                        Activity overview
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                                <GitCommit className="h-4 w-4" />
                                Contributed to
                            </p>
                            <div className="space-y-2">
                                {repositories.map((repo, idx) => (
                                    <a key={idx}
                                        href={`https://github.com/${repo}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block text-primary hover:underline text-sm font-medium pl-6"
                                    >
                                        {repo}
                                    </a>
                                ))}
                                {repositories.length === 0 && (
                                    <p className="text-sm text-muted-foreground pl-6">No recent repositories found</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card/50 border rounded-xl p-6 shadow-sm flex items-center justify-center min-h-[300px]">
                    <ResponsiveContainer width="100%" height={300}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={activityStats}>
                            <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                            <Radar
                                name="Activity"
                                dataKey="A"
                                stroke="hsl(var(--primary))"
                                fill="hsl(var(--primary))"
                                fillOpacity={0.3}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Activity
                    </CardTitle>
                    <CardDescription>Your latest GitHub events</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {events.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">No recent activity</p>
                        ) : (
                            events.slice(0, 10).map(event => {
                                const { label, icon } = formatEventType(event.type);
                                return (
                                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="mt-1 p-2 rounded-full bg-muted">{icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium">{label}</span>
                                                <a
                                                    href={`https://github.com/${event.repo}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline truncate"
                                                >
                                                    {event.repo}
                                                </a>
                                            </div>
                                            {event.payload.commits && event.payload.commits.length > 0 && (
                                                <div className="mt-1 space-y-1">
                                                    {event.payload.commits.map((commit, idx) => (
                                                        <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                                                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{commit.sha}</code>
                                                            <span className="truncate">{commit.message}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {event.payload.ref && (
                                                <p className="text-sm text-muted-foreground">
                                                    Branch: <code className="bg-muted px-1 py-0.5 rounded">{event.payload.ref.replace('refs/heads/', '')}</code>
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatTimeAgo(event.created_at)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardView;

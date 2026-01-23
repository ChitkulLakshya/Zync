import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
    Video,
    Calendar,
    Clock,
    Link as LinkIcon,
    MoreHorizontal,
    Plus,
    Search,
    CheckCircle2,
    Circle,
    Users,
    Building2,
    Loader2,
    Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getFullUrl, getUserInitials, getUserName, API_BASE_URL } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface MeetViewProps {
    currentUser: User | null;
    usersList: any[];
    userStatuses?: Record<string, any>;
}

interface Meeting {
    _id: string;
    title: string;
    status: 'scheduled' | 'live' | 'ended' | 'cancelled';
    startTime: string;
    endTime?: string;
    meetLink: string;
    participants: any[];
    organizerName: string;
    organizerId: string;
}

interface Team {
    _id: string;
    name: string;
    type?: string;
    members: string[];
    ownerId: string;
}

export default function MeetView({ currentUser, usersList, userStatuses = {} }: MeetViewProps) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

    // Real Data State
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleData, setScheduleData] = useState({
        title: "",
        date: "",
        time: ""
    });

    // Team Selection State
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoadingTeams, setIsLoadingTeams] = useState(false);
    const [isTeamSelectDialogOpen, setIsTeamSelectDialogOpen] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    // Fetch Teams
    const fetchTeams = async () => {
        if (!currentUser?.uid) return;
        setIsLoadingTeams(true);
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/teams/mine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTeams(data);
            }
        } catch (err) {
            console.error("Failed to fetch teams", err);
        } finally {
            setIsLoadingTeams(false);
        }
    };

    // Fetch Meetings
    useEffect(() => {
        if (currentUser?.uid) {
            fetchMeetings();
            fetchTeams();
            // Poll for updates every 30s
            const interval = setInterval(fetchMeetings, 30000);
            return () => clearInterval(interval);
        }
    }, [currentUser]);

    const fetchMeetings = async () => {
        if (!currentUser?.uid) return;
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/meet/user/${currentUser.uid}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMeetings(data);
            }
        } catch (err) {
            console.error("Failed to fetch meetings", err);
        }
    };

    const handleDeleteMeeting = async (meetingId: string) => {
        if (!currentUser?.uid) return;
        
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/meet/${meetingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                toast({ title: "Deleted", description: "Meeting removed successfully." });
                setMeetings(prev => prev.filter(m => m._id !== meetingId));
            } else {
                const data = await res.json();
                throw new Error(data.message || "Failed to delete meeting");
            }
        } catch (err: any) {
            console.error("Failed to delete meeting", err);
            toast({ title: "Error", description: err.message || "Could not delete meeting.", variant: "destructive" });
        }
    };

    const filteredUsers = usersList
        .filter(u => u.uid !== currentUser?.uid)
        .filter(u =>
            getUserName(u).toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const toggleInviteUser = (uid: string) => {
        setInvitedUserIds(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const handleStartInstantMeeting = async (teamId: string | null = null, customReceiverIds: string[] | null = null) => {
        setIsGenerating(true);
        try {
            // Get team members if a team is selected, or use custom receiver IDs
            let receiverIds: string[] = [];
            if (customReceiverIds && customReceiverIds.length > 0) {
                receiverIds = customReceiverIds;
            } else if (teamId) {
                const selectedTeam = teams.find(t => t._id === teamId);
                if (selectedTeam) {
                    receiverIds = selectedTeam.members.filter(uid => uid !== currentUser?.uid);
                }
            }

            // 1. Open Placeholder Window
            const newWindow = window.open("", "_blank");
            if (newWindow) {
                newWindow.document.write(`
          <style>
            body { background: #111; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            .loader { border: 2px solid #333; border-top: 2px solid #2563eb; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin-bottom: 20px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 { font-weight: 500; font-size: 1.25rem; }
          </style>
          <div class="loader"></div>
          <h2>Creating your secure meeting...</h2>
        `);
            }

            // 2. Call Backend
            const idToken = await currentUser?.getIdToken();
            const body: any = {
                senderId: currentUser?.uid,
                receiverIds: receiverIds,
            };

            const res = await fetch(`${API_BASE_URL}/api/meet/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (data.meetingUrl) {
                if (newWindow) newWindow.location.href = data.meetingUrl;
                else window.open(data.meetingUrl, "_blank");

                const teamName = teamId ? teams.find(t => t._id === teamId)?.name : null;
                toast({ 
                    title: "Meeting Started", 
                    description: teamName ? `Invites sent to ${teamName} team members.` : "Instant meeting ready." 
                });
                setInvitedUserIds([]);
                setIsInviteDialogOpen(false);
                setIsTeamSelectDialogOpen(false);
                setSelectedTeamId(null);
                fetchMeetings(); // Refresh list immediately
            } else {
                if (newWindow) newWindow.close();
                throw new Error(data.message || "Failed to create meeting");
            }

        } catch (error: any) {
            console.error("Meeting error:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleScheduleMeeting = async () => {
        if (!scheduleData.title || !scheduleData.date || !scheduleData.time) {
            toast({ title: "Validation Error", description: "Please fill in all fields.", variant: "destructive" });
            return;
        }

        setIsGenerating(true);
        try {
            const idToken = await currentUser?.getIdToken();
            // Combine date and time
            const startTime = new Date(`${scheduleData.date}T${scheduleData.time}`);

            const res = await fetch(`${API_BASE_URL}/api/meet/schedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    title: scheduleData.title,
                    description: "Scheduled via Dashboard",
                    startTime: startTime.toISOString(),
                    organizerId: currentUser?.uid,
                    participantIds: invitedUserIds
                })
            });

            if (res.ok) {
                toast({ title: "Scheduled", description: "Meeting scheduled successfully." });
                setIsScheduling(false);
                setScheduleData({ title: "", date: "", time: "" });
                setInvitedUserIds([]);
                fetchMeetings();
            } else {
                throw new Error("Failed to schedule");
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not schedule meeting.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case "live":
                return (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 rounded-full border border-red-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Live</span>
                    </div>
                );
            case "scheduled":
                return (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Scheduled</span>
                    </div>
                );
            case "ended":
                return (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800 rounded-full border border-zinc-700">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Ended</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const formatMeetingTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const day = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

        // Check if it's vastly future
        if (date.getTime() - today.getTime() > 7 * 24 * 60 * 60 * 1000) {
            return `${day}, ${time}`;
        }

        return isToday ? `Today, ${time}` : `${day}, ${time}`;
    };

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-12 h-full flex flex-col">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Meet</h1>
                    <p className="text-zinc-400 max-w-lg">
                        Start or schedule high-quality video meetings with your team.
                        Secure, encrypted, and integrated with your workflow.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Dialog open={isScheduling} onOpenChange={setIsScheduling}>
                        <DialogContent className="sm:max-w-[425px] bg-[#0F0F10] border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle>Schedule Meeting</DialogTitle>
                                <DialogDescription>Set a date and time for your team sync.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Meeting Title</Label>
                                    <Input
                                        placeholder="e.g. Weekly Sync"
                                        className="bg-white/5 border-white/10 text-white"
                                        value={scheduleData.title}
                                        onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Date</Label>
                                        <Input
                                            type="date"
                                            className="bg-white/5 border-white/10 text-white block"
                                            value={scheduleData.date}
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Time</Label>
                                        <Input
                                            type="time"
                                            className="bg-white/5 border-white/10 text-white block"
                                            value={scheduleData.time}
                                            onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Invite Participants</Label>
                                    <div className="max-h-[150px] overflow-y-auto border border-white/10 rounded-md p-2 space-y-2">
                                        {usersList.filter(u => u.uid !== currentUser?.uid).map(user => (
                                            <div key={user.uid} className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={invitedUserIds.includes(user.uid)}
                                                    onCheckedChange={() => toggleInviteUser(user.uid)}
                                                    className="border-zinc-600 data-[state=checked]:bg-blue-600"
                                                />
                                                <span className="text-sm">{getUserName(user)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsScheduling(false)} className="border-white/10 text-white hover:bg-white/5">Cancel</Button>
                                <Button onClick={handleScheduleMeeting} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
                                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
                                    Schedule
                                </Button>
                            </DialogFooter>
                        </DialogContent>

                        <Button
                            variant="outline"
                            className="h-12 px-6 border-white/10 hover:bg-white/5 text-white hover:text-white"
                            onClick={() => setIsScheduling(true)}
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule
                        </Button>
                    </Dialog>

                    {/* Team Selection Dialog for Instant Meeting */}
                    <Dialog open={isTeamSelectDialogOpen} onOpenChange={(open) => {
                        setIsTeamSelectDialogOpen(open);
                        if (!open) setSelectedTeamId(null);
                    }}>
                        <DialogContent className="sm:max-w-[480px] bg-[#0F0F10] border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Video className="w-5 h-5 text-blue-400" />
                                    Start Instant Meeting
                                </DialogTitle>
                                <DialogDescription>
                                    Select a team to invite all members, or start a meeting alone.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                {isLoadingTeams ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                                    </div>
                                ) : teams.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Building2 className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                                        <p className="text-zinc-400">You're not a member of any teams yet.</p>
                                        <p className="text-zinc-500 text-sm mt-1">Create or join a team to invite members.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs uppercase tracking-wider">Select a Team</Label>
                                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                                            {teams.map((team) => {
                                                const memberCount = team.members.filter(uid => uid !== currentUser?.uid).length;
                                                const isSelected = selectedTeamId === team._id;
                                                const teamMembers = usersList.filter(u => team.members.includes(u.uid) && u.uid !== currentUser?.uid);

                                                return (
                                                    <div
                                                        key={team._id}
                                                        onClick={() => setSelectedTeamId(isSelected ? null : team._id)}
                                                        className={cn(
                                                            "p-4 rounded-xl border cursor-pointer transition-all",
                                                            isSelected 
                                                                ? "bg-blue-500/10 border-blue-500/30" 
                                                                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                                                    isSelected ? "bg-blue-500/20" : "bg-white/5"
                                                                )}>
                                                                    <Users className={cn("w-5 h-5", isSelected ? "text-blue-400" : "text-zinc-400")} />
                                                                </div>
                                                                <div>
                                                                    <h4 className={cn("font-medium", isSelected ? "text-blue-200" : "text-white")}>
                                                                        {team.name}
                                                                    </h4>
                                                                    <p className="text-xs text-zinc-500">
                                                                        {memberCount} member{memberCount !== 1 ? 's' : ''} will receive invite
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className={cn(
                                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                                isSelected ? "border-blue-500 bg-blue-500" : "border-zinc-600"
                                                            )}>
                                                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Team Members Preview */}
                                                        {isSelected && teamMembers.length > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex -space-x-2">
                                                                        {teamMembers.slice(0, 5).map((user) => (
                                                                            <Avatar key={user.uid} className="w-7 h-7 border-2 border-[#0F0F10]">
                                                                                <AvatarImage src={getFullUrl(user.photoURL)} />
                                                                                <AvatarFallback className="bg-zinc-800 text-[10px]">
                                                                                    {getUserInitials(user)}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        ))}
                                                                        {teamMembers.length > 5 && (
                                                                            <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-[#0F0F10] flex items-center justify-center text-[10px] text-zinc-400">
                                                                                +{teamMembers.length - 5}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-xs text-zinc-500">
                                                                        {teamMembers.map(u => getUserName(u).split(' ')[0]).slice(0, 3).join(', ')}
                                                                        {teamMembers.length > 3 && ` +${teamMembers.length - 3} more`}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="flex gap-2 sm:gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        setIsTeamSelectDialogOpen(false);
                                        handleStartInstantMeeting(null);
                                    }} 
                                    className="border-white/10 text-white hover:bg-white/5 flex-1"
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Start Alone
                                </Button>
                                <Button 
                                    onClick={() => handleStartInstantMeeting(selectedTeamId)} 
                                    disabled={isGenerating || !selectedTeamId}
                                    className="bg-blue-600 hover:bg-blue-700 flex-1"
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                                    Invite Team
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button
                        size="lg"
                        className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
                        onClick={() => setIsTeamSelectDialogOpen(true)}
                        disabled={isGenerating}
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-5 h-5 mr-2" />}
                        Start Instant Meeting
                    </Button>
                </div>
            </div>

            {/* Recent Meetings Grid */}
            <section className="space-y-4 flex-1">
                <h2 className="text-lg font-semibold text-white">Recent Meetings</h2>
                {meetings.length === 0 ? (
                    <div className="w-full h-48 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-zinc-500">
                        <Video className="w-8 h-8 mb-2 opacity-50" />
                        <p>No recent meetings found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {meetings.map((meeting) => (
                            <div
                                key={meeting._id}
                                className="group relative flex flex-col justify-between p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 min-h-[180px]"
                            >
                                {/* Top Row: Badge & Meta */}
                                <div className="flex items-start justify-between mb-4">
                                    <StatusBadge status={meeting.status} />
                                    <span className="text-xs font-medium text-zinc-500">{formatMeetingTime(meeting.startTime)}</span>
                                </div>

                                {/* Content */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">
                                        {meeting.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                                        <Users className="w-3.5 h-3.5" />
                                        <span>Organized by {meeting.organizerName || 'Unknown'}</span>
                                    </div>
                                </div>

                                {/* Bottom Row: Avatars & Actions */}
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex -space-x-2">
                                        {meeting.participants?.map((p: any, i: number) => (
                                            <Avatar key={i} className="w-7 h-7 border-2 border-[#0F0F10] ring-1 ring-white/5">
                                                <AvatarImage src={getFullUrl(usersList.find(u => u.uid === p.uid)?.photoURL)} />
                                                <AvatarFallback className="text-[9px] bg-zinc-800">{p.name ? p.name.substring(0, 2).toUpperCase() : 'U'}</AvatarFallback>
                                            </Avatar>
                                        ))}
                                        {meeting.participants && meeting.participants.length > 3 && (
                                            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800 border-2 border-[#0F0F10] text-[9px] text-zinc-400">
                                                +{meeting.participants.length - 3}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Delete button - only show for organizer and ended meetings */}
                                        {meeting.organizerId === currentUser?.uid && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('Are you sure you want to delete this meeting?')) {
                                                        handleDeleteMeeting(meeting._id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 text-xs text-zinc-400 hover:text-white"
                                            onClick={() => {
                                                navigator.clipboard.writeText(meeting.meetLink);
                                                toast({ title: "Link Copied", description: "Meeting link copied to clipboard." });
                                            }}
                                        >
                                            Copy Link
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-8 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/5"
                                            onClick={() => {
                                                if (meeting.meetLink) {
                                                    const newWindow = window.open(meeting.meetLink, '_blank');
                                                    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                                                        // Popup was blocked, copy link instead
                                                        navigator.clipboard.writeText(meeting.meetLink);
                                                        toast({ 
                                                            title: "Popup Blocked", 
                                                            description: "Meeting link copied to clipboard. Please allow popups or paste the link manually.",
                                                            variant: "destructive"
                                                        });
                                                    }
                                                } else {
                                                    toast({ 
                                                        title: "Error", 
                                                        description: "Meeting link not available.",
                                                        variant: "destructive"
                                                    });
                                                }
                                            }}
                                        >
                                            Join
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Quick Invite Section */}
            <section className="space-y-4 mt-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Quick Invite</h2>
                    {invitedUserIds.length > 0 && (
                        <Button
                            size="sm"
                            className="bg-blue-600 text-white hover:bg-blue-700 animate-in fade-in zoom-in duration-200"
                            onClick={() => handleStartInstantMeeting(null, invitedUserIds)}
                            disabled={isGenerating}
                        >
                            {isGenerating ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Video className="w-3 h-3 mr-2" />}
                            Start with {invitedUserIds.length} People
                        </Button>
                    )}
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden p-1">
                    {/* Search Bar */}
                    <div className="relative px-3 py-2 border-b border-white/5">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search people to invite..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 h-10 outline-none"
                        />
                    </div>

                    {/* Users List */}
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500 text-sm">No users found.</div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <tbody>
                                    {filteredUsers.map((user) => {
                                        const isSelected = invitedUserIds.includes(user.uid);
                                        const status = userStatuses[user.uid]?.state || 'offline';

                                        return (
                                            <tr
                                                key={user.uid}
                                                className={cn(
                                                    "group border-b border-white/[0.02] last:border-none transition-colors cursor-pointer",
                                                    isSelected ? "bg-blue-500/5 hover:bg-blue-500/10" : "hover:bg-white/[0.02]"
                                                )}
                                                onClick={() => toggleInviteUser(user.uid)}
                                            >
                                                <td className="py-3 px-4 w-12">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        className={cn(
                                                            "border-zinc-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600",
                                                            isSelected ? "opacity-100" : "opacity-30 group-hover:opacity-100"
                                                        )}
                                                    />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9 border border-white/10">
                                                            <AvatarImage src={getFullUrl(user.photoURL)} />
                                                            <AvatarFallback className="bg-zinc-800 text-zinc-400">{getUserInitials(user)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className={cn("font-medium", isSelected ? "text-blue-200" : "text-zinc-200")}>
                                                                {getUserName(user)}
                                                            </div>
                                                            <div className="text-xs text-zinc-500">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                                                                status === 'away' ? "bg-yellow-500" : "bg-zinc-700"
                                                        )} />
                                                        <span className="text-xs text-zinc-500 capitalize">{status}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </section>

        </div>
    );
}

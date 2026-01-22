import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, MessageSquare, ChevronDown, ChevronRight, Star, Plus, Check } from "lucide-react";
import ChatView from "./ChatView";
import { getFullUrl, getUserName, getUserInitials, API_BASE_URL } from "@/lib/utils";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";

interface ChatLayoutProps {
    users: any[];
    selectedUser: any;
    userStatuses: Record<string, any>;
    onSelectUser: (user: any) => void;
    isPreview?: boolean;
    currentUserData?: any;
}

const UserListItem = ({ user, selectedUser, userStatuses, onSelectUser, isPreview }: any) => {
    const status = !isPreview && userStatuses[user.uid]
        ? userStatuses[user.uid].status
        : user.status;
    const isSelected = selectedUser?.uid === user.uid;

    return (
        <div
            key={user._id || user.id}
            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${isSelected
                ? 'bg-primary/5 dark:bg-primary/10'
                : 'hover:bg-secondary/40'
                }`}
            onClick={() => onSelectUser(user)}
        >
            <div className="relative shrink-0">
                <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover:ring-border transition-all">
                    <AvatarImage src={getFullUrl(user.photoURL)} referrerPolicy="no-referrer" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                        {user.avatar || getUserInitials(user)}
                    </AvatarFallback>
                </Avatar>
                {status === "online" && (
                    <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-background bg-green-500 shadow-sm" />
                )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className={`font-semibold truncate ${isSelected ? 'text-foreground' : 'text-foreground/90'}`}>
                    {getUserName(user)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate max-w-[140px]">
                        {status === "online" ? "Active now" : user.email}
                    </span>
                </div>
            </div>
            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mr-1" />}
        </div>
    );
};

const ChatLayout = ({ users, selectedUser, userStatuses, onSelectUser, isPreview, currentUserData }: ChatLayoutProps) => {
    const [myTeamsOpen, setMyTeamsOpen] = useState(true);
    const [closeFriendsOpen, setCloseFriendsOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [localCloseFriendsIds, setLocalCloseFriendsIds] = useState<string[]>([]);

    useEffect(() => {
        if (currentUserData?.closeFriends) {
            setLocalCloseFriendsIds(currentUserData.closeFriends);
        }
    }, [currentUserData]);

    const toggleCloseFriend = async (friendId: string) => {
        if (isPreview) return;

        // Optimistic update
        const isCurrentlyCloseFriend = localCloseFriendsIds.includes(friendId);
        let newIds;
        if (isCurrentlyCloseFriend) {
            newIds = localCloseFriendsIds.filter(id => id !== friendId);
        } else {
            newIds = [...localCloseFriendsIds, friendId];
        }
        setLocalCloseFriendsIds(newIds);

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/api/users/close-friends/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ friendId })
            });

            if (!res.ok) {
                // Revert on error
                setLocalCloseFriendsIds(localCloseFriendsIds);
                console.error("Failed to toggle close friend");
            }
        } catch (error) {
            console.error("Error toggling close friend:", error);
            setLocalCloseFriendsIds(localCloseFriendsIds);
        }
    };

    const isCloseFriend = (uid: string) => localCloseFriendsIds.includes(uid);

    const filteredUsers = users.filter(user => 
        (getUserName(user).toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const closeFriends = filteredUsers.filter(u => isCloseFriend(u.uid));
    const myTeams = filteredUsers.filter(u => !isCloseFriend(u.uid));

    return (
        <div className="flex h-full w-full">
            {/* Chat Sidebar (User List) */}
            <div className="w-80 shrink-0 border-r border-border/40 flex flex-col bg-background">
                <div className="p-5 flex flex-col gap-4 border-b border-border/40">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Messages</h2>
                        <MessageSquare className="w-5 h-5 opacity-70" />
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                        <Input
                            placeholder="Search..."
                            className="pl-9 bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                    {users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-muted-foreground animate-in fade-in-50">
                            <p className="font-medium">No users found</p>
                            <p className="text-xs mt-1 opacity-70">Invite your team to chat</p>
                        </div>
                    ) : (
                        <>
                             {/* My Teams Section */}
                             <div className="mb-2">
                                <div 
                                    className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => setMyTeamsOpen(!myTeamsOpen)}
                                >
                                    <span>My Teams</span>
                                    {myTeamsOpen ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                                </div>
                                {myTeamsOpen && (
                                     <div className="space-y-1 transition-all duration-300 ease-in-out">
                                        {myTeams.map(user => (
                                            <UserListItem 
                                                key={user._id || user.uid} 
                                                user={user} 
                                                selectedUser={selectedUser} 
                                                userStatuses={userStatuses} 
                                                onSelectUser={onSelectUser} 
                                                isPreview={isPreview} 
                                            />
                                        ))}
                                        {myTeams.length === 0 && <p className="text-xs text-center py-2 text-muted-foreground opacity-50">No team members found.</p>}
                                     </div>
                                )}
                             </div>

                             {/* Close Friends Section */}
                             <div className="mb-2">
                                <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-muted-foreground">
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors flex-1"
                                        onClick={() => setCloseFriendsOpen(!closeFriendsOpen)}
                                    >
                                        <span className="flex items-center gap-2"><Star className="w-3.5 h-3.5 fill-current"/> Close Friends</span>
                                        {closeFriendsOpen ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                                    </div>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                             <button className="p-1 hover:bg-secondary rounded-full transition-colors" title="Add Close Friends">
                                                <Plus className="w-4 h-4" />
                                             </button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Manage Close Friends</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-2 max-h-[60vh] overflow-y-auto mt-2 pr-1">
                                                {users.map(user => {
                                                    const isSelected = isCloseFriend(user.uid);
                                                    return (
                                                        <div key={user.uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/20 border border-transparent hover:border-border/30">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="w-8 h-8">
                                                                    <AvatarImage src={getFullUrl(user.photoURL)} />
                                                                    <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium">{getUserName(user)}</span>
                                                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => toggleCloseFriend(user.uid)}
                                                                className={`p-1.5 rounded-full transition-colors ${isSelected 
                                                                    ? 'bg-primary text-primary-foreground hover:opacity-90' 
                                                                    : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'}`}
                                                            >
                                                                {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                                {users.length === 0 && (
                                                    <p className="text-center text-sm text-muted-foreground py-4">No users found.</p>
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                {closeFriendsOpen && (
                                    <div className="space-y-1 transition-all duration-300 ease-in-out">
                                        {closeFriends.map(user => (
                                            <UserListItem 
                                                key={user._id || user.uid} 
                                                user={user} 
                                                selectedUser={selectedUser} 
                                                userStatuses={userStatuses} 
                                                onSelectUser={onSelectUser} 
                                                isPreview={isPreview} 
                                            />
                                        ))}
                                        {closeFriends.length === 0 && <p className="text-xs text-center py-2 text-muted-foreground opacity-50">No close friends yet.</p>}
                                    </div>
                                )}
                             </div>
                        </>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedUser ? (
                    <ChatView
                        selectedUser={{
                            ...selectedUser,
                            status: userStatuses[selectedUser.uid]?.status || selectedUser.status || 'offline'
                        }}
                        currentUserData={currentUserData}
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
};

export default ChatLayout;

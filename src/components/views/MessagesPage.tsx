import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Phone, Video, MoreVertical, FileText, Link as LinkIcon, Image as ImageIcon, ChevronLeft, Send, UserPlus, Lock, Star } from "lucide-react";
import ChatView from "./ChatView"; // Re-using existing ChatView for core logic
import { getFullUrl, getUserName, getUserInitials, API_BASE_URL } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

interface MessagesPageProps {
    users: any[];
    currentUser: any;
    currentUserData?: any;
    userStatuses: Record<string, any>;
    onNavigateBack: () => void;
}

const MessagesPage = ({ users: teamUsers, currentUser, currentUserData: propUserData, userStatuses, onNavigateBack }: MessagesPageProps) => {
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [requestMessage, setRequestMessage] = useState("");
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const { toast } = useToast();

    const [allContacts, setAllContacts] = useState<any[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);

    const [userData, setUserData] = useState<any>(propUserData || null);
    const [localCloseFriendsIds, setLocalCloseFriendsIds] = useState<string[]>([]);

    useEffect(() => {
        const fetchMe = async () => {
             if (propUserData) {
                setUserData(propUserData);
                setLocalCloseFriendsIds(propUserData.closeFriends || []);
             } else if (currentUser) {
                 try {
                    const token = await currentUser.getIdToken();
                    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
                         headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setUserData(data);
                        setLocalCloseFriendsIds(data.closeFriends || []);
                    }
                 } catch (e) {
                     console.error("Error fetching user data", e);
                 }
             }
        };
        fetchMe();
    }, [currentUser, propUserData]);

    const toggleCloseFriend = async () => {
        if (!selectedUser || !currentUser) return;
        const friendId = selectedUser.uid;
        const isClose = localCloseFriendsIds.includes(friendId);
        
        // Optimistic update
        if (isClose) {
            setLocalCloseFriendsIds(prev => prev.filter(id => id !== friendId));
        } else {
             setLocalCloseFriendsIds(prev => [...prev, friendId]);
        }
        
        try {
             const token = await currentUser.getIdToken();
             const res = await fetch(`${API_BASE_URL}/api/users/close-friends/toggle`, {
                 method: 'POST',
                 headers: { 
                     'Content-Type': 'application/json',
                     Authorization: `Bearer ${token}` 
                 },
                 body: JSON.stringify({ friendId })
             });

             if (res.ok) {
                 const data = await res.json();
                 toast({ description: data.message });
             } else {
                 // Revert
                 setLocalCloseFriendsIds(prev => isClose ? [...prev, friendId] : prev.filter(id => id !== friendId));
                 toast({ description: "Failed to update close friend status", variant: "destructive" });
             }
        } catch (error) {
            console.error(error);
             setLocalCloseFriendsIds(prev => isClose ? [...prev, friendId] : prev.filter(id => id !== friendId));
             toast({ description: "Error updating close friend status", variant: "destructive" });
        }
    }

    const isCloseFriend = (uid: string) => localCloseFriendsIds.includes(uid);

    // Fetch all contacts (Teams + Connections)
    useEffect(() => {
        const fetchContacts = async () => {
            if (!currentUser) return;
            try {
                const token = await currentUser.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setAllContacts(data);
                }
            } catch (error) {
                console.error("Error fetching contacts:", error);
            } finally {
                setLoadingContacts(false);
            }
        };
        fetchContacts();
    }, [currentUser]);

    // Fetch pending requests
    const fetchRequests = async () => {
        if (!currentUser) return;
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter pending requests
                const requests = (data.chatRequests || []).filter((r: any) => r.status === 'pending');
                setPendingRequests(requests);
            }
        } catch (error) {
            console.error("Error fetching requests:", error);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [currentUser]);

    const handleRespond = async (senderId: string, status: 'accepted' | 'rejected') => {
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/users/chat-request/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ senderId, status })
            });

            if (res.ok) {
                toast({ title: `Request ${status}` });
                fetchRequests(); // Refresh list

                // Refresh contacts list too if accepted
                if (status === 'accepted') {
                    // Quick re-fetch of contacts
                    const token = await currentUser.getIdToken();
                    const contactsRes = await fetch(`${API_BASE_URL}/api/users`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (contactsRes.ok) {
                        setAllContacts(await contactsRes.json());
                    }
                    setSelectedUser(null);
                } else {
                    setSelectedUser(null);
                }
            } else {
                toast({ title: "Error", description: "Failed to respond", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to respond", variant: "destructive" });
        }
    };

    // Filter Contacts based on search
    // We use allContacts for the main list, effectively merging team and external
    const filteredContacts = allContacts.filter(user =>
        user.uid !== currentUser?.uid && (
            getUserName(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    // Derived list for display
    const showSearchResults = searchTerm.trim().length > 1;

    // Check if selected user is in the same team (for UI distinction)
    const isSameTeam = (user: any) => {
        if (!user || !currentUser) return false;
        // Compare with the props.users (which represent the current team members view)
        return teamUsers.some(u => u.uid === user.uid);
    };

    const isKnownContact = (user: any) => {
        return allContacts.some(c => c.uid === user.uid);
    };

    const handleSendRequest = async () => {
        if (!selectedUser || !requestMessage.trim()) return;
        setIsSendingRequest(true);
        try {
            const token = await currentUser.getIdToken();

            // 1. Send Request API
            const response = await fetch(`${API_BASE_URL}/api/users/chat-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipientId: selectedUser.uid,
                    message: requestMessage
                })
            });

            if (!response.ok) throw new Error('Failed to send request');

            // 2. Optimistically start the chat in Firestore
            const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
            await addDoc(collection(db, "messages"), {
                chatId,
                text: requestMessage,
                senderId: currentUser.uid,
                senderName: currentUser.displayName || "Unknown",
                receiverId: selectedUser.uid,
                timestamp: serverTimestamp(),
                seen: false,
                delivered: false,
                type: 'request'
            });

            toast({ title: "Request Sent", description: "User has been notified via email." });
            setRequestMessage("");
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to send request.", variant: "destructive" });
        } finally {
            setIsSendingRequest(false);
        }
    };

    // Helper: Is this a REQUEST user?
    const isRequestUser = (user: any) => {
        return pendingRequests.some(r => r.senderId === user.uid || r.senderId === user._id); // Handle both formats if mapped
    };

    return (
        <div className="flex h-full w-full bg-background overflow-hidden relative">
            {/* LEFT SIDEBAR */}
            <div className="w-80 shrink-0 border-r border-border flex flex-col bg-background">
                {/* Header */}
                <div className="p-4 border-b border-border/40 space-y-4 flex-none">
                    <div className="flex items-center">
                        <Button variant="ghost" onClick={onNavigateBack} className="gap-2 pl-0 hover:bg-transparent hover:text-primary -ml-2" title="Back to Team">
                            <ChevronLeft className="w-5 h-5" />
                            <span className="font-semibold text-lg">Back</span>
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                        <Input
                            placeholder="Search people..."
                            className="pl-9 pr-10 bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl h-10 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className={`absolute right-3 top-2.5 transition-opacity duration-200 ${isSearching ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/50 border-t-primary"></div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin scrollbar-thumb-secondary">

                    {/* REQUESTS SECTION */}
                    {pendingRequests.length > 0 && !searchTerm && (
                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
                                Requests <span className="text-[10px] bg-red-500 text-white px-1.5 rounded-full">{pendingRequests.length}</span>
                            </h3>
                            {pendingRequests.map(req => (
                                <div
                                    key={req.senderId}
                                    onClick={() => setSelectedUser({
                                        uid: req.senderId,
                                        displayName: req.senderName,
                                        email: req.senderEmail,
                                        photoURL: req.senderPhoto,
                                        isRequest: true, // Marker
                                        requestMessage: req.message
                                    })}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${selectedUser?.uid === req.senderId ? 'bg-primary/10' : 'hover:bg-secondary/40'}`}
                                >
                                    <Avatar className="w-10 h-10 border border-border/50">
                                        <AvatarImage src={getFullUrl(req.senderPhoto)} referrerPolicy="no-referrer" />
                                        <AvatarFallback className="text-xs">{req.senderName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold truncate text-foreground">{req.senderName}</span>
                                            <span className="text-[10px] text-blue-500 font-medium">New</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate opacity-80">wants to connect</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Global Search Results */}
                    {showSearchResults && (
                        <div>
                            <div className="flex items-center justify-between px-3 mb-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Global Search</h3>
                            </div>

                            {searchResults.length > 0 ? (
                                searchResults.map(user => (
                                    <div
                                        key={user.uid}
                                        onClick={() => setSelectedUser(user)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${selectedUser?.uid === user.uid ? 'bg-primary/10' : 'hover:bg-secondary/40'}`}
                                    >
                                        <Avatar className="w-10 h-10 border border-border/50">
                                            <AvatarImage src={getFullUrl(user.photoURL)} referrerPolicy="no-referrer" />
                                            <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold truncate text-foreground">{getUserName(user)}</span>
                                                {/* Badge for Non-Team */}
                                                {!teamUsers.find(u => u.uid === user.uid) && (
                                                    <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">External</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate opacity-80">{user.email}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                !isSearching && <p className="text-xs text-center text-muted-foreground p-2">No users found.</p>
                            )}
                        </div>
                    )}

                    {/* Team Members / All Contacts */}
                    <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Contacts</h3>
                        {filteredContacts.length > 0 ? (
                            filteredContacts.map((user) => {
                                const status = userStatuses[user.uid]?.status || user.status || 'offline';
                                const isSelected = selectedUser?.uid === user.uid;

                                return (
                                    <div
                                        key={user.uid}
                                        onClick={() => setSelectedUser(user)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${isSelected
                                            ? 'bg-primary/10'
                                            : 'hover:bg-secondary/40'
                                            }`}
                                    >
                                        <div className="relative shrink-0">
                                            <Avatar className="w-10 h-10 border border-border/50">
                                                <AvatarImage src={getFullUrl(user.photoURL)} referrerPolicy="no-referrer" />
                                                <AvatarFallback className="text-xs bg-secondary">{getUserInitials(user)}</AvatarFallback>
                                            </Avatar>
                                            {status === 'online' && (
                                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <span className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                    {getUserName(user)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground opacity-70">
                                                    {status === 'online' ? 'Now' : ''}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs text-muted-foreground truncate opacity-80">
                                                    {status}
                                                </p>
                                                {!isSameTeam(user) && (
                                                    <span className="text-[9px] bg-secondary/80 px-1 py-0.5 rounded text-muted-foreground">Ext</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-xs text-muted-foreground px-3">No contacts found.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* MIDDLE - Chat Area or Request UI */}
            <div className="flex-1 flex flex-col min-w-0 bg-background relative z-0">
                {selectedUser ? (
                    (isSameTeam(selectedUser) || isKnownContact(selectedUser)) ? (
                        <div className="flex-1 flex flex-col h-full">
                            <ChatView
                                selectedUser={{
                                    ...selectedUser,
                                    status: userStatuses[selectedUser.uid]?.status || selectedUser.status
                                }}
                            />
                        </div>
                    ) : selectedUser.isRequest ? (
                        // REQUEST ACCEPTANCE UI
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <Avatar className="w-24 h-24 mb-4 ring-4 ring-secondary/30">
                                <AvatarImage src={getFullUrl(selectedUser.photoURL)} referrerPolicy="no-referrer" className="object-cover" />
                                <AvatarFallback className="text-2xl bg-secondary">{getUserInitials(selectedUser)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">{selectedUser.displayName}</h2>
                                <p className="text-muted-foreground">{selectedUser.email}</p>
                            </div>

                            <div className="bg-secondary/20 p-4 rounded-xl max-w-md w-full border border-border/50 relative">
                                <span className="absolute -top-2.5 left-4 bg-background px-2 text-xs text-muted-foreground font-medium">Message</span>
                                <p className="text-sm italic text-foreground/80">"{selectedUser.requestMessage}"</p>
                            </div>

                            <div className="flex gap-4 w-full max-w-xs">
                                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleRespond(selectedUser.uid, 'accepted')}>
                                    Accept
                                </Button>
                                <Button variant="outline" className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/30" onClick={() => handleRespond(selectedUser.uid, 'rejected')}>
                                    Decline
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // SEND Request UI (existing)
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-2 ring-1 ring-border">
                                <UserPlus className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">Connect with {getUserName(selectedUser)}</h2>
                                <p className="text-muted-foreground max-w-md mt-2">
                                    This user is not in your team. Send a message request to start a conversation.
                                </p>
                            </div>

                            <div className="w-full max-w-md space-y-4 bg-card p-6 rounded-xl border border-border/50 shadow-sm">
                                <Input
                                    placeholder="Hi! I'd like to discuss..."
                                    value={requestMessage}
                                    onChange={(e) => setRequestMessage(e.target.value)}
                                    disabled={isSendingRequest}
                                />
                                <Button className="w-full gap-2" onClick={handleSendRequest} disabled={isSendingRequest || !requestMessage.trim()}>
                                    {isSendingRequest ? (
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Send Request
                                </Button>
                                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    Your email address will be shared with the recipient.
                                </p>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Select a conversation
                    </div>
                )}
            </div>

            {/* RIGHT SIDEBAR - User Details */}
            {selectedUser && (
                <div className="w-72 shrink-0 border-l border-border/40 bg-background hidden xl:flex flex-col">
                    <div className="p-6 flex flex-col items-center border-b border-border/40">
                        <Avatar className="w-24 h-24 mb-4 ring-4 ring-secondary/30">
                            <AvatarImage src={getFullUrl(selectedUser.photoURL)} className="object-cover" referrerPolicy="no-referrer" />
                            <AvatarFallback className="text-2xl bg-secondary">{getUserInitials(selectedUser)}</AvatarFallback>
                        </Avatar>
                        <h3 className="text-lg font-bold">{getUserName(selectedUser)}</h3>
                        <span className="text-sm text-muted-foreground capitalize mb-1">
                            {userStatuses[selectedUser.uid]?.status || selectedUser.status || 'offline'}
                        </span>
                        <p className="text-xs text-muted-foreground text-center line-clamp-2 px-4 mb-4">
                            {selectedUser.email}
                        </p>

                        <div className="flex items-center gap-4">
                            {(isSameTeam(selectedUser) || isKnownContact(selectedUser)) && (
                                <>
                                    <Button variant="outline" size="icon" className="rounded-full w-10 h-10" onClick={() => toast({ description: "Call feature coming soon" })}>
                                        <Phone className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="rounded-full w-10 h-10" onClick={() => toast({ description: "Video call feature coming soon" })}>
                                        <Video className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                            <Button 
                                variant={isCloseFriend(selectedUser.uid) ? "default" : "outline"}
                                size="icon"
                                className={`rounded-full w-10 h-10 transition-colors ${isCloseFriend(selectedUser.uid) ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500" : ""}`}
                                onClick={toggleCloseFriend}
                                title={isCloseFriend(selectedUser.uid) ? "Remove from Close Friends" : "Add to Close Friends"}
                            >
                                <Star className={`w-4 h-4 ${isCloseFriend(selectedUser.uid) ? "fill-current" : ""}`} />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {(!isSameTeam(selectedUser) && !isKnownContact(selectedUser)) && (
                            <div className="p-3 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm border border-orange-500/20">
                                <p className="font-semibold mb-1">External User</p>
                                <p className="text-xs opacity-90">This user is outside your team. Be careful with what you share.</p>
                            </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Shared Photos</h4>
                            <div className="flex flex-col items-center justify-center py-6 text-center bg-secondary/20 rounded-lg border border-border/30 border-dashed">
                                <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
                                <span className="text-xs text-muted-foreground/50 font-medium">Empty</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Shared Files</h4>
                            <div className="flex flex-col items-center justify-center py-6 text-center bg-secondary/20 rounded-lg border border-border/30 border-dashed">
                                <FileText className="w-8 h-8 opacity-20 mb-2" />
                                <span className="text-xs text-muted-foreground/50 font-medium">Empty</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesPage;

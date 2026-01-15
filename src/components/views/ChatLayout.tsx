import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";
import ChatView from "./ChatView";
import { getFullUrl, getUserName, getUserInitials } from "@/lib/utils";

interface ChatLayoutProps {
    users: any[];
    selectedUser: any;
    userStatuses: Record<string, any>;
    onSelectUser: (user: any) => void;
    isPreview?: boolean;
}

const ChatLayout = ({ users, selectedUser, userStatuses, onSelectUser, isPreview }: ChatLayoutProps) => {
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
                        users.map((user) => {
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
                                            {/* Optional: Add timestamp if available usually */}
                                        </div>
                                    </div>
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mr-1" />}
                                </div>
                            );
                        })
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

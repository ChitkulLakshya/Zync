import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";
import ChatView from "./ChatView";

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
            <div className="w-80 border-r border-border/50 flex flex-col bg-secondary/10">
                <div className="p-4 border-b border-border/50">
                    <h2 className="text-lg font-semibold mb-4">Messages</h2>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search people..." className="pl-8" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {users.map((user) => {
                        const status = !isPreview && userStatuses[user.uid]
                            ? userStatuses[user.uid].state
                            : user.status;
                        const isSelected = selectedUser?.uid === user.uid;

                        return (
                            <div
                                key={user._id || user.id}
                                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50 transition-colors ${isSelected ? 'bg-secondary/50' : ''}`}
                                onClick={() => onSelectUser(user)}
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
                {selectedUser ? (
                    <ChatView
                        selectedUser={{
                            ...selectedUser,
                            status: userStatuses[selectedUser.uid]?.state || selectedUser.status || 'offline'
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

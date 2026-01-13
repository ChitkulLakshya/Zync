import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Loader2 } from "lucide-react";
import { getFullUrl, API_BASE_URL } from "@/lib/utils";
import { auth } from "@/lib/firebase";

interface PeopleViewProps {
    users?: any[]; // Making optional as we fetch internally
    userStatuses: Record<string, any>;
    onChat: (user: any) => void;
    isPreview?: boolean;
}

const PeopleView = ({ users: propUsers, userStatuses, onChat, isPreview }: PeopleViewProps) => {
    const [users, setUsers] = useState<any[]>(propUsers || []);
    const [loading, setLoading] = useState(!propUsers?.length);
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!isPreview) {
            const fetchUsers = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/users`);
                    if (response.ok) {
                        const data = await response.json();
                        // Filter out current user
                        const filteredUsers = data.filter((u: any) => u.uid !== currentUser?.uid);
                        setUsers(filteredUsers);
                    }
                } catch (error) {
                    console.error("Error fetching users:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchUsers();
        } else {
            setLoading(false);
        }
    }, [isPreview, currentUser?.uid]);

    if (loading) {
        return (
            <div className="flex-1 w-full p-6 h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }
    return (
        <div className="flex-1 w-full p-6 space-y-6 h-full">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">People</h2>
                <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Invite Member
                </Button>
            </div>
            {users.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <p className="text-muted-foreground text-lg">No other members found.</p>
                    <p className="text-sm text-muted-foreground">Invite people to see them here.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {users.map((user) => {
                        const status = !isPreview && userStatuses[user.uid]
                            ? userStatuses[user.uid].state
                            : user.status;

                        return (
                            <Card key={user._id || user.id} className="hover:shadow-md transition-shadow min-h-[320px] flex flex-col items-center justify-center text-center p-6">
                                <CardHeader className="flex flex-col items-center justify-center gap-4 w-full p-0 pb-4">
                                    <div className="relative">
                                        <Avatar className="h-24 w-24 ring-4 ring-background border shadow-sm">
                                            <AvatarImage src={getFullUrl(user.photoURL)} className="object-cover" />
                                            <AvatarFallback className="text-3xl">{user.avatar || (user.displayName || user.name || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-background ${status === "online" ? "bg-green-500" :
                                            status === "away" ? "bg-yellow-500" : "bg-gray-400"
                                            }`} />
                                    </div>
                                    <div className="flex flex-col items-center w-full space-y-1">
                                        <CardTitle className="text-xl font-semibold truncate w-full px-2">{user.displayName || user.name}</CardTitle>
                                        <CardDescription className="text-sm truncate w-full px-2">{user.email}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="w-full p-0 pt-2">
                                    <div className="flex items-center justify-between w-full px-4">
                                        <Badge variant={status === "online" ? "default" : "secondary"} className="capitalize px-3 py-1">
                                            {status}
                                        </Badge>
                                        <Button size="sm" variant="outline" onClick={() => onChat(user)} className="gap-2">
                                            <MessageSquare className="w-4 h-4" />
                                            Chat
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default PeopleView;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare } from "lucide-react";

interface PeopleViewProps {
    users: any[];
    userStatuses: Record<string, any>;
    onChat: (user: any) => void;
    isPreview?: boolean;
}

const PeopleView = ({ users, userStatuses, onChat, isPreview }: PeopleViewProps) => {
    return (
        <div className="flex-1 w-full p-6 space-y-6 h-full">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">People</h2>
                <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Invite Member
                </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {users.map((user) => {
                    const status = !isPreview && userStatuses[user.uid]
                        ? userStatuses[user.uid].state
                        : user.status;

                    return (
                        <Card key={user._id || user.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="relative">
                                    <Avatar>
                                        <AvatarImage src={user.photoURL} />
                                        <AvatarFallback>{user.avatar || (user.displayName || user.name || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${status === "online" ? "bg-green-500" :
                                        status === "away" ? "bg-yellow-500" : "bg-gray-400"
                                        }`} />
                                </div>
                                <div className="flex flex-col">
                                    <CardTitle className="text-base">{user.displayName || user.name}</CardTitle>
                                    <CardDescription className="text-xs">{user.email}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <Badge variant={status === "online" ? "default" : "secondary"} className="capitalize">
                                        {status}
                                    </Badge>
                                    <Button size="sm" variant="ghost" onClick={() => onChat(user)}>
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Chat
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
};

export default PeopleView;

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ActivityLog {
    _id: string;
    startTime: string;
    endTime: string;
    duration?: number;
    date: string;
}

interface ActivityLogViewProps {
    activityLogs: ActivityLog[];
    elapsedTime: string;
    handleClearLogs: () => void;
    handleDeleteLog: (id: string) => void;
}

const ActivityLogView: React.FC<ActivityLogViewProps> = ({ activityLogs, elapsedTime, handleClearLogs, handleDeleteLog }) => {
    // Calculate Streak and Total Time
    const sortedLogs = [...activityLogs].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    let currentStreak = 0;
    let totalSeconds = 0;

    // Calculate Total Time
    activityLogs.forEach(log => {
        const start = new Date(log.startTime);
        const end = new Date(log.endTime);
        totalSeconds += (log.duration || Math.round((end.getTime() - start.getTime()) / 1000));
    });

    // Simple Streak Calculation (Consecutive Days)
    if (sortedLogs.length > 0) {
        currentStreak = 1;
        let lastDate = new Date(sortedLogs[0].startTime).setHours(0, 0, 0, 0);

        for (let i = 1; i < sortedLogs.length; i++) {
            const currentDate = new Date(sortedLogs[i].startTime).setHours(0, 0, 0, 0);
            const diffTime = Math.abs(lastDate - currentDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentStreak++;
                lastDate = currentDate;
            } else if (diffDays === 0) {
                continue; // Same day
            } else {
                break; // Streak broken
            }
        }
    }

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

    return (
        <div className="p-6 h-full space-y-6 overflow-y-auto">
            <h2 className="text-2xl font-bold">Activity Log</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Session */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Current Session</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{elapsedTime}</div>
                        <p className="text-xs text-muted-foreground">Active right now</p>
                    </CardContent>
                </Card>

                {/* Usage Streak */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Usage Streak</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold">{currentStreak} Days</div>
                            <span className="text-2xl">🔥</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Keep it up!</p>
                    </CardContent>
                </Card>

                {/* Total Time */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Time Spent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalHours}h {totalMinutes}m</div>
                        <p className="text-xs text-muted-foreground">Lifetime usage</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                    <div className="space-y-1.5">
                        <CardTitle>Session History</CardTitle>
                        <CardDescription>Track your active time on the platform.</CardDescription>
                    </div>
                    {activityLogs.length > 0 && (
                        <Button variant="destructive" size="sm" onClick={handleClearLogs}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear History
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="grid grid-cols-5 p-4 font-medium border-b bg-muted/50">
                            <div>Date</div>
                            <div>Start Time</div>
                            <div>End Time</div>
                            <div>Duration</div>
                            <div className="text-right">Actions</div>
                        </div>
                        {activityLogs.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">No activity logs found.</div>
                        ) : (
                            activityLogs.map((log) => {
                                const start = new Date(log.startTime);
                                const end = new Date(log.endTime);
                                const durationSeconds = log.duration || Math.round((end.getTime() - start.getTime()) / 1000);
                                const hours = Math.floor(durationSeconds / 3600);
                                const minutes = Math.floor((durationSeconds % 3600) / 60);

                                const formattedDuration = hours > 0
                                    ? `${hours} hr ${minutes} min`
                                    : `${minutes} min`;

                                return (
                                    <div key={log._id} className="grid grid-cols-5 p-4 border-b last:border-0 hover:bg-muted/20 items-center">
                                        <div>{log.date}</div>
                                        <div>{start.toLocaleTimeString()}</div>
                                        <div>{end.toLocaleTimeString()}</div>
                                        <div className="font-medium">
                                            {formattedDuration}
                                        </div>
                                        <div className="text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLog(log._id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
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

export default ActivityLogView;

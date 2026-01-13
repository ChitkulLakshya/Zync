
import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarView.css';
import { Card } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import { fetchProjects } from "@/api/projects";
import { auth } from "@/lib/firebase";

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface CalendarEvent {
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: any;
}

const CalendarView = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Indian Holidays
                const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
                let holidayEvents: CalendarEvent[] = [];

                if (apiKey) {
                    const calendarId = 'en.indian#holiday@group.v.calendar.google.com';
                    const year = new Date().getFullYear();
                    const timeMin = new Date(year, 0, 1).toISOString();
                    const timeMax = new Date(year, 11, 31).toISOString();
                    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`;

                    const response = await fetch(url);
                    if (response.ok) {
                        const data = await response.json();
                        holidayEvents = data.items.map((item: any) => {
                            // Fix: Parse YYYY-MM-DD as local midnight to avoid timezone shifts
                            // Google API returns 'end' date as exclusive (next day) for all-day events
                            let start: Date, end: Date;

                            if (item.start.date) {
                                // It's an all-day event (YYYY-MM-DD)
                                start = new Date(item.start.date + 'T00:00:00');
                                end = new Date(item.end.date + 'T00:00:00');
                            } else {
                                // It's a timed event (ISO string)
                                start = new Date(item.start.dateTime);
                                end = new Date(item.end.dateTime);
                            }

                            return {
                                title: item.summary,
                                start,
                                end,
                                allDay: !!item.start.date,
                                resource: { type: 'holiday', data: item }
                            };
                        });
                    }
                }

                // 2. Fetch User Projects
                let projectEvents: CalendarEvent[] = [];
                const user = auth.currentUser;
                if (user) {
                    try {
                        const projects = await fetchProjects(user.uid);
                        projectEvents = projects.map(p => ({
                            title: `🚀 Project: ${p.name}`,
                            start: new Date(p.createdAt),
                            end: new Date(p.createdAt),
                            allDay: true,
                            resource: { type: 'project', id: p._id }
                        }));
                    } catch (e) {
                        console.error("Failed to fetch projects for calendar", e);
                    }
                }

                setEvents([...holidayEvents, ...projectEvents]);

            } catch (error) {
                console.error("Error loading calendar data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const eventStyleGetter = (event: CalendarEvent) => {
        let backgroundColor = '#3174ad';

        if (event.resource?.type === 'project') {
            backgroundColor = '#10b981'; // Emerald for Projects
        } else if (event.resource?.type === 'holiday') {
            backgroundColor = '#f43f5e'; // Rose for Holidays
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.9,
                color: 'white',
                border: '0px',
                display: 'block',
                margin: '2px 4px'
            }
        };
    };

    return (
        <div className="h-full w-full p-6 flex flex-col">
            <h2 className="text-2xl font-bold tracking-tight mb-6">Calendar</h2>
            <Card className="flex-1 p-4 shadow-sm border-none bg-background/50 backdrop-blur-sm">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%', minHeight: '500px' }}
                        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                        defaultView={Views.MONTH}
                        selectable
                        popup
                        eventPropGetter={eventStyleGetter}
                        className="rounded-md border bg-card text-card-foreground shadow-sm"
                    />
                )}
            </Card>
        </div>
    );
};

export default CalendarView;

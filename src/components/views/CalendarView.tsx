
import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarView.css';
import { Card } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

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
        const fetchHolidays = async () => {
            const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
            if (!apiKey) {
                console.warn("No Google API Key found");
                return;
            }

            setLoading(true);
            try {
                // Fetch US Holidays for the current year
                const calendarId = 'en.usa#holiday@group.v.calendar.google.com';
                const year = new Date().getFullYear();
                const timeMin = new Date(year, 0, 1).toISOString();
                const timeMax = new Date(year, 11, 31).toISOString();

                const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`;

                const response = await fetch(url);
                if (!response.ok) throw new Error('Failed to fetch calendar events');

                const data = await response.json();

                const mappedEvents = data.items.map((item: any) => ({
                    title: item.summary,
                    start: new Date(item.start.date || item.start.dateTime),
                    end: new Date(item.end.date || item.end.dateTime),
                    allDay: !!item.start.date,
                    resource: item
                }));

                setEvents(mappedEvents);
            } catch (error) {
                console.error("Error fetching holidays:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHolidays();
    }, []);

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
                        style={{ height: 'calc(100vh - 100px)' }}
                        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                        defaultView={Views.MONTH}
                        selectable
                        popup
                        className="rounded-md border bg-card text-card-foreground shadow-sm"
                    />
                )}
            </Card>
        </div>
    );
};

export default CalendarView;

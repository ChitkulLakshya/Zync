import { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarView.css';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchProjects } from '@/api/projects';
import { fetchHolidays, fetchCountries, type Holiday, type Country } from '@/api/calendar';
import { auth } from '@/lib/firebase';

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

const STORAGE_KEY = 'zync-holiday-country';

const CalendarView = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || 'US';
  });


  useEffect(() => {
    fetchCountries()
      .then(setCountries)
      .catch(() => {});
  }, []);


  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedCountry);
  }, [selectedCountry]);


  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const year = new Date().getFullYear();

        const [holidays, projectEvents] = await Promise.all([
          fetchHolidays(year, selectedCountry).catch<Holiday[]>(() => []),
          loadProjectEvents(),
        ]);

        const holidayEvents: CalendarEvent[] = holidays.map((h) => {
          const date = new Date(h.date + 'T00:00:00');
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          return {
            title: h.name,
            start: date,
            end: nextDay,
            allDay: true,
            resource: { type: 'holiday', localName: h.localName, countryCode: h.countryCode },
          };
        });

        setEvents([...holidayEvents, ...projectEvents]);
      } catch (error) {
        console.error('Error loading calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCountry]);


  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries]
  );

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad';

    if (event.resource?.type === 'project') {
      backgroundColor = '#10b981';
    } else if (event.resource?.type === 'holiday') {
      backgroundColor = '#f43f5e';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        margin: '2px 4px',
      },
    };
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-6 md:p-8 space-y-8 h-full flex flex-col">
      <div className="flex items-center justify-end mb-6">
        {countries.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Holidays:</span>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {sortedCountries.map((c) => (
                  <SelectItem key={c.countryCode} value={c.countryCode}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <Card className="flex-1 p-4 shadow-sm border border-border/10 bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
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
          className="rounded-2xl border-none bg-transparent text-card-foreground"
        />
      </Card>
    </div>
  );
};

async function loadProjectEvents(): Promise<CalendarEvent[]> {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  try {
    const projects = await fetchProjects();
    return projects.map((p) => ({
      title: `🚀 Project: ${p.name}`,
      start: new Date(p.createdAt),
      end: new Date(p.createdAt),
      allDay: true,
      resource: { type: 'project', id: p._id },
    }));
  } catch {
    return [];
  }
}

export default CalendarView;

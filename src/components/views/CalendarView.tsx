/**
 * @fileoverview CalendarView.tsx
 * @module CalendarView
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
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

  const [userAuth, setUserAuth] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserAuth(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userAuth) return;
    fetchCountries()
      .then(setCountries)
      .catch(() => {});
  }, [userAuth]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedCountry);
  }, [selectedCountry]);

  useEffect(() => {
    const loadData = async () => {
      if (!userAuth) return;
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
  }, [selectedCountry, userAuth]);


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

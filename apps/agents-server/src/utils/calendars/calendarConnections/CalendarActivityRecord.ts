import type { Json } from '@promptbook-local/types';
import type { CalendarProvider } from './CalendarConnectionRecord';

/**
 * Persisted calendar activity log row.
 */
export type CalendarActivityRecord = {
    id: number;
    createdAt: string;
    userId: number | null;
    agentPermanentId: string;
    connectionId: number | null;
    provider: CalendarProvider;
    operation: string;
    calendarUrl: string | null;
    eventId: string | null;
    status: string;
    details: Json | null;
};

/**
 * Input payload for writing one calendar activity log entry.
 */
export type CreateCalendarActivityOptions = {
    userId?: number | null;
    agentPermanentId: string;
    connectionId?: number | null;
    provider: CalendarProvider;
    operation: string;
    calendarUrl?: string | null;
    eventId?: string | null;
    status: string;
    details?: Json | null;
};

/**
 * Input payload for listing recent calendar activity.
 */
export type ListCalendarActivityOptions = {
    userId?: number;
    agentPermanentId: string;
    limit?: number;
};

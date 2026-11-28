import type { CalendarConnectionRecord, ListCalendarConnectionsOptions } from './CalendarConnectionRecord';
import { mapCalendarConnectionRowToRecord } from './mapCalendarConnectionRowToRecord';
import { provideCalendarConnectionTable } from './provideCalendarConnectionTable';

/**
 * Lists calendar connections for one user and optional agent/provider filter.
 */
export async function listCalendarConnections(
    options: ListCalendarConnectionsOptions,
): Promise<CalendarConnectionRecord[]> {
    const calendarConnectionTable = await provideCalendarConnectionTable();
    let query = calendarConnectionTable.select('*').eq('userId', options.userId);

    if (options.agentPermanentId) {
        query = query.eq('agentPermanentId', options.agentPermanentId);
    }

    if (options.provider) {
        query = query.eq('provider', options.provider);
    }

    if (options.includeDisconnected !== true) {
        query = query.is('disconnectedAt', null);
    }

    const { data, error } = await query.order('updatedAt', { ascending: false });
    if (error) {
        throw new Error(`Failed to list calendar connections: ${error.message}`);
    }

    return (data || []).map(mapCalendarConnectionRowToRecord);
}

import type { CalendarConnectionRecord, DisconnectCalendarConnectionOptions } from './CalendarConnectionRecord';
import { mapCalendarConnectionRowToRecord } from './mapCalendarConnectionRowToRecord';
import { provideCalendarConnectionTable } from './provideCalendarConnectionTable';

/**
 * Marks one calendar connection as disconnected.
 */
export async function disconnectCalendarConnection(
    options: DisconnectCalendarConnectionOptions,
): Promise<CalendarConnectionRecord | null> {
    const calendarConnectionTable = await provideCalendarConnectionTable();
    const nowIso = new Date().toISOString();
    const { data, error } = await calendarConnectionTable
        .update({
            updatedAt: nowIso,
            status: 'DISCONNECTED',
            disconnectedAt: nowIso,
        })
        .eq('id', options.connectionId)
        .eq('userId', options.userId)
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to disconnect calendar connection: ${error.message}`);
    }

    return data ? mapCalendarConnectionRowToRecord(data) : null;
}

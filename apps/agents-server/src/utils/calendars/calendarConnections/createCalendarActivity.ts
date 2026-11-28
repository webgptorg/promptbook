import type { CalendarActivityRecord, CreateCalendarActivityOptions } from './CalendarActivityRecord';
import { mapCalendarActivityRowToRecord } from './mapCalendarActivityRowToRecord';
import { provideCalendarActivityTable } from './provideCalendarActivityTable';

/**
 * Writes one calendar activity entry.
 */
export async function createCalendarActivity(
    options: CreateCalendarActivityOptions,
): Promise<CalendarActivityRecord> {
    const calendarActivityTable = await provideCalendarActivityTable();
    const { data, error } = await calendarActivityTable
        .insert({
            userId: options.userId ?? null,
            agentPermanentId: options.agentPermanentId,
            connectionId: options.connectionId ?? null,
            provider: options.provider,
            operation: options.operation,
            calendarUrl: options.calendarUrl ?? null,
            eventId: options.eventId ?? null,
            status: options.status,
            details: options.details ?? null,
        })
        .select('*')
        .maybeSingle();

    if (error || !data) {
        throw new Error(error?.message || 'Failed to create calendar activity log entry.');
    }

    return mapCalendarActivityRowToRecord(data);
}

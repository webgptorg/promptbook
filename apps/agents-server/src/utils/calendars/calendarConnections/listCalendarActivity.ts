import type { CalendarActivityRecord, ListCalendarActivityOptions } from './CalendarActivityRecord';
import { mapCalendarActivityRowToRecord } from './mapCalendarActivityRowToRecord';
import { provideCalendarActivityTable } from './provideCalendarActivityTable';

/**
 * Lists recent calendar activity for one agent and optional user.
 */
export async function listCalendarActivity(options: ListCalendarActivityOptions): Promise<CalendarActivityRecord[]> {
    const calendarActivityTable = await provideCalendarActivityTable();
    let query = calendarActivityTable
        .select('*')
        .eq('agentPermanentId', options.agentPermanentId)
        .order('createdAt', { ascending: false })
        .limit(options.limit && Number.isFinite(options.limit) ? Math.max(1, Math.floor(options.limit)) : 20);

    if (typeof options.userId === 'number') {
        query = query.eq('userId', options.userId);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error(`Failed to list calendar activity: ${error.message}`);
    }

    return (data || []).map(mapCalendarActivityRowToRecord);
}

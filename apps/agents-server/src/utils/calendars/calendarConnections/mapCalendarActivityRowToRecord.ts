import type { Json } from '@promptbook-local/types';
import type { CalendarActivityRecord } from './CalendarActivityRecord';
import { normalizeCalendarNullableText } from './normalizeCalendarNullableText';

/**
 * Maps raw calendar-activity row to normalized record.
 *
 * @private function of calendarConnections
 */
export function mapCalendarActivityRowToRecord(rawRow: Record<string, unknown>): CalendarActivityRecord {
    return {
        id: Number(rawRow.id),
        createdAt: String(rawRow.createdAt),
        userId: typeof rawRow.userId === 'number' ? rawRow.userId : rawRow.userId ? Number(rawRow.userId) : null,
        agentPermanentId: String(rawRow.agentPermanentId),
        connectionId:
            typeof rawRow.connectionId === 'number'
                ? rawRow.connectionId
                : rawRow.connectionId
                  ? Number(rawRow.connectionId)
                  : null,
        provider: String(rawRow.provider).toLowerCase() === 'google' ? 'google' : 'google',
        operation: String(rawRow.operation),
        calendarUrl: normalizeCalendarNullableText(rawRow.calendarUrl),
        eventId: normalizeCalendarNullableText(rawRow.eventId),
        status: String(rawRow.status),
        details: (rawRow.details as Json | null) ?? null,
    };
}

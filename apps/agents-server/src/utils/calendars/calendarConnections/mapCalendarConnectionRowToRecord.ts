import type { CalendarConnectionRecord } from './CalendarConnectionRecord';
import { normalizeCalendarNullableText } from './normalizeCalendarNullableText';
import { normalizeCalendarScopes } from './normalizeCalendarScopes';

/**
 * Maps raw calendar-connection row to normalized record.
 *
 * @private function of calendarConnections
 */
export function mapCalendarConnectionRowToRecord(rawRow: Record<string, unknown>): CalendarConnectionRecord {
    return {
        id: Number(rawRow.id),
        createdAt: String(rawRow.createdAt),
        updatedAt: String(rawRow.updatedAt),
        userId: Number(rawRow.userId),
        agentPermanentId: String(rawRow.agentPermanentId),
        provider: String(rawRow.provider).toLowerCase() === 'google' ? 'google' : 'google',
        calendarUrl: String(rawRow.calendarUrl),
        calendarId: String(rawRow.calendarId || 'primary'),
        tokenRef: String(rawRow.tokenRef),
        scopes: normalizeCalendarScopes(rawRow.scopes),
        status: String(rawRow.status).toUpperCase() === 'DISCONNECTED' ? 'DISCONNECTED' : 'CONNECTED',
        disconnectedAt: normalizeCalendarNullableText(rawRow.disconnectedAt),
        lastSyncedAt: normalizeCalendarNullableText(rawRow.lastSyncedAt),
    };
}

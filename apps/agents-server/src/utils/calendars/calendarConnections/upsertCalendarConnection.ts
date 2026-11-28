import type { CalendarConnectionRecord, UpsertCalendarConnectionOptions } from './CalendarConnectionRecord';
import { mapCalendarConnectionRowToRecord } from './mapCalendarConnectionRowToRecord';
import { normalizeCalendarScopes } from './normalizeCalendarScopes';
import { provideCalendarConnectionTable } from './provideCalendarConnectionTable';

/**
 * Creates or updates one active calendar connection.
 */
export async function upsertCalendarConnection(
    options: UpsertCalendarConnectionOptions,
): Promise<CalendarConnectionRecord> {
    const calendarConnectionTable = await provideCalendarConnectionTable();
    const nowIso = new Date().toISOString();
    const normalizedScopes = normalizeCalendarScopes(options.scopes);
    const normalizedCalendarUrl = options.calendarUrl.trim();
    const normalizedCalendarId = options.calendarId.trim() || 'primary';
    const normalizedTokenRef = options.tokenRef.trim();

    const { data: existingRow, error: existingRowError } = await calendarConnectionTable
        .select('*')
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .eq('provider', options.provider)
        .eq('calendarUrl', normalizedCalendarUrl)
        .is('disconnectedAt', null)
        .maybeSingle();

    if (existingRowError) {
        throw new Error(`Failed to load existing calendar connection: ${existingRowError.message}`);
    }

    if (existingRow) {
        const { data: updatedRow, error: updatedRowError } = await calendarConnectionTable
            .update({
                updatedAt: nowIso,
                calendarId: normalizedCalendarId,
                tokenRef: normalizedTokenRef,
                scopes: normalizedScopes,
                status: 'CONNECTED',
                disconnectedAt: null,
            })
            .eq('id', existingRow.id)
            .eq('userId', options.userId)
            .select('*')
            .maybeSingle();

        if (updatedRowError || !updatedRow) {
            throw new Error(updatedRowError?.message || 'Failed to update calendar connection.');
        }

        return mapCalendarConnectionRowToRecord(updatedRow);
    }

    const { data: insertedRow, error: insertedRowError } = await calendarConnectionTable
        .insert({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
            provider: options.provider,
            calendarUrl: normalizedCalendarUrl,
            calendarId: normalizedCalendarId,
            tokenRef: normalizedTokenRef,
            scopes: normalizedScopes,
            status: 'CONNECTED',
            createdAt: nowIso,
            updatedAt: nowIso,
        })
        .select('*')
        .maybeSingle();

    if (insertedRowError || !insertedRow) {
        throw new Error(insertedRowError?.message || 'Failed to create calendar connection.');
    }

    return mapCalendarConnectionRowToRecord(insertedRow);
}

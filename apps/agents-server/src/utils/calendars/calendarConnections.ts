import type { Json, TODO_any } from '@promptbook-local/types';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideServer } from '@/src/tools/$provideServer';

/**
 * Calendar providers currently supported by Agents Server.
 */
export type CalendarProvider = 'google';

/**
 * Persisted calendar connection row stored for one user + agent.
 */
export type CalendarConnectionRecord = {
    id: number;
    createdAt: string;
    updatedAt: string;
    userId: number;
    agentPermanentId: string;
    provider: CalendarProvider;
    calendarUrl: string;
    calendarId: string;
    tokenRef: string;
    scopes: string[];
    status: 'CONNECTED' | 'DISCONNECTED';
    disconnectedAt: string | null;
    lastSyncedAt: string | null;
};

/**
 * Input payload for listing calendar connections.
 */
export type ListCalendarConnectionsOptions = {
    userId: number;
    agentPermanentId?: string;
    provider?: CalendarProvider;
    includeDisconnected?: boolean;
};

/**
 * Input payload for creating or refreshing one calendar connection.
 */
export type UpsertCalendarConnectionOptions = {
    userId: number;
    agentPermanentId: string;
    provider: CalendarProvider;
    calendarUrl: string;
    calendarId: string;
    tokenRef: string;
    scopes: string[];
};

/**
 * Input payload for disconnecting one calendar connection.
 */
export type DisconnectCalendarConnectionOptions = {
    userId: number;
    connectionId: number;
};

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

/**
 * Creates or updates one active calendar connection.
 */
export async function upsertCalendarConnection(
    options: UpsertCalendarConnectionOptions,
): Promise<CalendarConnectionRecord> {
    const calendarConnectionTable = await provideCalendarConnectionTable();
    const nowIso = new Date().toISOString();
    const normalizedScopes = normalizeScopes(options.scopes);
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

/**
 * Lists recent calendar activity for one agent and optional user.
 */
export async function listCalendarActivity(
    options: ListCalendarActivityOptions,
): Promise<CalendarActivityRecord[]> {
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

/**
 * Provides scoped Supabase query builder for `CalendarConnection`.
 *
 * @private function of calendarConnections
 */
async function provideCalendarConnectionTable(): Promise<TODO_any> {
    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = await getCalendarConnectionTableName();
    return supabase.from(tableName);
}

/**
 * Provides scoped Supabase query builder for `CalendarActivity`.
 *
 * @private function of calendarConnections
 */
async function provideCalendarActivityTable(): Promise<TODO_any> {
    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = await getCalendarActivityTableName();
    return supabase.from(tableName);
}

/**
 * Resolves prefixed `CalendarConnection` table name.
 *
 * @private function of calendarConnections
 */
async function getCalendarConnectionTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}CalendarConnection`;
}

/**
 * Resolves prefixed `CalendarActivity` table name.
 *
 * @private function of calendarConnections
 */
async function getCalendarActivityTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}CalendarActivity`;
}

/**
 * Maps raw calendar-connection row to normalized record.
 *
 * @private function of calendarConnections
 */
function mapCalendarConnectionRowToRecord(rawRow: Record<string, unknown>): CalendarConnectionRecord {
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
        scopes: normalizeScopes(rawRow.scopes),
        status: String(rawRow.status).toUpperCase() === 'DISCONNECTED' ? 'DISCONNECTED' : 'CONNECTED',
        disconnectedAt: normalizeNullableText(rawRow.disconnectedAt),
        lastSyncedAt: normalizeNullableText(rawRow.lastSyncedAt),
    };
}

/**
 * Maps raw calendar-activity row to normalized record.
 *
 * @private function of calendarConnections
 */
function mapCalendarActivityRowToRecord(rawRow: Record<string, unknown>): CalendarActivityRecord {
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
        calendarUrl: normalizeNullableText(rawRow.calendarUrl),
        eventId: normalizeNullableText(rawRow.eventId),
        status: String(rawRow.status),
        details: (rawRow.details as Json | null) ?? null,
    };
}

/**
 * Normalizes unknown scopes payload into unique trimmed string list.
 *
 * @private function of calendarConnections
 */
function normalizeScopes(rawScopes: unknown): string[] {
    if (Array.isArray(rawScopes)) {
        return [...new Set(rawScopes.filter((scope): scope is string => typeof scope === 'string').map((scope) => scope.trim()).filter(Boolean))];
    }

    return [];
}

/**
 * Normalizes unknown nullable text field.
 *
 * @private function of calendarConnections
 */
function normalizeNullableText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
}

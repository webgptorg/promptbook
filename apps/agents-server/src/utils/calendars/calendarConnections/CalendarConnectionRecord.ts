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

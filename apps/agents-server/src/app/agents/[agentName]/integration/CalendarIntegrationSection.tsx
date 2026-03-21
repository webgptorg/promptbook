'use client';

import { showConfirm } from '@/src/components/AsyncDialogs/asyncDialogs';
import { buildCalendarOAuthConnectUrl } from '@/src/utils/calendarOAuthClient';
import { Calendar, Link2, RefreshCw, Unlink } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * One calendar-connection row returned by the agent calendar-connections API.
 */
type CalendarConnectionItem = {
    id: number;
    provider: string;
    calendarUrl: string;
    calendarId: string;
    scopes: string[];
    status: 'CONNECTED' | 'DISCONNECTED';
    updatedAt: string;
    disconnectedAt: string | null;
};

/**
 * One calendar-activity row returned by the agent calendar-connections API.
 */
type CalendarActivityItem = {
    id: number;
    operation: string;
    status: string;
    createdAt: string;
    calendarUrl: string | null;
    eventId: string | null;
};

/**
 * API payload returned by `/agents/[agentName]/api/calendar-connections`.
 */
type CalendarConnectionsPayload = {
    agentPermanentId: string;
    oauth: {
        isConfigured: boolean;
        hasUsableToken: boolean;
    };
    connections: CalendarConnectionItem[];
    activity: CalendarActivityItem[];
};

/**
 * Props for one agent-calendar integration section.
 */
type CalendarIntegrationSectionProps = {
    agentName: string;
    agentPermanentId: string;
};

/**
 * Renders connected-calendar settings for one agent, including re-auth/disconnect and activity timeline.
 */
export function CalendarIntegrationSection({ agentName, agentPermanentId }: CalendarIntegrationSectionProps) {
    const [payload, setPayload] = useState<CalendarConnectionsPayload | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [disconnectingConnectionId, setDisconnectingConnectionId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadCalendarConnections = useCallback(async () => {
        setError(null);
        setIsRefreshing(true);
        try {
            const response = await fetch(
                `/agents/${encodeURIComponent(agentName)}/api/calendar-connections?activityLimit=12`,
                {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                    },
                },
            );
            if (!response.ok) {
                const responsePayload = (await response.json().catch(() => null)) as { error?: string } | null;
                throw new Error(responsePayload?.error || 'Failed to load calendar connections.');
            }

            const responsePayload = (await response.json()) as CalendarConnectionsPayload;
            setPayload(responsePayload);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load calendar connections.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [agentName]);

    useEffect(() => {
        void loadCalendarConnections();
    }, [loadCalendarConnections]);

    const activeConnections = useMemo(
        () => (payload?.connections || []).filter((connection) => connection.status === 'CONNECTED'),
        [payload?.connections],
    );

    /**
     * Redirects to Google Calendar OAuth connect/re-auth flow.
     */
    const handleConnectOrReauth = useCallback(() => {
        const defaultCalendarUrl = activeConnections[0]?.calendarUrl || 'https://calendar.google.com/calendar/u/0/r';
        const defaultScopes = activeConnections[0]?.scopes || ['https://www.googleapis.com/auth/calendar'];
        const returnTo =
            typeof window !== 'undefined'
                ? `${window.location.pathname}${window.location.search}`
                : `/agents/${encodeURIComponent(agentName)}/integration`;
        const connectUrl = buildCalendarOAuthConnectUrl({
            returnTo,
            isGlobal: false,
            isUserScoped: false,
            agentPermanentId,
            calendarUrl: defaultCalendarUrl,
            scopes: defaultScopes,
        });

        if (typeof window !== 'undefined') {
            window.location.assign(connectUrl);
        }
    }, [activeConnections, agentName, agentPermanentId]);

    /**
     * Disconnects one selected calendar connection from this agent.
     */
    const handleDisconnectConnection = useCallback(
        async (connection: CalendarConnectionItem) => {
            const confirmed = await showConfirm({
                title: 'Disconnect calendar',
                message: 'Do you want to disconnect this calendar from the current agent?',
                confirmLabel: 'Disconnect',
                cancelLabel: 'Cancel',
            }).catch(() => false);

            if (!confirmed) {
                return;
            }

            setDisconnectingConnectionId(connection.id);
            setError(null);
            try {
                const response = await fetch(
                    `/agents/${encodeURIComponent(agentName)}/api/calendar-connections/${connection.id}/disconnect`,
                    {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                        },
                    },
                );
                if (!response.ok) {
                    const responsePayload = (await response.json().catch(() => null)) as
                        | { error?: string }
                        | null;
                    throw new Error(responsePayload?.error || 'Failed to disconnect calendar connection.');
                }

                await loadCalendarConnections();
            } catch (disconnectError) {
                setError(
                    disconnectError instanceof Error
                        ? disconnectError.message
                        : 'Failed to disconnect calendar connection.',
                );
            } finally {
                setDisconnectingConnectionId(null);
            }
        },
        [agentName, loadCalendarConnections],
    );

    return (
        <div className="p-6 rounded-xl border-2 border-blue-200 bg-blue-50/30 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600 shadow-sm">
                    <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">Calendar Integration</h2>
                    <p className="text-gray-600">
                        Connect Google Calendar for this agent and review recent calendar operations.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleConnectOrReauth}
                    disabled={payload?.oauth.isConfigured !== true}
                    className="inline-flex items-center gap-2 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Link2 className="h-4 w-4" />
                    {activeConnections.length > 0 ? 'Re-auth' : 'Connect'}
                </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-700">
                <span className="rounded-full bg-white/90 px-2 py-1 border border-blue-200">
                    OAuth configured: {payload?.oauth.isConfigured ? 'Yes' : 'No'}
                </span>
                <span className="rounded-full bg-white/90 px-2 py-1 border border-blue-200">
                    Usable token: {payload?.oauth.hasUsableToken ? 'Yes' : 'No'}
                </span>
                <button
                    type="button"
                    onClick={() => void loadCalendarConnections()}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            {isLoading ? (
                <div className="rounded-lg border border-blue-100 bg-white/80 px-4 py-4 text-sm text-gray-600">
                    Loading calendar connections...
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Connected calendars</h3>
                        {activeConnections.length === 0 ? (
                            <div className="rounded-lg border border-blue-100 bg-white/80 px-4 py-4 text-sm text-gray-600">
                                No active calendar connection for this agent yet.
                            </div>
                        ) : (
                            activeConnections.map((connection) => (
                                <div key={connection.id} className="rounded-lg border border-blue-100 bg-white/90 p-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {connection.provider.toUpperCase()} calendar
                                            </p>
                                            <p className="text-xs text-gray-600 break-all font-mono">{connection.calendarUrl}</p>
                                            <p className="text-xs text-gray-500">
                                                calendarId: <span className="font-mono">{connection.calendarId}</span>
                                            </p>
                                            {connection.scopes.length > 0 && (
                                                <p className="text-xs text-gray-500">
                                                    scopes: <span className="font-mono break-all">{connection.scopes.join(', ')}</span>
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void handleDisconnectConnection(connection)}
                                            disabled={disconnectingConnectionId === connection.id}
                                            className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                                        >
                                            <Unlink className="h-3 w-3" />
                                            Disconnect
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-6 space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Recent activity</h3>
                        {(payload?.activity || []).length === 0 ? (
                            <div className="rounded-lg border border-blue-100 bg-white/80 px-4 py-4 text-sm text-gray-600">
                                No calendar activity logged yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {(payload?.activity || []).map((activity) => (
                                    <div key={activity.id} className="rounded-lg border border-blue-100 bg-white/90 px-3 py-2">
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                                                {activity.operation}
                                            </span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 font-semibold ${
                                                    activity.status === 'success'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : activity.status === 'wallet-required'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-red-100 text-red-700'
                                                }`}
                                            >
                                                {activity.status}
                                            </span>
                                            <span className="text-gray-500">
                                                {new Date(activity.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        {activity.calendarUrl && (
                                            <p className="mt-1 text-[11px] text-gray-600 break-all font-mono">{activity.calendarUrl}</p>
                                        )}
                                        {activity.eventId && (
                                            <p className="text-[11px] text-gray-500">
                                                eventId: <span className="font-mono">{activity.eventId}</span>
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

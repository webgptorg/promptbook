'use client';

import { showConfirm } from '@/src/components/AsyncDialogs/asyncDialogs';
import { buildCalendarOAuthConnectUrl } from '@/src/utils/calendarOAuthClient';
import { Calendar, Link2, RefreshCw, Unlink } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Maximum number of recent calendar activity rows shown in the integration section.
 */
const CALENDAR_ACTIVITY_LIMIT = 12;

/**
 * Default calendar URL used before the first agent-specific connection exists.
 */
const DEFAULT_CALENDAR_URL = 'https://calendar.google.com/calendar/u/0/r';

/**
 * Default Google Calendar scope requested by the connect flow.
 */
const DEFAULT_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];

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
    const {
        activeConnections,
        disconnectConnection,
        disconnectingConnectionId,
        error,
        isLoading,
        isRefreshing,
        loadCalendarConnections,
        payload,
    } = useCalendarIntegrationState(agentName);

    /**
     * Redirects to Google Calendar OAuth connect/re-auth flow.
     */
    const handleConnectOrReauth = useCallback(() => {
        const connectUrl = buildAgentCalendarConnectUrl({
            activeConnections,
            agentName,
            agentPermanentId,
        });

        if (typeof window !== 'undefined') {
            window.location.assign(connectUrl);
        }
    }, [activeConnections, agentName, agentPermanentId]);

    return (
        <div className="p-6 rounded-xl border-2 border-blue-200 bg-blue-50/30 shadow-sm">
            <CalendarIntegrationHeader
                hasActiveConnections={activeConnections.length > 0}
                isOAuthConfigured={payload?.oauth.isConfigured === true}
                onConnectOrReauth={handleConnectOrReauth}
            />

            <CalendarIntegrationStatusRow
                hasUsableToken={payload?.oauth.hasUsableToken === true}
                isOAuthConfigured={payload?.oauth.isConfigured === true}
                isRefreshing={isRefreshing}
                onRefresh={() => void loadCalendarConnections()}
            />

            {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            {isLoading ? (
                <CalendarSectionMessage message="Loading calendar connections..." />
            ) : (
                <>
                    <CalendarConnectionsSection
                        activeConnections={activeConnections}
                        disconnectingConnectionId={disconnectingConnectionId}
                        onDisconnect={(connection) => void disconnectConnection(connection)}
                    />

                    <CalendarActivitySection activity={payload?.activity || []} />
                </>
            )}
        </div>
    );
}

/**
 * Manages loading and disconnect state for the calendar integration section.
 */
function useCalendarIntegrationState(agentName: string) {
    const [payload, setPayload] = useState<CalendarConnectionsPayload | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [disconnectingConnectionId, setDisconnectingConnectionId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadCalendarConnections = useCallback(async () => {
        setError(null);
        setIsRefreshing(true);

        try {
            setPayload(await fetchCalendarConnectionsPayload(agentName));
        } catch (loadError) {
            setError(resolveErrorMessage(loadError, 'Failed to load calendar connections.'));
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [agentName]);

    useEffect(() => {
        void loadCalendarConnections();
    }, [loadCalendarConnections]);

    const activeConnections = useMemo(
        () => getActiveCalendarConnections(payload?.connections),
        [payload?.connections],
    );

    /**
     * Disconnects one selected calendar connection from this agent.
     */
    const disconnectConnection = useCallback(
        async (connection: CalendarConnectionItem) => {
            if (!(await confirmCalendarDisconnect())) {
                return;
            }

            setDisconnectingConnectionId(connection.id);
            setError(null);

            try {
                await disconnectCalendarConnection(agentName, connection.id);
                await loadCalendarConnections();
            } catch (disconnectError) {
                setError(resolveErrorMessage(disconnectError, 'Failed to disconnect calendar connection.'));
            } finally {
                setDisconnectingConnectionId(null);
            }
        },
        [agentName, loadCalendarConnections],
    );

    return {
        activeConnections,
        disconnectConnection,
        disconnectingConnectionId,
        error,
        isLoading,
        isRefreshing,
        loadCalendarConnections,
        payload,
    };
}

/**
 * Loads the calendar-connections payload for one agent.
 */
async function fetchCalendarConnectionsPayload(agentName: string): Promise<CalendarConnectionsPayload> {
    const response = await fetch(
        `/agents/${encodeURIComponent(agentName)}/api/calendar-connections?activityLimit=${CALENDAR_ACTIVITY_LIMIT}`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        },
    );

    if (!response.ok) {
        throw new Error(await readCalendarApiErrorMessage(response, 'Failed to load calendar connections.'));
    }

    return (await response.json()) as CalendarConnectionsPayload;
}

/**
 * Disconnects one calendar connection from the current agent.
 */
async function disconnectCalendarConnection(agentName: string, connectionId: number): Promise<void> {
    const response = await fetch(
        `/agents/${encodeURIComponent(agentName)}/api/calendar-connections/${connectionId}/disconnect`,
        {
            method: 'POST',
            headers: {
                Accept: 'application/json',
            },
        },
    );

    if (!response.ok) {
        throw new Error(await readCalendarApiErrorMessage(response, 'Failed to disconnect calendar connection.'));
    }
}

/**
 * Reads one API error message from a failed calendar response.
 */
async function readCalendarApiErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
    const responsePayload = (await response.json().catch(() => null)) as { error?: string } | null;
    return responsePayload?.error || fallbackMessage;
}

/**
 * Resolves one UI-safe error message from an unknown thrown value.
 */
function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Filters the payload down to active calendar connections only.
 */
function getActiveCalendarConnections(
    connections: ReadonlyArray<CalendarConnectionItem> | undefined,
): CalendarConnectionItem[] {
    return (connections || []).filter((connection) => connection.status === 'CONNECTED');
}

/**
 * Confirms whether the current user wants to disconnect a calendar.
 */
async function confirmCalendarDisconnect(): Promise<boolean> {
    return showConfirm({
        title: 'Disconnect calendar',
        message: 'Do you want to disconnect this calendar from the current agent?',
        confirmLabel: 'Disconnect',
        cancelLabel: 'Cancel',
    }).catch(() => false);
}

/**
 * Builds the OAuth connect or re-auth URL for the current agent.
 */
function buildAgentCalendarConnectUrl(options: {
    activeConnections: ReadonlyArray<CalendarConnectionItem>;
    agentName: string;
    agentPermanentId: string;
}): string {
    const { calendarUrl, scopes } = resolveCalendarConnectDefaults(options.activeConnections);

    return buildCalendarOAuthConnectUrl({
        returnTo: resolveCalendarIntegrationReturnTo(options.agentName),
        isGlobal: false,
        isUserScoped: false,
        agentPermanentId: options.agentPermanentId,
        calendarUrl,
        scopes,
    });
}

/**
 * Resolves the default calendar URL and scopes for the next OAuth connect request.
 */
function resolveCalendarConnectDefaults(activeConnections: ReadonlyArray<CalendarConnectionItem>): {
    calendarUrl: string;
    scopes: string[];
} {
    const [firstActiveConnection] = activeConnections;

    if (!firstActiveConnection) {
        return {
            calendarUrl: DEFAULT_CALENDAR_URL,
            scopes: [...DEFAULT_CALENDAR_SCOPES],
        };
    }

    return {
        calendarUrl: firstActiveConnection.calendarUrl,
        scopes: firstActiveConnection.scopes,
    };
}

/**
 * Resolves the integration page URL to return to after OAuth completes.
 */
function resolveCalendarIntegrationReturnTo(agentName: string): string {
    if (typeof window !== 'undefined') {
        return `${window.location.pathname}${window.location.search}`;
    }

    return `/agents/${encodeURIComponent(agentName)}/integration`;
}

/**
 * Resolves the status badge classes for one activity item.
 */
function getCalendarActivityStatusClassName(status: string): string {
    if (status === 'success') {
        return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'wallet-required') {
        return 'bg-amber-100 text-amber-700';
    }

    return 'bg-red-100 text-red-700';
}

/**
 * Renders the calendar integration heading and primary action.
 */
function CalendarIntegrationHeader({
    hasActiveConnections,
    isOAuthConfigured,
    onConnectOrReauth,
}: {
    hasActiveConnections: boolean;
    isOAuthConfigured: boolean;
    onConnectOrReauth: () => void;
}) {
    return (
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
                onClick={onConnectOrReauth}
                disabled={!isOAuthConfigured}
                className="inline-flex items-center gap-2 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Link2 className="h-4 w-4" />
                {hasActiveConnections ? 'Re-auth' : 'Connect'}
            </button>
        </div>
    );
}

/**
 * Renders OAuth and refresh status chips for the calendar integration section.
 */
function CalendarIntegrationStatusRow({
    hasUsableToken,
    isOAuthConfigured,
    isRefreshing,
    onRefresh,
}: {
    hasUsableToken: boolean;
    isOAuthConfigured: boolean;
    isRefreshing: boolean;
    onRefresh: () => void;
}) {
    return (
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-700">
            <span className="rounded-full bg-white/90 px-2 py-1 border border-blue-200">
                OAuth configured: {isOAuthConfigured ? 'Yes' : 'No'}
            </span>
            <span className="rounded-full bg-white/90 px-2 py-1 border border-blue-200">
                Usable token: {hasUsableToken ? 'Yes' : 'No'}
            </span>
            <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-60"
            >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
            </button>
        </div>
    );
}

/**
 * Renders one reusable informational message card within the calendar section.
 */
function CalendarSectionMessage({ message }: { message: string }) {
    return <div className="rounded-lg border border-blue-100 bg-white/80 px-4 py-4 text-sm text-gray-600">{message}</div>;
}

/**
 * Renders the connected-calendar list section.
 */
function CalendarConnectionsSection({
    activeConnections,
    disconnectingConnectionId,
    onDisconnect,
}: {
    activeConnections: ReadonlyArray<CalendarConnectionItem>;
    disconnectingConnectionId: number | null;
    onDisconnect: (connection: CalendarConnectionItem) => void;
}) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Connected calendars</h3>
            {activeConnections.length === 0 ? (
                <CalendarSectionMessage message="No active calendar connection for this agent yet." />
            ) : (
                activeConnections.map((connection) => (
                    <CalendarConnectionCard
                        key={connection.id}
                        connection={connection}
                        isDisconnecting={disconnectingConnectionId === connection.id}
                        onDisconnect={onDisconnect}
                    />
                ))
            )}
        </div>
    );
}

/**
 * Renders one connected-calendar card row.
 */
function CalendarConnectionCard({
    connection,
    isDisconnecting,
    onDisconnect,
}: {
    connection: CalendarConnectionItem;
    isDisconnecting: boolean;
    onDisconnect: (connection: CalendarConnectionItem) => void;
}) {
    return (
        <div className="rounded-lg border border-blue-100 bg-white/90 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{connection.provider.toUpperCase()} calendar</p>
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
                    onClick={() => onDisconnect(connection)}
                    disabled={isDisconnecting}
                    className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                    <Unlink className="h-3 w-3" />
                    Disconnect
                </button>
            </div>
        </div>
    );
}

/**
 * Renders the recent calendar activity section.
 */
function CalendarActivitySection({ activity }: { activity: ReadonlyArray<CalendarActivityItem> }) {
    return (
        <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Recent activity</h3>
            {activity.length === 0 ? (
                <CalendarSectionMessage message="No calendar activity logged yet." />
            ) : (
                <div className="space-y-2">
                    {activity.map((item) => (
                        <CalendarActivityCard key={item.id} activity={item} />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Renders one recent calendar activity row.
 */
function CalendarActivityCard({ activity }: { activity: CalendarActivityItem }) {
    return (
        <div className="rounded-lg border border-blue-100 bg-white/90 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                    {activity.operation}
                </span>
                <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${getCalendarActivityStatusClassName(activity.status)}`}
                >
                    {activity.status}
                </span>
                <span className="text-gray-500">{new Date(activity.createdAt).toLocaleString()}</span>
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
    );
}

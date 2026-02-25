import { NextRequest, NextResponse } from 'next/server';
import { $getTableName } from '../../../database/$getTableName';
import { $provideSupabase } from '../../../database/$provideSupabase';
import type { AgentsServerDatabase } from '../../../database/schema';
import { buildFolderTree, collectDescendantFolderIds } from '../../../utils/agentOrganization/folderTree';
import { loadAgentOrganizationState } from '../../../utils/agentOrganization/loadAgentOrganizationState';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import type {
    UsageActorType,
    UsageAnalyticsResponse,
    UsageCallType,
    UsageTimeframePreset,
} from '../../../utils/usageAdmin';

/**
 * One raw chat-history row used by usage analytics.
 */
type ChatHistoryRow = Pick<
    AgentsServerDatabase['public']['Tables']['ChatHistory']['Row'],
    'createdAt' | 'agentName' | 'message' | 'source' | 'apiKey' | 'userAgent' | 'actorType' | 'usage' | 'userId'
>;

/**
 * Supported call types in UI order.
 */
const CALL_TYPES: UsageCallType[] = ['WEB_CHAT', 'VOICE_CHAT', 'COMPATIBLE_API'];

/**
 * Supported actor types in UI order.
 */
const ACTOR_TYPES: UsageActorType[] = ['ANONYMOUS', 'TEAM_MEMBER', 'API_KEY'];

/**
 * Default timeframe preset used when query value is missing/invalid.
 */
const DEFAULT_TIMEFRAME_PRESET: UsageTimeframePreset = '30d';

/**
 * Query page size used while scanning chat-history rows.
 */
const CHAT_HISTORY_PAGE_SIZE = 1000;

/**
 * Lists aggregated usage analytics for admins.
 */
export async function GET(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const timeframe = resolveTimeframe(searchParams);
        if (!timeframe) {
            return NextResponse.json({ error: 'Invalid timeframe query.' }, { status: 400 });
        }

        const callTypeFilter = parseUsageCallType(searchParams.get('callType'));
        const actorTypeFilter = parseUsageActorType(searchParams.get('actorType'));
        const requestedAgentName = normalizeOptionalText(searchParams.get('agentName'));
        const requestedFolderId = parseOptionalFolderId(searchParams.get('folderId'));
        if (searchParams.get('folderId') && requestedFolderId === null) {
            return NextResponse.json({ error: 'Invalid folderId query.' }, { status: 400 });
        }

        const organizationState = await loadAgentOrganizationState({ status: 'ACTIVE', includePrivate: true });
        const folderTree = buildFolderTree(organizationState.folders);
        const folderById = folderTree.folderById;
        const agentFolderByName = new Map(
            organizationState.agents.map((agent) => [agent.agentName, agent.folderId] as const),
        );

        const allowedAgentNames = resolveAllowedAgentNames({
            requestedAgentName,
            requestedFolderId,
            agents: organizationState.agents,
            childrenByParentId: folderTree.childrenByParentId,
        });

        if (allowedAgentNames !== null && allowedAgentNames.size === 0) {
            const emptyResponse: UsageAnalyticsResponse = {
                timeframe: timeframe.serialized,
                filters: {
                    agentName: requestedAgentName,
                    folderId: requestedFolderId,
                    callType: callTypeFilter,
                    actorType: actorTypeFilter,
                },
                summary: {
                    totalCalls: 0,
                    totalTokens: 0,
                    totalPriceUsd: 0,
                    totalDuration: 0,
                    uniqueAgents: 0,
                    uniqueUsers: 0,
                    uniqueApiKeys: 0,
                    uniqueUserAgents: 0,
                },
                timeline: [],
                breakdownByCallType: CALL_TYPES.map((key) => ({
                    key,
                    label: callTypeLabel(key),
                    calls: 0,
                    tokens: 0,
                    priceUsd: 0,
                    duration: 0,
                })),
                breakdownByActorType: ACTOR_TYPES.map((key) => ({
                    key,
                    label: actorTypeLabel(key),
                    calls: 0,
                    tokens: 0,
                    priceUsd: 0,
                    duration: 0,
                })),
                perAgent: [],
                perFolder: [],
                perUser: [],
                apiKeys: [],
                userAgents: [],
            };

            return NextResponse.json(emptyResponse);
        }

        const rows = await fetchChatHistoryRows({
            fromIso: timeframe.from.toISOString(),
            toIso: timeframe.to.toISOString(),
            allowedAgentNames,
        });

        const filteredCalls = rows
            .filter((row) => isUserCallRow(row))
            .map((row) => {
                const callType = resolveCallType(row);
                const actorType = resolveActorType(row);
                const userAgent = normalizeUserAgent(row.userAgent);
                const apiKey = normalizeOptionalText(row.apiKey);
                const usage = row.usage as {
                    input?: { tokensCount?: { value?: number } };
                    output?: { tokensCount?: { value?: number } };
                    price?: { value?: number };
                    duration?: { value?: number };
                } | null;
                const tokens = (usage?.input?.tokensCount?.value || 0) + (usage?.output?.tokensCount?.value || 0);
                const priceUsd = usage?.price?.value || 0;
                const duration = usage?.duration?.value || 0;

                return {
                    createdAt: row.createdAt,
                    agentName: row.agentName,
                    callType,
                    actorType,
                    userId: row.userId,
                    apiKey,
                    userAgent,
                    tokens,
                    priceUsd,
                    duration,
                };
            })
            .filter((call) => {
                if (callTypeFilter && call.callType !== callTypeFilter) {
                    return false;
                }
                if (actorTypeFilter && call.actorType !== actorTypeFilter) {
                    return false;
                }
                return true;
            });

        const bucketSizeMs = resolveTimelineBucketSizeMs(timeframe.from.getTime(), timeframe.to.getTime());
        const timelineByBucket = new Map<
            number,
            { calls: number; tokens: number; priceUsd: number; duration: number }
        >();
        const perAgentCounts = new Map<string, { calls: number; tokens: number; priceUsd: number; duration: number }>();
        const perFolderCounts = new Map<
            number | null,
            { calls: number; tokens: number; priceUsd: number; duration: number }
        >();
        const callTypeCounts = new Map<
            UsageCallType,
            { calls: number; tokens: number; priceUsd: number; duration: number }
        >();
        const actorTypeCounts = new Map<
            UsageActorType,
            { calls: number; tokens: number; priceUsd: number; duration: number }
        >();
        const perUserCounts = new Map<
            number | null,
            { calls: number; tokens: number; priceUsd: number; duration: number; lastSeen: string }
        >();
        const apiKeyDetails = new Map<
            string,
            { calls: number; tokens: number; priceUsd: number; duration: number; lastSeen: string }
        >();
        const userAgentDetails = new Map<
            string,
            { calls: number; tokens: number; priceUsd: number; duration: number; lastSeen: string }
        >();

        for (const call of filteredCalls) {
            const timestamp = Date.parse(call.createdAt);
            if (Number.isNaN(timestamp)) {
                continue;
            }

            const bucketKey = floorToBucket(timestamp, bucketSizeMs);
            const { tokens = 0, priceUsd = 0, duration = 0 } = call;

            const updateCount = (
                current: { calls: number; tokens: number; priceUsd: number; duration: number } | undefined,
            ) => ({
                calls: (current?.calls || 0) + 1,
                tokens: (current?.tokens || 0) + tokens,
                priceUsd: (current?.priceUsd || 0) + priceUsd,
                duration: (current?.duration || 0) + duration,
            });

            timelineByBucket.set(bucketKey, updateCount(timelineByBucket.get(bucketKey)));
            perAgentCounts.set(call.agentName, updateCount(perAgentCounts.get(call.agentName)));
            callTypeCounts.set(call.callType, updateCount(callTypeCounts.get(call.callType)));
            actorTypeCounts.set(call.actorType, updateCount(actorTypeCounts.get(call.actorType)));

            const folderId = agentFolderByName.get(call.agentName) ?? null;
            perFolderCounts.set(folderId, updateCount(perFolderCounts.get(folderId)));

            const existingUser = perUserCounts.get(call.userId);
            perUserCounts.set(call.userId, {
                calls: (existingUser?.calls || 0) + 1,
                tokens: (existingUser?.tokens || 0) + tokens,
                priceUsd: (existingUser?.priceUsd || 0) + priceUsd,
                duration: (existingUser?.duration || 0) + duration,
                lastSeen:
                    existingUser?.lastSeen && existingUser.lastSeen > call.createdAt
                        ? existingUser.lastSeen
                        : call.createdAt,
            });

            if (call.apiKey) {
                const existing = apiKeyDetails.get(call.apiKey);
                apiKeyDetails.set(call.apiKey, {
                    calls: (existing?.calls || 0) + 1,
                    tokens: (existing?.tokens || 0) + tokens,
                    priceUsd: (existing?.priceUsd || 0) + priceUsd,
                    duration: (existing?.duration || 0) + duration,
                    lastSeen:
                        existing?.lastSeen && existing.lastSeen > call.createdAt ? existing.lastSeen : call.createdAt,
                });
            }

            const existingUserAgent = userAgentDetails.get(call.userAgent);
            userAgentDetails.set(call.userAgent, {
                calls: (existingUserAgent?.calls || 0) + 1,
                tokens: (existingUserAgent?.tokens || 0) + tokens,
                priceUsd: (existingUserAgent?.priceUsd || 0) + priceUsd,
                duration: (existingUserAgent?.duration || 0) + duration,
                lastSeen:
                    existingUserAgent?.lastSeen && existingUserAgent.lastSeen > call.createdAt
                        ? existingUserAgent.lastSeen
                        : call.createdAt,
            });
        }

        const usernamesById = await resolveUsernamesForIds(
            [...perUserCounts.keys()].filter((userId): userId is number => typeof userId === 'number'),
        );
        const apiKeyNotes = await resolveApiKeyNotes([...apiKeyDetails.keys()]);

        const timeline = createTimelineSeries({
            from: timeframe.from.getTime(),
            to: timeframe.to.getTime(),
            bucketSizeMs,
            timelineByBucket,
        });

        const perAgent = [...perAgentCounts.entries()]
            .map(([agentName, stats]) => ({ agentName, ...stats }))
            .sort((a, b) => b.calls - a.calls || a.agentName.localeCompare(b.agentName));

        const perFolder = [...perFolderCounts.entries()]
            .map(([folderId, stats]) => ({
                folderId,
                folderName: folderId === null ? 'Root folder' : folderById.get(folderId)?.name || `Folder #${folderId}`,
                ...stats,
            }))
            .sort((a, b) => b.calls - a.calls || a.folderName.localeCompare(b.folderName));

        const perUser = [...perUserCounts.entries()]
            .map(([userId, stats]) => ({
                userId,
                username: resolveUsageUsername(userId, usernamesById),
                ...stats,
            }))
            .sort((a, b) => b.calls - a.calls || b.lastSeen.localeCompare(a.lastSeen));

        const uniqueUserIds = new Set(
            [...perUserCounts.keys()].filter((userId): userId is number => typeof userId === 'number'),
        );

        const apiKeys = [...apiKeyDetails.entries()]
            .map(([apiKey, detail]) => ({
                apiKey,
                note: apiKeyNotes.get(apiKey) || null,
                calls: detail.calls,
                tokens: detail.tokens,
                priceUsd: detail.priceUsd,
                duration: detail.duration,
                lastSeen: detail.lastSeen,
            }))
            .sort((a, b) => b.calls - a.calls || b.lastSeen.localeCompare(a.lastSeen));

        const userAgents = [...userAgentDetails.entries()]
            .map(([userAgent, detail]) => ({
                userAgent,
                calls: detail.calls,
                tokens: detail.tokens,
                priceUsd: detail.priceUsd,
                duration: detail.duration,
                lastSeen: detail.lastSeen,
            }))
            .sort((a, b) => b.calls - a.calls || b.lastSeen.localeCompare(a.lastSeen));

        const response: UsageAnalyticsResponse = {
            timeframe: timeframe.serialized,
            filters: {
                agentName: requestedAgentName,
                folderId: requestedFolderId,
                callType: callTypeFilter,
                actorType: actorTypeFilter,
            },
            summary: {
                totalCalls: filteredCalls.length,
                totalTokens: filteredCalls.reduce((sum, call) => sum + (call.tokens || 0), 0),
                totalPriceUsd: filteredCalls.reduce((sum, call) => sum + (call.priceUsd || 0), 0),
                totalDuration: filteredCalls.reduce((sum, call) => sum + (call.duration || 0), 0),
                uniqueAgents: perAgentCounts.size,
                uniqueUsers: uniqueUserIds.size,
                uniqueApiKeys: apiKeyDetails.size,
                uniqueUserAgents: userAgentDetails.size,
            },
            timeline,
            breakdownByCallType: CALL_TYPES.map((key) => {
                const stats = callTypeCounts.get(key) || { calls: 0, tokens: 0, priceUsd: 0, duration: 0 };
                return {
                    key,
                    label: callTypeLabel(key),
                    ...stats,
                };
            }),
            breakdownByActorType: ACTOR_TYPES.map((key) => {
                const stats = actorTypeCounts.get(key) || { calls: 0, tokens: 0, priceUsd: 0, duration: 0 };
                return {
                    key,
                    label: actorTypeLabel(key),
                    ...stats,
                };
            }),
            perAgent,
            perFolder,
            perUser: perUser.slice(0, 25),
            apiKeys: apiKeys.slice(0, 25),
            userAgents: userAgents.slice(0, 25),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Usage analytics error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Resolves allowed agent names for the selected scope.
 */
function resolveAllowedAgentNames(options: {
    requestedAgentName: string | null;
    requestedFolderId: number | null;
    agents: Array<{ agentName: string; folderId: number | null }>;
    childrenByParentId: Map<number | null, number[]>;
}): Set<string> | null {
    const { requestedAgentName, requestedFolderId, agents, childrenByParentId } = options;

    if (requestedAgentName) {
        return new Set([requestedAgentName]);
    }

    if (requestedFolderId === null) {
        return null;
    }

    const descendantIds = new Set(collectDescendantFolderIds(requestedFolderId, childrenByParentId));
    const inFolder = agents
        .filter((agent) => agent.folderId !== null && descendantIds.has(agent.folderId))
        .map((agent) => agent.agentName);
    return new Set(inFolder);
}

/**
 * Loads chat history rows in pages to avoid PostgREST row limits.
 */
async function fetchChatHistoryRows(options: {
    fromIso: string;
    toIso: string;
    allowedAgentNames: Set<string> | null;
}): Promise<ChatHistoryRow[]> {
    const { fromIso, toIso, allowedAgentNames } = options;
    const supabase = $provideSupabase();
    const tableName = await $getTableName('ChatHistory');
    const rows: ChatHistoryRow[] = [];

    for (let offset = 0; ; offset += CHAT_HISTORY_PAGE_SIZE) {
        let query = supabase
            .from(tableName)
            .select('createdAt, agentName, message, source, apiKey, userAgent, actorType, usage, userId')
            .gte('createdAt', fromIso)
            .lte('createdAt', toIso)
            .order('createdAt', { ascending: true });

        if (allowedAgentNames !== null) {
            query = query.in('agentName', [...allowedAgentNames]);
        }

        const { data, error } = await query.range(offset, offset + CHAT_HISTORY_PAGE_SIZE - 1);
        if (error) {
            throw new Error(`Failed to load usage rows: ${error.message}`);
        }

        const pageRows = (data || []) as ChatHistoryRow[];
        rows.push(...pageRows);

        if (pageRows.length < CHAT_HISTORY_PAGE_SIZE) {
            break;
        }
    }

    return rows;
}

/**
 * Resolves API token notes for details table rendering.
 */
async function resolveApiKeyNotes(apiKeys: string[]): Promise<Map<string, string | null>> {
    const notes = new Map<string, string | null>();
    if (apiKeys.length === 0) {
        return notes;
    }

    const supabase = $provideSupabase();
    const tableName = await $getTableName('ApiTokens');
    const { data, error } = await supabase.from(tableName).select('token, note').in('token', apiKeys);

    if (error) {
        console.warn('Usage analytics: failed to resolve API token notes.', error);
        return notes;
    }

    for (const row of (data || []) as Array<{ token: string; note: string | null }>) {
        notes.set(row.token, row.note);
    }

    return notes;
}

/**
 * Resolves usernames for a set of user ids.
 */
async function resolveUsernamesForIds(userIds: number[]): Promise<Map<number, string>> {
    const usernames = new Map<number, string>();
    if (userIds.length === 0) {
        return usernames;
    }

    const supabase = $provideSupabase();
    const tableName = await $getTableName('User');
    const { data, error } = await supabase.from(tableName).select('id, username').in('id', userIds);

    if (error) {
        console.warn('Usage analytics: failed to resolve usernames for usage rows.', error);
        return usernames;
    }

    for (const row of (data || []) as Array<{ id: number; username: string }>) {
        usernames.set(row.id, row.username);
    }

    return usernames;
}

/**
 * Resolves the display name used for one usage user bucket.
 */
function resolveUsageUsername(userId: number | null, usernamesById: Map<number, string>): string {
    if (userId === null) {
        return '(unattributed user)';
    }

    return usernamesById.get(userId) || `User #${userId}`;
}

/**
 * Parses query parameters into a validated timeframe window.
 */
function resolveTimeframe(searchParams: URLSearchParams): {
    preset: UsageTimeframePreset;
    from: Date;
    to: Date;
    serialized: UsageAnalyticsResponse['timeframe'];
} | null {
    const preset = parseTimeframePreset(searchParams.get('timeframe'));
    const now = new Date();

    if (preset === 'custom') {
        const fromRaw = searchParams.get('from');
        const toRaw = searchParams.get('to');
        if (!fromRaw || !toRaw) {
            return null;
        }

        const from = new Date(`${fromRaw}T00:00:00.000Z`);
        const to = new Date(`${toRaw}T23:59:59.999Z`);
        if (!isFiniteDate(from) || !isFiniteDate(to) || from > to) {
            return null;
        }

        return {
            preset,
            from,
            to,
            serialized: {
                from: from.toISOString(),
                to: to.toISOString(),
                preset,
            },
        };
    }

    const from = new Date(now.getTime() - timeframePresetMs(preset));
    return {
        preset,
        from,
        to: now,
        serialized: {
            from: from.toISOString(),
            to: now.toISOString(),
            preset,
        },
    };
}

/**
 * Builds a timeline series with zero-filled buckets.
 */
function createTimelineSeries(options: {
    from: number;
    to: number;
    bucketSizeMs: number;
    timelineByBucket: Map<number, { calls: number; tokens: number; priceUsd: number; duration: number }>;
}): UsageAnalyticsResponse['timeline'] {
    const { from, to, bucketSizeMs, timelineByBucket } = options;
    if (to < from) {
        return [];
    }

    const points: UsageAnalyticsResponse['timeline'] = [];
    const start = floorToBucket(from, bucketSizeMs);
    const end = floorToBucket(to, bucketSizeMs);

    for (let cursor = start; cursor <= end; cursor += bucketSizeMs) {
        const bucketVal = timelineByBucket.get(cursor);
        points.push({
            bucketStart: new Date(cursor).toISOString(),
            calls: bucketVal?.calls || 0,
            tokens: bucketVal?.tokens || 0,
            priceUsd: bucketVal?.priceUsd || 0,
            duration: bucketVal?.duration || 0,
        });
    }

    return points;
}

/**
 * Derives call type from one chat-history row.
 */
function resolveCallType(row: ChatHistoryRow): UsageCallType {
    if (row.source === 'OPENAI_API_COMPATIBILITY') {
        return 'COMPATIBLE_API';
    }

    const isVoiceCall =
        typeof row.message === 'object' &&
        row.message !== null &&
        (row.message as { isVoiceCall?: unknown }).isVoiceCall === true;

    return isVoiceCall ? 'VOICE_CHAT' : 'WEB_CHAT';
}

/**
 * Resolves actor type from row data with backward-compatible fallback.
 */
function resolveActorType(row: ChatHistoryRow): UsageActorType {
    if (row.actorType === 'ANONYMOUS' || row.actorType === 'TEAM_MEMBER' || row.actorType === 'API_KEY') {
        return row.actorType;
    }

    if (normalizeOptionalText(row.apiKey)) {
        return 'API_KEY';
    }

    if (row.source === 'OPENAI_API_COMPATIBILITY') {
        return 'TEAM_MEMBER';
    }

    return 'ANONYMOUS';
}

/**
 * Returns true when a row represents an incoming user call.
 */
function isUserCallRow(row: ChatHistoryRow): boolean {
    if (!row.message || typeof row.message !== 'object') {
        return false;
    }

    const role = (row.message as { role?: unknown }).role;
    return typeof role === 'string' && role.toUpperCase() === 'USER';
}

/**
 * Picks an adaptive bucket size based on selected timeframe span.
 */
function resolveTimelineBucketSizeMs(from: number, to: number): number {
    const spanMs = Math.max(0, to - from);
    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;

    if (spanMs <= 2 * dayMs) {
        return hourMs;
    }
    if (spanMs <= 14 * dayMs) {
        return 6 * hourMs;
    }
    return dayMs;
}

/**
 * Floors timestamp to the nearest bucket boundary.
 */
function floorToBucket(timestamp: number, bucketSizeMs: number): number {
    return Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;
}

/**
 * Parses timeframe preset with default fallback.
 */
function parseTimeframePreset(value: string | null): UsageTimeframePreset {
    if (value === '24h' || value === '7d' || value === '30d' || value === '90d' || value === 'custom') {
        return value;
    }
    return DEFAULT_TIMEFRAME_PRESET;
}

/**
 * Parses call-type filter from query.
 */
function parseUsageCallType(value: string | null): UsageCallType | null {
    if (value === 'WEB_CHAT' || value === 'VOICE_CHAT' || value === 'COMPATIBLE_API') {
        return value;
    }
    return null;
}

/**
 * Parses actor-type filter from query.
 */
function parseUsageActorType(value: string | null): UsageActorType | null {
    if (value === 'ANONYMOUS' || value === 'TEAM_MEMBER' || value === 'API_KEY') {
        return value;
    }
    return null;
}

/**
 * Parses optional folder id query value.
 */
function parseOptionalFolderId(value: string | null): number | null {
    if (!value) {
        return null;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

/**
 * Normalizes optional text query/column values.
 */
function normalizeOptionalText(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalizes user-agent values for grouping.
 */
function normalizeUserAgent(value: string | null): string {
    const normalized = normalizeOptionalText(value);
    return normalized || '(unknown user agent)';
}

/**
 * Maps preset values to time windows in milliseconds.
 */
function timeframePresetMs(preset: Exclude<UsageTimeframePreset, 'custom'>): number {
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    if (preset === '24h') {
        return day;
    }
    if (preset === '7d') {
        return 7 * day;
    }
    if (preset === '90d') {
        return 90 * day;
    }

    return 30 * day;
}

/**
 * Checks whether a Date is valid.
 */
function isFiniteDate(date: Date): boolean {
    return Number.isFinite(date.getTime());
}

/**
 * Human label for a call type.
 */
function callTypeLabel(callType: UsageCallType): string {
    if (callType === 'VOICE_CHAT') {
        return 'Voice chat';
    }
    if (callType === 'COMPATIBLE_API') {
        return 'Compatible API';
    }
    return 'Web chat';
}

/**
 * Human label for an actor type.
 */
function actorTypeLabel(actorType: UsageActorType): string {
    if (actorType === 'TEAM_MEMBER') {
        return 'Team member';
    }
    if (actorType === 'API_KEY') {
        return 'API key';
    }
    return 'Anonymous';
}

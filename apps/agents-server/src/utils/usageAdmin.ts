/**
 * Supported timeframe presets for usage analytics.
 */
export type UsageTimeframePreset = '24h' | '7d' | '30d' | '90d' | 'custom';

/**
 * Derived call type used in usage analytics.
 */
export type UsageCallType = 'WEB_CHAT' | 'VOICE_CHAT' | 'COMPATIBLE_API';

/**
 * Actor attribution stored on chat history rows.
 */
export type UsageActorType = 'ANONYMOUS' | 'TEAM_MEMBER' | 'API_KEY';

/**
 * One timeline bucket in the usage chart.
 */
export type UsageTimelinePoint = {
    bucketStart: string;
    calls: number;
    tokens: number;
    priceUsd: number;
    duration: number;
};

/**
 * One named usage breakdown entry.
 */
export type UsageBreakdownItem<TKey extends string> = {
    key: TKey;
    label: string;
    calls: number;
    tokens: number;
    priceUsd: number;
    duration: number;
};

/**
 * One per-agent usage entry.
 */
export type UsagePerAgentItem = {
    agentName: string;
    calls: number;
    tokens: number;
    priceUsd: number;
    duration: number;
};

/**
 * One per-folder usage entry.
 */
export type UsagePerFolderItem = {
    folderId: number | null;
    folderName: string;
    calls: number;
    tokens: number;
    priceUsd: number;
    duration: number;
};

/**
 * API key usage detail item.
 */
export type UsageApiKeyItem = {
    apiKey: string;
    note: string | null;
    calls: number;
    tokens: number;
    priceUsd: number;
    duration: number;
    lastSeen: string;
};

/**
 * User-agent usage detail item.
 */
export type UsageUserAgentItem = {
    userAgent: string;
    calls: number;
    tokens: number;
    priceUsd: number;
    duration: number;
    lastSeen: string;
};

/**
 * Per-user usage detail item.
 */
export type UsagePerUserItem = {
    userId: number | null;
    username: string;
    calls: number;
    tokens: number;
    priceUsd: number;
    duration: number;
    lastSeen: string;
};

/**
 * Summary metrics for the selected usage filters.
 */
export type UsageSummary = {
    totalCalls: number;
    totalTokens: number;
    totalPriceUsd: number;
    totalDuration: number;
    uniqueAgents: number;
    uniqueUsers: number;
    uniqueApiKeys: number;
    uniqueUserAgents: number;
};

/**
 * Full usage analytics API payload.
 */
export type UsageAnalyticsResponse = {
    timeframe: {
        from: string;
        to: string;
        preset: UsageTimeframePreset;
    };
    filters: {
        agentName: string | null;
        folderId: number | null;
        callType: UsageCallType | null;
        actorType: UsageActorType | null;
    };
    summary: UsageSummary;
    timeline: UsageTimelinePoint[];
    breakdownByCallType: UsageBreakdownItem<UsageCallType>[];
    breakdownByActorType: UsageBreakdownItem<UsageActorType>[];
    perAgent: UsagePerAgentItem[];
    perFolder: UsagePerFolderItem[];
    perUser: UsagePerUserItem[];
    apiKeys: UsageApiKeyItem[];
    userAgents: UsageUserAgentItem[];
};

/**
 * Client-side query parameters accepted by the usage analytics API.
 */
export type UsageAnalyticsQuery = {
    timeframe?: UsageTimeframePreset;
    from?: string;
    to?: string;
    agentName?: string;
    folderId?: number | null;
    callType?: UsageCallType;
    actorType?: UsageActorType;
};

/**
 * Folder option used by the usage page filters.
 */
export type UsageFolderOption = {
    id: number;
    name: string;
    parentId: number | null;
};

/**
 * Agent option used by the usage page filters.
 */
export type UsageAgentOption = {
    agentName: string;
    fullname: string | null;
    folderId: number | null;
};

/**
 * Builds query string for usage analytics API calls.
 */
function buildUsageQuery(params: UsageAnalyticsQuery): string {
    const searchParams = new URLSearchParams();

    if (params.timeframe) {
        searchParams.set('timeframe', params.timeframe);
    }
    if (params.from) {
        searchParams.set('from', params.from);
    }
    if (params.to) {
        searchParams.set('to', params.to);
    }
    if (params.agentName) {
        searchParams.set('agentName', params.agentName);
    }
    if (typeof params.folderId === 'number') {
        searchParams.set('folderId', String(params.folderId));
    }
    if (params.callType) {
        searchParams.set('callType', params.callType);
    }
    if (params.actorType) {
        searchParams.set('actorType', params.actorType);
    }

    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

/**
 * Fetches aggregated usage analytics from the admin usage endpoint.
 */
export async function $fetchUsageAnalytics(params: UsageAnalyticsQuery = {}): Promise<UsageAnalyticsResponse> {
    const query = buildUsageQuery(params);
    const response = await fetch(`/api/usage${query}`, { method: 'GET' });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load usage analytics');
    }

    return (await response.json()) as UsageAnalyticsResponse;
}

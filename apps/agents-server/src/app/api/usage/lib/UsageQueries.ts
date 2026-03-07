import { UsageActorType, UsageAnalyticsResponse, UsageCallType, UsageTimeframePreset } from '@/src/utils/usageAdmin';

const DEFAULT_TIMEFRAME_PRESET: UsageTimeframePreset = '30d';

/**
 * @private Helpers for parsing usage analytics query parameters.
 */
export const UsageQueries = {
    resolveTimeframe,
    parseUsageCallType,
    parseUsageActorType,
    parseOptionalFolderId,
} as const;

/**
 * @private Parses the requested timeframe window, falling back to the default if needed.
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
 * @private Converts a timeframe preset token into the corresponding value.
 */
function parseTimeframePreset(value: string | null): UsageTimeframePreset {
    if (value === '24h' || value === '7d' || value === '30d' || value === '90d' || value === 'custom') {
        return value;
    }
    return DEFAULT_TIMEFRAME_PRESET;
}

/**
 * @private Returns the millisecond span for each preset bucket.
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
 * @private Returns true when the provided Date is finite.
 */
function isFiniteDate(date: Date): boolean {
    return Number.isFinite(date.getTime());
}

/**
 * @private Parses the call type filter query into a typed value.
 */
function parseUsageCallType(value: string | null): UsageCallType | null {
    if (value === 'WEB_CHAT' || value === 'VOICE_CHAT' || value === 'COMPATIBLE_API') {
        return value;
    }
    return null;
}

/**
 * @private Parses the actor type filter query into a typed value.
 */
function parseUsageActorType(value: string | null): UsageActorType | null {
    if (value === 'ANONYMOUS' || value === 'TEAM_MEMBER' || value === 'API_KEY') {
        return value;
    }
    return null;
}

/**
 * @private Parses folder identifiers coming from query parameters.
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

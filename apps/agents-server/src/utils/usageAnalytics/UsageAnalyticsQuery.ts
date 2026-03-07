import type { UsageActorType, UsageCallType, UsageTimeframePreset } from '../usageAdmin';
import {
    UsageAnalyticsModel,
    type UsageAnalyticsRequestFilters,
    type UsageAnalyticsTimeframe,
} from './UsageAnalyticsModel';

/**
 * Successfully parsed usage analytics query.
 */
export type UsageAnalyticsParsedQuery = {
    timeframe: UsageAnalyticsTimeframe;
    filters: UsageAnalyticsRequestFilters;
};

/**
 * Query parsing outcome for usage analytics.
 */
export type UsageAnalyticsQueryParseResult =
    | {
          isValid: true;
          parsedQuery: UsageAnalyticsParsedQuery;
      }
    | {
          isValid: false;
          error: string;
      };

/**
 * Query parsing and formatting helpers for usage analytics.
 * @private function of getUsageAnalyticsResponse
 */
export const UsageAnalyticsQuery = {
    parseUsageAnalyticsQuery(searchParams: URLSearchParams): UsageAnalyticsQueryParseResult {
        const timeframe = resolveTimeframe(searchParams);
        if (!timeframe) {
            return { isValid: false, error: 'Invalid timeframe query.' };
        }

        const folderIdRaw = searchParams.get('folderId');
        const folderId = parseOptionalFolderId(folderIdRaw);
        if (folderIdRaw && folderId === null) {
            return { isValid: false, error: 'Invalid folderId query.' };
        }

        return {
            isValid: true,
            parsedQuery: {
                timeframe,
                filters: {
                    agentName: normalizeOptionalText(searchParams.get('agentName')),
                    folderId,
                    callType: parseUsageCallType(searchParams.get('callType')),
                    actorType: parseUsageActorType(searchParams.get('actorType')),
                },
            },
        };
    },

    resolveTimelineBucketSizeMs(from: number, to: number): number {
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
    },

    floorToBucket(timestamp: number, bucketSizeMs: number): number {
        return Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;
    },

    normalizeOptionalText(value: string | null | undefined): string | null {
        return normalizeOptionalText(value);
    },

    normalizeUserAgent(value: string | null): string {
        const normalized = normalizeOptionalText(value);
        return normalized || '(unknown user agent)';
    },

    callTypeLabel(callType: UsageCallType): string {
        if (callType === 'VOICE_CHAT') {
            return 'Voice chat';
        }
        if (callType === 'COMPATIBLE_API') {
            return 'Compatible API';
        }
        return 'Web chat';
    },

    actorTypeLabel(actorType: UsageActorType): string {
        if (actorType === 'TEAM_MEMBER') {
            return 'Team member';
        }
        if (actorType === 'API_KEY') {
            return 'API key';
        }
        return 'Anonymous';
    },
};

/**
 * Parses query parameters into a validated timeframe window.
 */
function resolveTimeframe(searchParams: URLSearchParams): UsageAnalyticsTimeframe | null {
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
 * Parses timeframe preset with default fallback.
 */
function parseTimeframePreset(value: string | null): UsageTimeframePreset {
    if (value === '24h' || value === '7d' || value === '30d' || value === '90d' || value === 'custom') {
        return value;
    }
    return UsageAnalyticsModel.DEFAULT_TIMEFRAME_PRESET;
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

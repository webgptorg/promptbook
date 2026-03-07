import { UsageActorType, UsageAnalyticsResponse, UsageCallType } from '@/src/utils/usageAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { buildFolderTree } from '../../../utils/agentOrganization/folderTree';
import { loadAgentOrganizationState } from '../../../utils/agentOrganization/loadAgentOrganizationState';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { UsageDataAccess } from './lib/UsageDataAccess';
import { UsageLabels } from './lib/UsageLabels';
import { UsageMetrics } from './lib/UsageMetrics';
import { UsageNormalization } from './lib/UsageNormalization';
import { UsageQueries } from './lib/UsageQueries';
import { UsageScope } from './lib/UsageScope';
import { UsageTimeline } from './lib/UsageTimeline';
import type { UsageAggregate } from './UsageAggregate';
import type { UsageAggregateWithLastSeen } from './UsageAggregateWithLastSeen';

/**
 * Supported call types in UI order.
 * @private
 */
const CALL_TYPES: UsageCallType[] = ['WEB_CHAT', 'VOICE_CHAT', 'COMPATIBLE_API'];

/**
 * Supported actor types in UI order.
 * @private
 */
const ACTOR_TYPES: UsageActorType[] = ['ANONYMOUS', 'TEAM_MEMBER', 'API_KEY'];

/**
 * @private Lists aggregated usage analytics for admins.
 */
export async function GET(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const timeframe = UsageQueries.resolveTimeframe(searchParams);
        if (!timeframe) {
            return NextResponse.json({ error: 'Invalid timeframe query.' }, { status: 400 });
        }

        const callTypeFilter = UsageQueries.parseUsageCallType(searchParams.get('callType'));
        const actorTypeFilter = UsageQueries.parseUsageActorType(searchParams.get('actorType'));
        const requestedAgentName = UsageNormalization.normalizeOptionalText(searchParams.get('agentName'));
        const requestedFolderId = UsageQueries.parseOptionalFolderId(searchParams.get('folderId'));
        if (searchParams.get('folderId') && requestedFolderId === null) {
            return NextResponse.json({ error: 'Invalid folderId query.' }, { status: 400 });
        }

        const organizationState = await loadAgentOrganizationState({ status: 'ACTIVE', includePrivate: true });
        const folderTree = buildFolderTree(organizationState.folders);
        const folderById = folderTree.folderById;
        const agentFolderByName = new Map(
            organizationState.agents.map((agent) => [agent.agentName, agent.folderId] as const),
        );

        const allowedAgentNames = UsageScope.resolveAllowedAgentNames({
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
                    totalHumanDuration: 0,
                    uniqueAgents: 0,
                    uniqueUsers: 0,
                    uniqueApiKeys: 0,
                    uniqueUserAgents: 0,
                },
                timeline: [],
                breakdownByCallType: CALL_TYPES.map((key) => ({
                    key,
                    label: UsageLabels.callTypeLabel(key),
                    calls: 0,
                    tokens: 0,
                    priceUsd: 0,
                    duration: 0,
                    humanDuration: 0,
                })),
                breakdownByActorType: ACTOR_TYPES.map((key) => ({
                    key,
                    label: UsageLabels.actorTypeLabel(key),
                    calls: 0,
                    tokens: 0,
                    priceUsd: 0,
                    duration: 0,
                    humanDuration: 0,
                })),
                perAgent: [],
                perFolder: [],
                perUser: [],
                apiKeys: [],
                userAgents: [],
            };

            return NextResponse.json(emptyResponse);
        }

        const rows = await UsageDataAccess.fetchChatHistoryRows({
            fromIso: timeframe.from.toISOString(),
            toIso: timeframe.to.toISOString(),
            allowedAgentNames,
        });

        const filteredCalls = rows
            .filter((row) => UsageMetrics.isUserCallRow(row))
            .map((row) => {
                const callType = UsageMetrics.resolveCallType(row);
                const actorType = UsageMetrics.resolveActorType(row);
                const userAgent = UsageNormalization.normalizeUserAgent(row.userAgent);
                const apiKey = UsageNormalization.normalizeOptionalText(row.apiKey);
                const { tokens, priceUsd, duration, humanDuration } = UsageMetrics.extractUsageMetrics(row.usage);

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
                    humanDuration,
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

        const bucketSizeMs = UsageTimeline.resolveTimelineBucketSizeMs(
            timeframe.from.getTime(),
            timeframe.to.getTime(),
        );
        const timelineByBucket = new Map<number, UsageAggregate>();
        const perAgentCounts = new Map<string, UsageAggregate>();
        const perFolderCounts = new Map<number | null, UsageAggregate>();
        const callTypeCounts = new Map<UsageCallType, UsageAggregate>();
        const actorTypeCounts = new Map<UsageActorType, UsageAggregate>();
        const perUserCounts = new Map<number | null, UsageAggregateWithLastSeen>();
        const apiKeyDetails = new Map<string, UsageAggregateWithLastSeen>();
        const userAgentDetails = new Map<string, UsageAggregateWithLastSeen>();

        for (const call of filteredCalls) {
            const timestamp = Date.parse(call.createdAt);
            if (Number.isNaN(timestamp)) {
                continue;
            }

            const bucketKey = UsageTimeline.floorToBucket(timestamp, bucketSizeMs);
            const usageAggregate = {
                tokens: call.tokens || 0,
                priceUsd: call.priceUsd || 0,
                duration: call.duration || 0,
                humanDuration: call.humanDuration || 0,
            };

            timelineByBucket.set(
                bucketKey,
                UsageMetrics.sumUsageAggregate(timelineByBucket.get(bucketKey), usageAggregate),
            );
            perAgentCounts.set(
                call.agentName,
                UsageMetrics.sumUsageAggregate(perAgentCounts.get(call.agentName), usageAggregate),
            );
            callTypeCounts.set(
                call.callType,
                UsageMetrics.sumUsageAggregate(callTypeCounts.get(call.callType), usageAggregate),
            );
            actorTypeCounts.set(
                call.actorType,
                UsageMetrics.sumUsageAggregate(actorTypeCounts.get(call.actorType), usageAggregate),
            );

            const folderId = agentFolderByName.get(call.agentName) ?? null;
            perFolderCounts.set(
                folderId,
                UsageMetrics.sumUsageAggregate(perFolderCounts.get(folderId), usageAggregate),
            );

            const existingUser = perUserCounts.get(call.userId);
            perUserCounts.set(call.userId, {
                calls: (existingUser?.calls || 0) + 1,
                tokens: (existingUser?.tokens || 0) + usageAggregate.tokens,
                priceUsd: (existingUser?.priceUsd || 0) + usageAggregate.priceUsd,
                duration: (existingUser?.duration || 0) + usageAggregate.duration,
                humanDuration: (existingUser?.humanDuration || 0) + usageAggregate.humanDuration,
                lastSeen:
                    existingUser?.lastSeen && existingUser.lastSeen > call.createdAt
                        ? existingUser.lastSeen
                        : call.createdAt,
            });

            if (call.apiKey) {
                const existing = apiKeyDetails.get(call.apiKey);
                apiKeyDetails.set(call.apiKey, {
                    calls: (existing?.calls || 0) + 1,
                    tokens: (existing?.tokens || 0) + usageAggregate.tokens,
                    priceUsd: (existing?.priceUsd || 0) + usageAggregate.priceUsd,
                    duration: (existing?.duration || 0) + usageAggregate.duration,
                    humanDuration: (existing?.humanDuration || 0) + usageAggregate.humanDuration,
                    lastSeen:
                        existing?.lastSeen && existing.lastSeen > call.createdAt ? existing.lastSeen : call.createdAt,
                });
            }

            const existingUserAgent = userAgentDetails.get(call.userAgent);
            userAgentDetails.set(call.userAgent, {
                calls: (existingUserAgent?.calls || 0) + 1,
                tokens: (existingUserAgent?.tokens || 0) + usageAggregate.tokens,
                priceUsd: (existingUserAgent?.priceUsd || 0) + usageAggregate.priceUsd,
                duration: (existingUserAgent?.duration || 0) + usageAggregate.duration,
                humanDuration: (existingUserAgent?.humanDuration || 0) + usageAggregate.humanDuration,
                lastSeen:
                    existingUserAgent?.lastSeen && existingUserAgent.lastSeen > call.createdAt
                        ? existingUserAgent.lastSeen
                        : call.createdAt,
            });
        }

        const usernamesById = await UsageDataAccess.resolveUsernamesForIds(
            [...perUserCounts.keys()].filter((userId): userId is number => typeof userId === 'number'),
        );
        const apiKeyNotes = await UsageDataAccess.resolveApiKeyNotes([...apiKeyDetails.keys()]);

        const timeline = UsageTimeline.createTimelineSeries({
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
                username: UsageDataAccess.resolveUsageUsername(userId, usernamesById),
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
                humanDuration: detail.humanDuration,
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
                humanDuration: detail.humanDuration,
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
                totalHumanDuration: filteredCalls.reduce((sum, call) => sum + (call.humanDuration || 0), 0),
                uniqueAgents: perAgentCounts.size,
                uniqueUsers: uniqueUserIds.size,
                uniqueApiKeys: apiKeyDetails.size,
                uniqueUserAgents: userAgentDetails.size,
            },
            timeline,
            breakdownByCallType: CALL_TYPES.map((key) => {
                const stats = callTypeCounts.get(key) || {
                    calls: 0,
                    tokens: 0,
                    priceUsd: 0,
                    duration: 0,
                    humanDuration: 0,
                };
                return {
                    key,
                    label: UsageLabels.callTypeLabel(key),
                    ...stats,
                };
            }),
            breakdownByActorType: ACTOR_TYPES.map((key) => {
                const stats = actorTypeCounts.get(key) || {
                    calls: 0,
                    tokens: 0,
                    priceUsd: 0,
                    duration: 0,
                    humanDuration: 0,
                };
                return {
                    key,
                    label: UsageLabels.actorTypeLabel(key),
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

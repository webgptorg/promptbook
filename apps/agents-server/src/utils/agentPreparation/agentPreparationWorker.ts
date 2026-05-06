import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { createServerAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/createServerAgentReferenceResolver';
import { AgentKitCacheManager } from '@/src/utils/cache/AgentKitCacheManager';
import {
    resolveCachedServerAgentContext,
    resolveCachedServerAgentModelRequirements,
} from '@/src/utils/cachedServerAgentRuntime';
import { getFederatedServers } from '@/src/utils/getFederatedServers';
import { resolveInternalServerOrigin } from '@/src/utils/resolveInternalServerOrigin';
import { retryWithBackoff } from '@/src/utils/retryWithBackoff';
import { AgentCollectionInSupabase } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import {
    AGENT_PREPARATION_DEBOUNCE_MS,
    AGENT_PREPARATION_MAX_JOBS_PER_TICK,
    AGENT_PREPARATION_WAKEUP_BUFFER_MS,
} from './agentPreparationConstants';
import { incrementAgentPreparationMetric, logAgentPreparation } from './agentPreparationMetrics';
import {
    createAgentPreparationRepository,
    type AgentPreparationRepository,
} from './agentPreparationRepository';
import {
    isRetryableAgentPreparationError,
    normalizeAgentPreparationTablePrefix,
    resolveAgentPreparationFailureBackoffMs,
    shouldDisableAgentPreparationBackgroundWorkerLoop,
} from './agentPreparationShared';
import { triggerAgentPreparationWorker } from './triggerAgentPreparationWorker';
import type { AgentPreparationRow } from './agentPreparationTypes';

/**
 * Prefixes discovered from request-scoped writes that should be processed by the worker loop.
 *
 * @private function of agentPreparation
 */
const ACTIVE_TABLE_PREFIXES = new Set<string>();

/**
 * One-shot wake-up timeout handles keyed by table prefix.
 *
 * @private function of agentPreparation
 */
const AGENT_PREPARATION_WAKEUP_TIMEOUTS_BY_PREFIX = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Guard preventing overlapping worker ticks in one process.
 *
 * @private function of agentPreparation
 */
let isAgentPreparationWorkerTickRunning = false;

/**
 * Registers a prefix for future worker processing and triggers a best-effort worker tick.
 *
 * @private function of agentPreparation
 */
export function registerAgentPreparationPrefix(tablePrefix: string): void {
    ACTIVE_TABLE_PREFIXES.add(normalizeAgentPreparationTablePrefix(tablePrefix));
    kickAgentPreparationWorkerTick();
}

/**
 * Triggers one immediate best-effort worker tick without awaiting completion.
 *
 * @private function of agentPreparation
 */
export function kickAgentPreparationWorkerTick(): void {
    if (shouldDisableAgentPreparationBackgroundWorkerLoop()) {
        return;
    }

    void runAgentPreparationWorkerTick();
}

/**
 * Schedules one per-prefix wake-up tick near the next expected due timestamp.
 *
 * @private function of agentPreparation
 */
export function scheduleAgentPreparationWakeup(tablePrefix: string, wakeAtIso: string): void {
    if (shouldDisableAgentPreparationBackgroundWorkerLoop()) {
        return;
    }

    const wakeAtTimestamp = new Date(wakeAtIso).getTime();
    if (!Number.isFinite(wakeAtTimestamp)) {
        kickAgentPreparationWorkerTick();
        return;
    }

    const delayMs = Math.max(0, wakeAtTimestamp - Date.now()) + AGENT_PREPARATION_WAKEUP_BUFFER_MS;
    const normalizedTablePrefix = normalizeAgentPreparationTablePrefix(tablePrefix);
    const existingWakeupTimeout = AGENT_PREPARATION_WAKEUP_TIMEOUTS_BY_PREFIX.get(normalizedTablePrefix);

    if (existingWakeupTimeout) {
        clearTimeout(existingWakeupTimeout);
    }

    const wakeupTimeout = setTimeout(() => {
        AGENT_PREPARATION_WAKEUP_TIMEOUTS_BY_PREFIX.delete(normalizedTablePrefix);
        void triggerAgentPreparationWorker({
            origin: resolveInternalServerOrigin(),
            tablePrefix: normalizedTablePrefix,
        }).catch((error) => {
            console.warn('[agent-preparation] Failed to trigger worker route, falling back to in-process tick.', {
                tablePrefix: normalizedTablePrefix,
                error: serializeError(error as Error),
            });
            void runAgentPreparationWorkerTick({
                tablePrefix: normalizedTablePrefix,
            });
        });
    }, delayMs);

    wakeupTimeout.unref?.();
    AGENT_PREPARATION_WAKEUP_TIMEOUTS_BY_PREFIX.set(normalizedTablePrefix, wakeupTimeout);
}

/**
 * Executes one worker tick across all active prefixes without overlap.
 *
 * @private function of agentPreparation
 */
export async function runAgentPreparationWorkerTick(options: { tablePrefix?: string } = {}): Promise<void> {
    if (isAgentPreparationWorkerTickRunning) {
        return;
    }

    const tablePrefixesToProcess = options.tablePrefix
        ? [normalizeAgentPreparationTablePrefix(options.tablePrefix)]
        : [...ACTIVE_TABLE_PREFIXES];

    if (tablePrefixesToProcess.length === 0) {
        return;
    }

    isAgentPreparationWorkerTickRunning = true;

    try {
        for (const tablePrefix of tablePrefixesToProcess) {
            await processDueAgentPreparationJobsForPrefix(tablePrefix);
        }
    } catch (error) {
        console.error('[pre-index] Worker tick failed:', serializeError(error as Error));
    } finally {
        isAgentPreparationWorkerTickRunning = false;
    }
}

/**
 * Processes a bounded number of due jobs for one table prefix.
 *
 * @private function of agentPreparation
 */
async function processDueAgentPreparationJobsForPrefix(tablePrefix: string): Promise<void> {
    const repository = createAgentPreparationRepository(tablePrefix);

    for (let index = 0; index < AGENT_PREPARATION_MAX_JOBS_PER_TICK; index++) {
        const claimedJob = await repository.claimNextDueAgentPreparationJob();
        if (!claimedJob) {
            break;
        }

        await processClaimedAgentPreparationJob(tablePrefix, repository, claimedJob);
    }
}

/**
 * Creates a resolver compatible with chat-time reference resolution, with graceful metadata fallback.
 *
 * @private function of agentPreparation
 */
async function createBackgroundAgentReferenceResolver(
    tablePrefix: string,
    collection: AgentCollectionInSupabase,
): Promise<Awaited<ReturnType<typeof createServerAgentReferenceResolver>>> {
    const localServerUrl = resolveInternalServerOrigin();

    let federatedServers: string[] = [];
    try {
        federatedServers = await getFederatedServers();
    } catch (error) {
        console.warn('[pre-index] Failed to load federated servers, continuing with local-only resolver:', {
            tablePrefix,
            error: serializeError(error as Error),
        });
    }

    return createServerAgentReferenceResolver({
        agentCollection: collection,
        localServerUrl,
        federatedServers,
    });
}

/**
 * Executes one claimed background preparation job.
 *
 * @private function of agentPreparation
 */
async function processClaimedAgentPreparationJob(
    tablePrefix: string,
    repository: AgentPreparationRepository,
    claimedJob: AgentPreparationRow,
): Promise<void> {
    incrementAgentPreparationMetric('started');
    logAgentPreparation('started', {
        tablePrefix,
        agentPermanentId: claimedJob.agentPermanentId,
        jobId: claimedJob.id,
        fingerprint: claimedJob.targetFingerprint,
        triggerReason: claimedJob.triggerReason,
        retryCount: claimedJob.retryCount,
    });

    try {
        const agentSnapshot = await repository.loadAgentSnapshot(claimedJob.agentPermanentId);

        if (!agentSnapshot) {
            await markClaimedAgentPreparationFailed(
                tablePrefix,
                repository,
                claimedJob,
                new Error(`Agent \`${claimedJob.agentPermanentId}\` was not found for preparation.`),
            );
            return;
        }

        if (agentSnapshot.deletedAt) {
            await markClaimedAgentPreparationFailed(
                tablePrefix,
                repository,
                claimedJob,
                new Error(`Agent \`${claimedJob.agentPermanentId}\` is deleted; skipping preparation.`),
            );
            return;
        }

        if (agentSnapshot.agentHash !== claimedJob.targetFingerprint) {
            await rescheduleClaimedJobForLatestFingerprint(tablePrefix, repository, claimedJob, agentSnapshot.agentHash);
            return;
        }

        if (claimedJob.lastPreparedFingerprint === claimedJob.targetFingerprint) {
            await markClaimedAgentPreparationPrepared(tablePrefix, repository, claimedJob, 0, { isSkipped: true });
            incrementAgentPreparationMetric('skipped');
            logAgentPreparation('skipped_already_prepared', {
                tablePrefix,
                agentPermanentId: claimedJob.agentPermanentId,
                jobId: claimedJob.id,
                fingerprint: claimedJob.targetFingerprint,
            });
            return;
        }

        const collection = new AgentCollectionInSupabase($provideSupabaseForServer(), {
            tablePrefix,
            isVerbose: false,
        });
        const fallbackAgentReferenceResolver = await createBackgroundAgentReferenceResolver(tablePrefix, collection);
        const localServerUrl = resolveInternalServerOrigin();
        const resolvedAgentContext = await resolveCachedServerAgentContext({
            collection,
            agentIdentifier: claimedJob.agentPermanentId,
            localServerUrl,
            fallbackResolver: fallbackAgentReferenceResolver,
        });
        const preparedAgentModelRequirements = await resolveCachedServerAgentModelRequirements({
            resolvedAgentContext,
            localServerUrl,
            fallbackResolver: fallbackAgentReferenceResolver,
        });
        const openAiTools = await $provideOpenAiAgentKitExecutionToolsForServer();
        const agentKitCacheManager = new AgentKitCacheManager({ isVerbose: true });
        const startedAt = Date.now();

        await retryWithBackoff(
            async () => {
                await agentKitCacheManager.getOrCreateAgentKitAgent(
                    resolvedAgentContext.resolvedAgentSource,
                    resolvedAgentContext.resolvedAgentName,
                    openAiTools,
                    {
                        includeDynamicContext: true,
                        agentId: claimedJob.agentPermanentId,
                        modelRequirements: preparedAgentModelRequirements.modelRequirements,
                    },
                );
            },
            {
                retries: 2,
                initialDelayMs: 1_000,
                maxDelayMs: 10_000,
                backoffFactor: 2,
                jitterRatio: 0.3,
                shouldRetry: (error) => isRetryableAgentPreparationError(error),
                onRetry: (attempt) => {
                    console.warn('[pre-index] Retry scheduled for failed preparation attempt:', {
                        tablePrefix,
                        agentPermanentId: claimedJob.agentPermanentId,
                        jobId: claimedJob.id,
                        attempt: attempt.attempt,
                        delayMs: attempt.delayMs,
                    });
                },
            },
        );

        const durationMs = Date.now() - startedAt;
        await markClaimedAgentPreparationPrepared(tablePrefix, repository, claimedJob, durationMs);
    } catch (error) {
        const preparedError = error instanceof Error ? error : new Error(String(error));
        await markClaimedAgentPreparationFailed(tablePrefix, repository, claimedJob, preparedError);
    }
}

/**
 * Updates one running row to scheduled when a newer target fingerprint already arrived.
 *
 * @private function of agentPreparation
 */
async function updatePreparationRowForChangedTarget(
    tablePrefix: string,
    repository: AgentPreparationRepository,
    latestRow: AgentPreparationRow,
    claimedJob: AgentPreparationRow,
): Promise<void> {
    const nowIso = new Date().toISOString();
    const wasUpdated = await repository.updateRunningPreparationRow(latestRow.id, {
        status: 'SCHEDULED',
        updatedAt: nowIso,
        startedAt: null,
    });

    if (!wasUpdated) {
        return;
    }

    incrementAgentPreparationMetric('skipped');
    logAgentPreparation('skipped_target_changed', {
        tablePrefix,
        agentPermanentId: latestRow.agentPermanentId,
        jobId: latestRow.id,
        previousFingerprint: claimedJob.targetFingerprint,
        currentFingerprint: latestRow.targetFingerprint,
    });
}

/**
 * Marks one running row as failed and schedules automatic retry.
 *
 * @private function of agentPreparation
 */
async function markClaimedAgentPreparationFailed(
    tablePrefix: string,
    repository: AgentPreparationRepository,
    claimedJob: AgentPreparationRow,
    error: Error,
): Promise<void> {
    const now = new Date();
    const latestRow = await repository.loadPreparationRowById(claimedJob.id);

    if (!latestRow) {
        return;
    }

    if (latestRow.targetFingerprint !== claimedJob.targetFingerprint) {
        await updatePreparationRowForChangedTarget(tablePrefix, repository, latestRow, claimedJob);
        return;
    }

    const nextRetryCount = Math.max(0, latestRow.retryCount) + 1;
    const runAfterIso = new Date(now.getTime() + resolveAgentPreparationFailureBackoffMs(nextRetryCount)).toISOString();
    const wasUpdated = await repository.updateRunningPreparationRow(latestRow.id, {
        status: 'FAILED',
        failedAt: now.toISOString(),
        retryCount: nextRetryCount,
        runAfter: runAfterIso,
        updatedAt: now.toISOString(),
        lastError: error.message,
    });

    if (!wasUpdated) {
        return;
    }

    scheduleAgentPreparationWakeup(tablePrefix, runAfterIso);
    incrementAgentPreparationMetric('failed');
    logAgentPreparation('failed', {
        tablePrefix,
        agentPermanentId: latestRow.agentPermanentId,
        jobId: latestRow.id,
        fingerprint: latestRow.targetFingerprint,
        retryCount: nextRetryCount,
        nextRetryAt: runAfterIso,
        error: error.message,
    });
}

/**
 * Marks one running row as prepared for the processed fingerprint.
 *
 * @private function of agentPreparation
 */
async function markClaimedAgentPreparationPrepared(
    tablePrefix: string,
    repository: AgentPreparationRepository,
    claimedJob: AgentPreparationRow,
    durationMs: number,
    options?: {
        readonly isSkipped?: boolean;
    },
): Promise<void> {
    const latestRow = await repository.loadPreparationRowById(claimedJob.id);

    if (!latestRow) {
        return;
    }

    if (latestRow.targetFingerprint !== claimedJob.targetFingerprint) {
        await updatePreparationRowForChangedTarget(tablePrefix, repository, latestRow, claimedJob);
        return;
    }

    const wasUpdated = await repository.updateRunningPreparationRow(latestRow.id, {
        status: 'PREPARED',
        lastPreparedFingerprint: claimedJob.targetFingerprint,
        completedAt: new Date().toISOString(),
        failedAt: null,
        retryCount: 0,
        lastError: null,
        updatedAt: new Date().toISOString(),
        lastDurationMs: durationMs,
    });

    if (!wasUpdated) {
        return;
    }

    if (!options?.isSkipped) {
        incrementAgentPreparationMetric('completed');
        logAgentPreparation('completed', {
            tablePrefix,
            agentPermanentId: latestRow.agentPermanentId,
            jobId: latestRow.id,
            fingerprint: claimedJob.targetFingerprint,
            durationMs,
        });
    }
}

/**
 * Reschedules one running job when the agent fingerprint changed while work was already in progress.
 *
 * @private function of agentPreparation
 */
async function rescheduleClaimedJobForLatestFingerprint(
    tablePrefix: string,
    repository: AgentPreparationRepository,
    claimedJob: AgentPreparationRow,
    latestFingerprint: string,
): Promise<void> {
    const now = Date.now();
    const scheduledAtIso = new Date(now).toISOString();
    const runAfterIso = new Date(now + AGENT_PREPARATION_DEBOUNCE_MS).toISOString();
    const wasUpdated = await repository.updateRunningPreparationRow(claimedJob.id, {
        targetFingerprint: latestFingerprint,
        triggerReason: 'AGENT_UPDATED',
        status: 'SCHEDULED',
        runAfter: runAfterIso,
        scheduledAt: scheduledAtIso,
        updatedAt: scheduledAtIso,
        startedAt: null,
    });

    if (wasUpdated) {
        scheduleAgentPreparationWakeup(tablePrefix, runAfterIso);
    }

    incrementAgentPreparationMetric('skipped');
    logAgentPreparation('skipped_stale_fingerprint', {
        tablePrefix,
        agentPermanentId: claimedJob.agentPermanentId,
        jobId: claimedJob.id,
        queuedFingerprint: claimedJob.targetFingerprint,
        latestFingerprint,
    });
}

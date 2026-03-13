import { AgentCollectionInSupabase } from '@promptbook-local/core';
import { string_agent_permanent_id, TODO_any } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { createServerAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/createServerAgentReferenceResolver';
import { resolveBookScopedAgentContext } from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';
import { AgentKitCacheManager } from '@/src/utils/cache/AgentKitCacheManager';
import { getFederatedServers } from '@/src/utils/getFederatedServers';
import { resolveInternalServerOrigin } from '@/src/utils/resolveInternalServerOrigin';
import { retryWithBackoff } from '@/src/utils/retryWithBackoff';

/**
 * Debounce window for agent pre-indexing.
 */
const AGENT_PREPARATION_DEBOUNCE_MS = 30_000;

/**
 * Poll interval for the in-process preparation worker loop.
 */
const AGENT_PREPARATION_WORKER_INTERVAL_MS = 5_000;

/**
 * Maximum number of jobs processed per worker tick and table prefix.
 */
const AGENT_PREPARATION_MAX_JOBS_PER_TICK = 2;

/**
 * Small wake-up buffer used when scheduling one-shot worker kicks.
 */
const AGENT_PREPARATION_WAKEUP_BUFFER_MS = 100;

/**
 * Maximum wait for chat routes that decide to wait for a currently running preparation.
 */
export const AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS = 2_500;

/**
 * Default polling interval used while waiting for a running preparation.
 */
const AGENT_PREPARATION_WAIT_POLL_INTERVAL_MS = 250;

/**
 * Initial retry delay after one failed background preparation run.
 */
const AGENT_PREPARATION_FAILURE_BACKOFF_BASE_MS = 30_000;

/**
 * Maximum retry delay after repeated failed background preparation runs.
 */
const AGENT_PREPARATION_FAILURE_BACKOFF_MAX_MS = 15 * 60_000;

/**
 * Lifecycle states tracked for one agent preparation row.
 */
type AgentPreparationStatus = 'SCHEDULED' | 'RUNNING' | 'PREPARED' | 'FAILED';

/**
 * Trigger categories used for observability.
 */
export type AgentPreparationTriggerReason = 'AGENT_CREATED' | 'AGENT_UPDATED';

/**
 * One stored row from the AgentPreparation table.
 */
type AgentPreparationRow = {
    readonly id: number;
    readonly agentPermanentId: string_agent_permanent_id;
    readonly targetFingerprint: string;
    readonly lastPreparedFingerprint: string | null;
    readonly status: AgentPreparationStatus;
    readonly triggerReason: string;
    readonly runAfter: string;
    readonly scheduledAt: string;
    readonly startedAt: string | null;
    readonly completedAt: string | null;
    readonly failedAt: string | null;
    readonly retryCount: number;
    readonly lastError: string | null;
};

/**
 * Minimal agent row shape required for background preparation.
 */
type AgentPreparationAgentSnapshot = {
    readonly agentName: string;
    readonly agentHash: string;
    readonly agentSource: string;
    readonly deletedAt: string | null;
};

/**
 * Options for scheduling one pre-index request.
 */
export type ScheduleAgentPreparationOptions = {
    readonly tablePrefix: string;
    readonly agentPermanentId: string_agent_permanent_id;
    readonly fingerprint: string;
    readonly triggerReason: AgentPreparationTriggerReason;
};

/**
 * Options for waiting on one currently running preparation.
 */
export type WaitForRunningAgentPreparationOptions = {
    readonly tablePrefix: string;
    readonly agentPermanentId: string_agent_permanent_id;
    readonly fingerprint: string;
    readonly timeoutMs: number;
    readonly pollIntervalMs?: number;
};

/**
 * Outcomes of the "wait if running" operation.
 */
export type WaitForRunningAgentPreparationResult =
    | 'prepared'
    | 'failed'
    | 'target_changed'
    | 'not_running'
    | 'timed_out';

/**
 * In-memory counters for lightweight pre-index observability.
 */
type AgentPreparationMetrics = {
    scheduled: number;
    started: number;
    skipped: number;
    completed: number;
    failed: number;
};

/**
 * Shared process-level counters.
 */
const AGENT_PREPARATION_METRICS: AgentPreparationMetrics = {
    scheduled: 0,
    started: 0,
    skipped: 0,
    completed: 0,
    failed: 0,
};

/**
 * Prefixes discovered from request-scoped writes that should be processed by the worker loop.
 */
const ACTIVE_TABLE_PREFIXES = new Set<string>();

/**
 * Interval handle for the singleton background worker.
 */
let agentPreparationWorkerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * One-shot wake-up timeout handles keyed by table prefix.
 */
const agentPreparationWakeupTimeoutsByPrefix = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Guard preventing overlapping worker ticks in one process.
 */
let isAgentPreparationWorkerTickRunning = false;

/**
 * Returns table name for agent-preparation rows in one logical server namespace.
 */
function getAgentPreparationTableName(tablePrefix: string): string {
    return `${tablePrefix}AgentPreparation`;
}

/**
 * Returns table name for agent rows in one logical server namespace.
 */
function getAgentTableName(tablePrefix: string): string {
    return `${tablePrefix}Agent`;
}

/**
 * Normalizes optional table prefix to a stable non-null value.
 */
function normalizeTablePrefix(tablePrefix: string | null | undefined): string {
    return typeof tablePrefix === 'string' ? tablePrefix : '';
}

/**
 * Emits one structured preparation log with shared metrics snapshot.
 */
function logAgentPreparation(event: string, details: Record<string, unknown>): void {
    console.info('[pre-index]', event, {
        ...details,
        counters: { ...AGENT_PREPARATION_METRICS },
    });
}

/**
 * Increments one preparation metric counter.
 */
function incrementAgentPreparationMetric(metric: keyof AgentPreparationMetrics): void {
    AGENT_PREPARATION_METRICS[metric] += 1;
}

/**
 * Sleeps for a short time in wait loops.
 */
async function sleep(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Returns true when the current runtime should avoid starting long-lived worker intervals.
 */
function shouldDisableBackgroundWorkerLoop(): boolean {
    if (process.env.NODE_ENV === 'test') {
        return true;
    }

    if (typeof process.env.JEST_WORKER_ID !== 'undefined') {
        return true;
    }

    return false;
}

/**
 * Starts the singleton background worker if it is not already running.
 */
function ensureAgentPreparationWorkerRunning(): void {
    if (shouldDisableBackgroundWorkerLoop()) {
        return;
    }

    if (agentPreparationWorkerInterval) {
        return;
    }

    agentPreparationWorkerInterval = setInterval(() => {
        void runAgentPreparationWorkerTick();
    }, AGENT_PREPARATION_WORKER_INTERVAL_MS);

    agentPreparationWorkerInterval.unref?.();
}

/**
 * Triggers one immediate best-effort worker tick without awaiting completion.
 */
function kickAgentPreparationWorkerTick(): void {
    if (shouldDisableBackgroundWorkerLoop()) {
        return;
    }

    void runAgentPreparationWorkerTick();
}

/**
 * Schedules one per-prefix wake-up tick near the next expected due timestamp.
 */
function scheduleAgentPreparationWakeup(tablePrefix: string, wakeAtIso: string): void {
    if (shouldDisableBackgroundWorkerLoop()) {
        return;
    }

    const wakeAtTimestamp = new Date(wakeAtIso).getTime();
    if (!Number.isFinite(wakeAtTimestamp)) {
        kickAgentPreparationWorkerTick();
        return;
    }

    const delayMs = Math.max(0, wakeAtTimestamp - Date.now()) + AGENT_PREPARATION_WAKEUP_BUFFER_MS;
    const normalizedTablePrefix = normalizeTablePrefix(tablePrefix);

    const existingWakeupTimeout = agentPreparationWakeupTimeoutsByPrefix.get(normalizedTablePrefix);
    if (existingWakeupTimeout) {
        clearTimeout(existingWakeupTimeout);
    }

    const wakeupTimeout = setTimeout(() => {
        agentPreparationWakeupTimeoutsByPrefix.delete(normalizedTablePrefix);
        void runAgentPreparationWorkerTick();
    }, delayMs);

    wakeupTimeout.unref?.();
    agentPreparationWakeupTimeoutsByPrefix.set(normalizedTablePrefix, wakeupTimeout);
}

/**
 * Registers a prefix for future worker processing and starts the worker loop.
 */
function registerAgentPreparationPrefix(tablePrefix: string): void {
    ACTIVE_TABLE_PREFIXES.add(normalizeTablePrefix(tablePrefix));
    ensureAgentPreparationWorkerRunning();
    kickAgentPreparationWorkerTick();
}

/**
 * Executes one worker tick across all active prefixes without overlap.
 */
async function runAgentPreparationWorkerTick(): Promise<void> {
    if (isAgentPreparationWorkerTickRunning) {
        return;
    }

    if (ACTIVE_TABLE_PREFIXES.size === 0) {
        return;
    }

    isAgentPreparationWorkerTickRunning = true;

    try {
        for (const tablePrefix of ACTIVE_TABLE_PREFIXES) {
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
 */
async function processDueAgentPreparationJobsForPrefix(tablePrefix: string): Promise<void> {
    for (let index = 0; index < AGENT_PREPARATION_MAX_JOBS_PER_TICK; index++) {
        const claimedJob = await claimNextDueAgentPreparationJob(tablePrefix);
        if (!claimedJob) {
            break;
        }

        await processClaimedAgentPreparationJob(tablePrefix, claimedJob);
    }
}

/**
 * Claims the oldest due scheduled/failed row for exclusive processing.
 */
async function claimNextDueAgentPreparationJob(tablePrefix: string): Promise<AgentPreparationRow | null> {
    const nowIso = new Date().toISOString();
    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = getAgentPreparationTableName(tablePrefix);

    const dueResult = await supabase
        .from(tableName)
        .select('*')
        .in('status', ['SCHEDULED', 'FAILED'])
        .lte('runAfter', nowIso)
        .order('runAfter', { ascending: true })
        .order('id', { ascending: true })
        .limit(1);

    if (dueResult.error) {
        console.error('[pre-index] Failed to load due jobs:', {
            tablePrefix,
            error: dueResult.error.message,
        });
        return null;
    }

    const candidate = (Array.isArray(dueResult.data) ? dueResult.data[0] : null) as AgentPreparationRow | null;
    if (!candidate) {
        return null;
    }

    const claimResult = await supabase
        .from(tableName)
        .update({
            status: 'RUNNING',
            startedAt: nowIso,
            updatedAt: nowIso,
            failedAt: null,
            lastError: null,
        })
        .eq('id', candidate.id)
        .in('status', ['SCHEDULED', 'FAILED'])
        .lte('runAfter', nowIso)
        .select('*')
        .limit(1);

    if (claimResult.error) {
        console.error('[pre-index] Failed to claim job:', {
            tablePrefix,
            jobId: candidate.id,
            error: claimResult.error.message,
        });
        return null;
    }

    const claimed = (Array.isArray(claimResult.data) ? claimResult.data[0] : null) as AgentPreparationRow | null;
    return claimed || null;
}

/**
 * Loads one agent snapshot for background preparation checks.
 */
async function loadAgentPreparationSnapshot(
    tablePrefix: string,
    agentPermanentId: string_agent_permanent_id,
): Promise<AgentPreparationAgentSnapshot | null> {
    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = getAgentTableName(tablePrefix);

    const result = await supabase
        .from(tableName)
        .select('agentName,agentHash,agentSource,deletedAt')
        .eq('permanentId', agentPermanentId)
        .limit(1);

    if (result.error) {
        console.error('[pre-index] Failed to load agent snapshot:', {
            tablePrefix,
            agentPermanentId,
            error: result.error.message,
        });
        return null;
    }

    const row = (Array.isArray(result.data) ? result.data[0] : null) as AgentPreparationAgentSnapshot | null;
    return row || null;
}

/**
 * Loads one preparation row by id.
 */
async function loadAgentPreparationRowById(
    tablePrefix: string,
    preparationId: number,
): Promise<AgentPreparationRow | null> {
    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = getAgentPreparationTableName(tablePrefix);

    const result = await supabase.from(tableName).select('*').eq('id', preparationId).limit(1);

    if (result.error) {
        console.error('[pre-index] Failed to load preparation row:', {
            tablePrefix,
            preparationId,
            error: result.error.message,
        });
        return null;
    }

    const row = (Array.isArray(result.data) ? result.data[0] : null) as AgentPreparationRow | null;
    return row || null;
}

/**
 * Resolves whether one error should be retried during the same processing attempt.
 */
function isRetryablePreparationError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('not found')) {
        return false;
    }

    if (message.includes('invalid') || message.includes('validation')) {
        return false;
    }

    return true;
}

/**
 * Computes next retry backoff delay from the number of failed runs.
 */
function resolveFailureBackoffMs(retryCount: number): number {
    const normalizedRetryCount = Math.max(1, retryCount);
    const exponentialDelay = AGENT_PREPARATION_FAILURE_BACKOFF_BASE_MS * Math.pow(2, normalizedRetryCount - 1);
    return Math.min(exponentialDelay, AGENT_PREPARATION_FAILURE_BACKOFF_MAX_MS);
}

/**
 * Marks one running row as failed and schedules automatic retry.
 */
async function markClaimedAgentPreparationFailed(
    tablePrefix: string,
    claimedJob: AgentPreparationRow,
    error: Error,
): Promise<void> {
    const now = new Date();
    const nowIso = now.toISOString();
    const latestRow = await loadAgentPreparationRowById(tablePrefix, claimedJob.id);
    if (!latestRow) {
        return;
    }

    if (latestRow.targetFingerprint !== claimedJob.targetFingerprint) {
        await updatePreparationRowForChangedTarget(tablePrefix, latestRow.id);
        incrementAgentPreparationMetric('skipped');
        logAgentPreparation('skipped_target_changed', {
            tablePrefix,
            agentPermanentId: latestRow.agentPermanentId,
            jobId: latestRow.id,
            previousFingerprint: claimedJob.targetFingerprint,
            currentFingerprint: latestRow.targetFingerprint,
        });
        return;
    }

    const nextRetryCount = Math.max(0, latestRow.retryCount) + 1;
    const retryDelayMs = resolveFailureBackoffMs(nextRetryCount);
    const runAfterIso = new Date(now.getTime() + retryDelayMs).toISOString();

    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = getAgentPreparationTableName(tablePrefix);
    const updateResult = await supabase
        .from(tableName)
        .update({
            status: 'FAILED',
            failedAt: nowIso,
            retryCount: nextRetryCount,
            runAfter: runAfterIso,
            updatedAt: nowIso,
            lastError: error.message,
        })
        .eq('id', latestRow.id)
        .eq('status', 'RUNNING');

    if (updateResult.error) {
        console.error('[pre-index] Failed to mark job as failed:', {
            tablePrefix,
            jobId: latestRow.id,
            error: updateResult.error.message,
        });
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
 * Updates one running row to scheduled when a newer target fingerprint already arrived.
 */
async function updatePreparationRowForChangedTarget(tablePrefix: string, preparationId: number): Promise<void> {
    const nowIso = new Date().toISOString();
    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = getAgentPreparationTableName(tablePrefix);

    const updateResult = await supabase
        .from(tableName)
        .update({
            status: 'SCHEDULED',
            updatedAt: nowIso,
            startedAt: null,
        })
        .eq('id', preparationId)
        .eq('status', 'RUNNING');

    if (updateResult.error) {
        console.error('[pre-index] Failed to switch RUNNING job back to SCHEDULED:', {
            tablePrefix,
            preparationId,
            error: updateResult.error.message,
        });
    }
}

/**
 * Marks one running row as prepared for the processed fingerprint.
 */
async function markClaimedAgentPreparationPrepared(
    tablePrefix: string,
    claimedJob: AgentPreparationRow,
    durationMs: number,
    options?: {
        readonly isSkipped?: boolean;
    },
): Promise<void> {
    const nowIso = new Date().toISOString();
    const latestRow = await loadAgentPreparationRowById(tablePrefix, claimedJob.id);
    if (!latestRow) {
        return;
    }

    if (latestRow.targetFingerprint !== claimedJob.targetFingerprint) {
        await updatePreparationRowForChangedTarget(tablePrefix, latestRow.id);
        incrementAgentPreparationMetric('skipped');
        logAgentPreparation('skipped_target_changed', {
            tablePrefix,
            agentPermanentId: latestRow.agentPermanentId,
            jobId: latestRow.id,
            previousFingerprint: claimedJob.targetFingerprint,
            currentFingerprint: latestRow.targetFingerprint,
        });
        return;
    }

    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = getAgentPreparationTableName(tablePrefix);
    const updateResult = await supabase
        .from(tableName)
        .update({
            status: 'PREPARED',
            lastPreparedFingerprint: claimedJob.targetFingerprint,
            completedAt: nowIso,
            failedAt: null,
            retryCount: 0,
            lastError: null,
            updatedAt: nowIso,
            lastDurationMs: durationMs,
        })
        .eq('id', latestRow.id)
        .eq('status', 'RUNNING');

    if (updateResult.error) {
        console.error('[pre-index] Failed to mark job as prepared:', {
            tablePrefix,
            jobId: latestRow.id,
            error: updateResult.error.message,
        });
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
 * Creates a resolver compatible with chat-time reference resolution, with graceful metadata fallback.
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
 */
async function processClaimedAgentPreparationJob(tablePrefix: string, claimedJob: AgentPreparationRow): Promise<void> {
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
        const agentSnapshot = await loadAgentPreparationSnapshot(tablePrefix, claimedJob.agentPermanentId);

        if (!agentSnapshot) {
            await markClaimedAgentPreparationFailed(
                tablePrefix,
                claimedJob,
                new Error(`Agent \`${claimedJob.agentPermanentId}\` was not found for preparation.`),
            );
            return;
        }

        if (agentSnapshot.deletedAt) {
            await markClaimedAgentPreparationFailed(
                tablePrefix,
                claimedJob,
                new Error(`Agent \`${claimedJob.agentPermanentId}\` is deleted; skipping preparation.`),
            );
            return;
        }

        if (agentSnapshot.agentHash !== claimedJob.targetFingerprint) {
            const now = Date.now();
            const runAfterIso = new Date(now + AGENT_PREPARATION_DEBOUNCE_MS).toISOString();
            const supabase = $provideSupabaseForServer() as TODO_any;
            const tableName = getAgentPreparationTableName(tablePrefix);
            const rescheduleResult = await supabase
                .from(tableName)
                .update({
                    targetFingerprint: agentSnapshot.agentHash,
                    triggerReason: 'AGENT_UPDATED',
                    status: 'SCHEDULED',
                    runAfter: runAfterIso,
                    scheduledAt: new Date(now).toISOString(),
                    updatedAt: new Date(now).toISOString(),
                    startedAt: null,
                })
                .eq('id', claimedJob.id)
                .eq('status', 'RUNNING');

            if (rescheduleResult.error) {
                console.error('[pre-index] Failed to reschedule stale running job:', {
                    tablePrefix,
                    jobId: claimedJob.id,
                    error: rescheduleResult.error.message,
                });
            } else {
                scheduleAgentPreparationWakeup(tablePrefix, runAfterIso);
            }

            incrementAgentPreparationMetric('skipped');
            logAgentPreparation('skipped_stale_fingerprint', {
                tablePrefix,
                agentPermanentId: claimedJob.agentPermanentId,
                jobId: claimedJob.id,
                queuedFingerprint: claimedJob.targetFingerprint,
                latestFingerprint: agentSnapshot.agentHash,
            });
            return;
        }

        if (claimedJob.lastPreparedFingerprint === claimedJob.targetFingerprint) {
            await markClaimedAgentPreparationPrepared(tablePrefix, claimedJob, 0, { isSkipped: true });
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
        const resolvedAgentContext = await resolveBookScopedAgentContext({
            collection,
            agentIdentifier: claimedJob.agentPermanentId,
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
                        agentReferenceResolver: resolvedAgentContext.scopedAgentReferenceResolver,
                    },
                );
            },
            {
                retries: 2,
                initialDelayMs: 1_000,
                maxDelayMs: 10_000,
                backoffFactor: 2,
                jitterRatio: 0.3,
                shouldRetry: (error) => isRetryablePreparationError(error),
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
        await markClaimedAgentPreparationPrepared(tablePrefix, claimedJob, durationMs);
    } catch (error) {
        const preparedError = error instanceof Error ? error : new Error(String(error));
        await markClaimedAgentPreparationFailed(tablePrefix, claimedJob, preparedError);
    }
}

/**
 * Schedules (or coalesces) one background preparation request for an agent fingerprint.
 */
export async function scheduleAgentPreparation(options: ScheduleAgentPreparationOptions): Promise<void> {
    const tablePrefix = normalizeTablePrefix(options.tablePrefix);
    registerAgentPreparationPrefix(tablePrefix);

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const runAfterIso = new Date(now + AGENT_PREPARATION_DEBOUNCE_MS).toISOString();
    const tableName = getAgentPreparationTableName(tablePrefix);
    const supabase = $provideSupabaseForServer() as TODO_any;

    const existingResult = await supabase
        .from(tableName)
        .select('*')
        .eq('agentPermanentId', options.agentPermanentId)
        .limit(1);

    if (existingResult.error) {
        console.error('[pre-index] Failed to load existing schedule state:', {
            tablePrefix,
            agentPermanentId: options.agentPermanentId,
            error: existingResult.error.message,
        });
        return;
    }

    const existingRow = (Array.isArray(existingResult.data) ? existingResult.data[0] : null) as AgentPreparationRow | null;

    if (
        existingRow &&
        existingRow.status === 'PREPARED' &&
        existingRow.lastPreparedFingerprint === options.fingerprint &&
        existingRow.targetFingerprint === options.fingerprint
    ) {
        logAgentPreparation('skipped_schedule_already_prepared', {
            tablePrefix,
            agentPermanentId: options.agentPermanentId,
            fingerprint: options.fingerprint,
            triggerReason: options.triggerReason,
        });
        return;
    }

    if (!existingRow) {
        const insertResult = await supabase.from(tableName).insert({
            agentPermanentId: options.agentPermanentId,
            targetFingerprint: options.fingerprint,
            lastPreparedFingerprint: null,
            status: 'SCHEDULED',
            triggerReason: options.triggerReason,
            scheduledAt: nowIso,
            runAfter: runAfterIso,
            retryCount: 0,
            updatedAt: nowIso,
            createdAt: nowIso,
            startedAt: null,
            completedAt: null,
            failedAt: null,
            lastError: null,
        });

        if (insertResult.error) {
            console.error('[pre-index] Failed to insert schedule row:', {
                tablePrefix,
                agentPermanentId: options.agentPermanentId,
                error: insertResult.error.message,
            });
            return;
        }

        incrementAgentPreparationMetric('scheduled');
        logAgentPreparation('scheduled', {
            tablePrefix,
            agentPermanentId: options.agentPermanentId,
            fingerprint: options.fingerprint,
            triggerReason: options.triggerReason,
            runAfter: runAfterIso,
            mode: 'insert',
        });
        scheduleAgentPreparationWakeup(tablePrefix, runAfterIso);

        return;
    }

    const updatePayload: Record<string, unknown> = {
        targetFingerprint: options.fingerprint,
        triggerReason: options.triggerReason,
        scheduledAt: nowIso,
        runAfter: runAfterIso,
        updatedAt: nowIso,
    };

    if (existingRow.status !== 'RUNNING') {
        updatePayload.status = 'SCHEDULED';
        updatePayload.startedAt = null;
    }

    if (existingRow.targetFingerprint !== options.fingerprint) {
        updatePayload.retryCount = 0;
        updatePayload.lastError = null;
        updatePayload.failedAt = null;
    }

    const updateResult = await supabase.from(tableName).update(updatePayload).eq('id', existingRow.id);

    if (updateResult.error) {
        console.error('[pre-index] Failed to update schedule row:', {
            tablePrefix,
            agentPermanentId: options.agentPermanentId,
            jobId: existingRow.id,
            error: updateResult.error.message,
        });
        return;
    }

    incrementAgentPreparationMetric('scheduled');
    logAgentPreparation('scheduled', {
        tablePrefix,
        agentPermanentId: options.agentPermanentId,
        fingerprint: options.fingerprint,
        triggerReason: options.triggerReason,
        runAfter: runAfterIso,
        mode: 'update',
        previousStatus: existingRow.status,
    });
    scheduleAgentPreparationWakeup(tablePrefix, runAfterIso);
}

/**
 * Waits briefly when the matching preparation is currently running.
 */
export async function waitForRunningAgentPreparation(
    options: WaitForRunningAgentPreparationOptions,
): Promise<WaitForRunningAgentPreparationResult> {
    const tablePrefix = normalizeTablePrefix(options.tablePrefix);
    registerAgentPreparationPrefix(tablePrefix);

    const timeoutMs = Math.max(0, options.timeoutMs);
    const pollIntervalMs = Math.max(50, options.pollIntervalMs ?? AGENT_PREPARATION_WAIT_POLL_INTERVAL_MS);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() <= deadline) {
        const now = Date.now();

        const row = await loadAgentPreparationRowByAgentAndFingerprint(
            tablePrefix,
            options.agentPermanentId,
            options.fingerprint,
        );

        if (!row) {
            return 'not_running';
        }

        if (row.targetFingerprint !== options.fingerprint) {
            return 'target_changed';
        }

        if (row.status === 'PREPARED' && row.lastPreparedFingerprint === options.fingerprint) {
            return 'prepared';
        }

        if (row.status === 'FAILED') {
            return 'failed';
        }

        if (row.status === 'SCHEDULED') {
            const runAfterTimestamp = new Date(row.runAfter).getTime();
            if (Number.isFinite(runAfterTimestamp) && runAfterTimestamp <= now) {
                kickAgentPreparationWorkerTick();
                const remainingMs = deadline - now;
                await sleep(Math.min(pollIntervalMs, Math.max(1, remainingMs)));
                continue;
            }

            return 'not_running';
        }

        if (row.status !== 'RUNNING') {
            return 'not_running';
        }

        const remainingMs = deadline - now;
        await sleep(Math.min(pollIntervalMs, Math.max(1, remainingMs)));
    }

    return 'timed_out';
}

/**
 * Loads one preparation row for the target agent and fingerprint.
 */
async function loadAgentPreparationRowByAgentAndFingerprint(
    tablePrefix: string,
    agentPermanentId: string_agent_permanent_id,
    fingerprint: string,
): Promise<AgentPreparationRow | null> {
    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = getAgentPreparationTableName(tablePrefix);

    const result = await supabase
        .from(tableName)
        .select('*')
        .eq('agentPermanentId', agentPermanentId)
        .eq('targetFingerprint', fingerprint)
        .limit(1);

    if (result.error) {
        console.error('[pre-index] Failed to load preparation row by agent+fingerprint:', {
            tablePrefix,
            agentPermanentId,
            fingerprint,
            error: result.error.message,
        });
        return null;
    }

    const row = (Array.isArray(result.data) ? result.data[0] : null) as AgentPreparationRow | null;
    return row || null;
}

/**
 * Extracts table prefix from AgentCollectionInSupabase-like objects.
 */
export function resolveAgentCollectionTablePrefix(agentCollection: unknown): string {
    const candidate = (
        agentCollection as {
            options?: {
                tablePrefix?: string | null;
            };
        }
    )?.options?.tablePrefix;

    return normalizeTablePrefix(candidate);
}

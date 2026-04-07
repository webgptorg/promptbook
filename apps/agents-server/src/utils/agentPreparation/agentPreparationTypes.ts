import type { string_agent_permanent_id } from '@promptbook-local/types';

/**
 * Lifecycle states tracked for one agent preparation row.
 *
 * @private function of agentPreparation
 */
export type AgentPreparationStatus = 'SCHEDULED' | 'RUNNING' | 'PREPARED' | 'FAILED';

/**
 * Trigger categories used for observability.
 */
export type AgentPreparationTriggerReason = 'AGENT_CREATED' | 'AGENT_UPDATED';

/**
 * One stored row from the AgentPreparation table.
 *
 * @private function of agentPreparation
 */
export type AgentPreparationRow = {
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
 *
 * @private function of agentPreparation
 */
export type AgentPreparationAgentSnapshot = {
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
 *
 * @private function of agentPreparation
 */
export type AgentPreparationMetrics = {
    scheduled: number;
    started: number;
    skipped: number;
    completed: number;
    failed: number;
};

import type { AgentPreparationMetrics as AgentPreparationCounters } from './agentPreparationTypes';

/**
 * Shared process-level counters.
 *
 * @private function of agentPreparation
 */
const AGENT_PREPARATION_METRICS: AgentPreparationCounters = {
    scheduled: 0,
    started: 0,
    skipped: 0,
    completed: 0,
    failed: 0,
};

/**
 * Emits one structured preparation log with a shared metrics snapshot.
 *
 * @private function of agentPreparation
 */
export function logAgentPreparation(event: string, details: Record<string, unknown>): void {
    console.info('[pre-index]', event, {
        ...details,
        counters: { ...AGENT_PREPARATION_METRICS },
    });
}

/**
 * Increments one preparation metric counter.
 *
 * @private function of agentPreparation
 */
export function incrementAgentPreparationMetric(metric: keyof AgentPreparationCounters): void {
    AGENT_PREPARATION_METRICS[metric] += 1;
}

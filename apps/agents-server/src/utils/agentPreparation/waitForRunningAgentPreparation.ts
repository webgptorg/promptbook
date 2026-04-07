import { AGENT_PREPARATION_WAIT_POLL_INTERVAL_MS } from './agentPreparationConstants';
import { createAgentPreparationRepository } from './agentPreparationRepository';
import { normalizeAgentPreparationTablePrefix, sleepForAgentPreparation } from './agentPreparationShared';
import { kickAgentPreparationWorkerTick, registerAgentPreparationPrefix } from './agentPreparationWorker';
import type {
    WaitForRunningAgentPreparationOptions,
    WaitForRunningAgentPreparationResult,
} from './agentPreparationTypes';

/**
 * Waits briefly when the matching preparation is currently running.
 */
export async function waitForRunningAgentPreparation(
    options: WaitForRunningAgentPreparationOptions,
): Promise<WaitForRunningAgentPreparationResult> {
    const tablePrefix = normalizeAgentPreparationTablePrefix(options.tablePrefix);
    const repository = createAgentPreparationRepository(tablePrefix);

    registerAgentPreparationPrefix(tablePrefix);

    const timeoutMs = Math.max(0, options.timeoutMs);
    const pollIntervalMs = Math.max(50, options.pollIntervalMs ?? AGENT_PREPARATION_WAIT_POLL_INTERVAL_MS);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() <= deadline) {
        const now = Date.now();
        const row = await repository.loadPreparationRowByAgentAndFingerprint(options.agentPermanentId, options.fingerprint);

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
                await sleepForAgentPreparation(Math.min(pollIntervalMs, Math.max(1, remainingMs)));
                continue;
            }

            return 'not_running';
        }

        if (row.status !== 'RUNNING') {
            return 'not_running';
        }

        const remainingMs = deadline - now;
        await sleepForAgentPreparation(Math.min(pollIntervalMs, Math.max(1, remainingMs)));
    }

    return 'timed_out';
}

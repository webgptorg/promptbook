import { AGENT_PREPARATION_DEBOUNCE_MS } from './agentPreparationConstants';
import { incrementAgentPreparationMetric, logAgentPreparation } from './agentPreparationMetrics';
import { createAgentPreparationRepository } from './agentPreparationRepository';
import { normalizeAgentPreparationTablePrefix } from './agentPreparationShared';
import { registerAgentPreparationPrefix, scheduleAgentPreparationWakeup } from './agentPreparationWorker';
import type { AgentPreparationRow, ScheduleAgentPreparationOptions } from './agentPreparationTypes';

/**
 * Schedules (or coalesces) one background preparation request for an agent fingerprint.
 */
export async function scheduleAgentPreparation(options: ScheduleAgentPreparationOptions): Promise<void> {
    const tablePrefix = normalizeAgentPreparationTablePrefix(options.tablePrefix);
    const repository = createAgentPreparationRepository(tablePrefix);

    registerAgentPreparationPrefix(tablePrefix);

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const runAfterIso = new Date(now + AGENT_PREPARATION_DEBOUNCE_MS).toISOString();
    const existingRow = await repository.loadExistingPreparationRow(options.agentPermanentId);

    if (typeof existingRow === 'undefined') {
        return;
    }

    if (shouldSkipScheduleForPreparedFingerprint(existingRow, options.fingerprint)) {
        logAgentPreparation('skipped_schedule_already_prepared', {
            tablePrefix,
            agentPermanentId: options.agentPermanentId,
            fingerprint: options.fingerprint,
            triggerReason: options.triggerReason,
        });
        return;
    }

    if (!existingRow) {
        const wasInserted = await repository.insertPreparationRow({
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

        if (!wasInserted) {
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

    const wasUpdated = await repository.updatePreparationRow(existingRow.id, updatePayload);
    if (!wasUpdated) {
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
 * Returns true when the existing row already represents the requested prepared fingerprint.
 *
 * @private function of agentPreparation
 */
function shouldSkipScheduleForPreparedFingerprint(
    existingRow: AgentPreparationRow | null,
    fingerprint: string,
): boolean {
    return Boolean(
        existingRow &&
            existingRow.status === 'PREPARED' &&
            existingRow.lastPreparedFingerprint === fingerprint &&
            existingRow.targetFingerprint === fingerprint,
    );
}

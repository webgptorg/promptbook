import { afterEach, describe, expect, it } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { parseToolExecutionEnvelope } from '../_common/toolExecutionEnvelope';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT } from '../_common/toolRuntimeContext';
import { setTimeoutToolRuntimeAdapter } from './setTimeoutToolRuntimeAdapter';
import type { TimeoutToolRuntimeAdapter } from './TimeoutToolRuntimeAdapter';
import { UseTimeoutCommitmentDefinition } from './USE_TIMEOUT';

/**
 * Helper to parse plain JSON tool results.
 *
 * @private test helper
 */
function parseJsonResult<TValue>(value: string): TValue {
    return JSON.parse(value) as TValue;
}

describe('UseTimeoutCommitmentDefinition', () => {
    afterEach(() => {
        setTimeoutToolRuntimeAdapter(null);
    });

    it('adds timeout tools and system-message instructions', () => {
        const commitment = new UseTimeoutCommitmentDefinition();
        const requirements = commitment.applyToAgentModelRequirements(
            createBasicAgentModelRequirements('timeout-agent'),
            '',
        );

        expect(requirements.tools).toContainEqual(expect.objectContaining({ name: 'set_timeout' }));
        expect(requirements.tools).toContainEqual(expect.objectContaining({ name: 'cancel_timeout' }));
        expect(requirements.tools).toContainEqual(expect.objectContaining({ name: 'list_timeouts' }));
        expect(requirements.tools).toContainEqual(expect.objectContaining({ name: 'update_timeout' }));
        expect(requirements.systemMessage).toContain('set_timeout');
        expect(requirements.systemMessage).toContain('cancel_timeout');
        expect(requirements.systemMessage).toContain('list_timeouts');
        expect(requirements.systemMessage).toContain('update_timeout');
    });

    it('returns disabled result when runtime context is missing', async () => {
        const commitment = new UseTimeoutCommitmentDefinition();
        const functions = commitment.getToolFunctions();

        const resultRaw = await functions.set_timeout!({
            milliseconds: 1_000,
        });
        const result = parseJsonResult<{ status: string; action: string }>(resultRaw);

        expect(result.action).toBe('set');
        expect(result.status).toBe('disabled');

        const listResultRaw = await functions.list_timeouts!({});
        const listResult = parseJsonResult<{ status: string; action: string }>(listResultRaw);
        expect(listResult.action).toBe('list');
        expect(listResult.status).toBe('disabled');

        const updateResultRaw = await functions.update_timeout!({});
        const updateResult = parseJsonResult<{ status: string; action: string }>(updateResultRaw);
        expect(updateResult.action).toBe('update');
        expect(updateResult.status).toBe('disabled');
    });

    it('schedules and cancels timeouts through runtime adapter when enabled', async () => {
        const adapter: TimeoutToolRuntimeAdapter = {
            async scheduleTimeout(args) {
                return {
                    timeoutId: `tmo_${args.milliseconds}`,
                    dueAt: '2026-03-12T12:00:00.000Z',
                };
            },
            async cancelTimeout(args) {
                if ('allActive' in args && args.allActive) {
                    return {
                        status: 'cancelled_all',
                        cancelledCount: 2,
                        cancelledTimeoutIds: ['tmo_60000', 'tmo_65000'],
                    };
                }

                if (!('timeoutId' in args)) {
                    throw new Error('Missing `timeoutId` in cancelTimeout test adapter.');
                }

                return {
                    timeoutId: args.timeoutId,
                    dueAt: '2026-03-12T12:00:00.000Z',
                    status: 'cancelled',
                };
            },
            async listTimeouts() {
                return {
                    total: 1,
                    items: [
                        {
                            timeoutId: 'tmo_60000',
                            chatId: 'chat-2',
                            status: 'QUEUED',
                            dueAt: '2026-03-12T12:00:00.000Z',
                            paused: false,
                            message: 'Check messages',
                            recurrenceIntervalMs: null,
                        },
                    ],
                };
            },
            async updateTimeout() {
                return {
                    status: 'updated',
                    timeout: {
                        timeoutId: 'tmo_60000',
                        chatId: 'chat-2',
                        status: 'QUEUED',
                        dueAt: '2026-03-12T13:00:00.000Z',
                        paused: true,
                        message: 'Check messages',
                        recurrenceIntervalMs: 3_600_000,
                    },
                };
            },
        };
        setTimeoutToolRuntimeAdapter(adapter);

        const commitment = new UseTimeoutCommitmentDefinition();
        const functions = commitment.getToolFunctions();
        const runtimeContext = JSON.stringify({
            chat: {
                chatId: 'chat-1',
                userId: 1,
                agentId: 'agent-1',
                agentName: 'Timeout Agent',
                parameters: {
                    selfLearningEnabled: 'true',
                },
            },
        });

        const setResultRaw = await functions.set_timeout!({
            milliseconds: 60_000,
            message: 'Check messages',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const setEnvelope = parseToolExecutionEnvelope(setResultRaw);
        expect(setEnvelope?.assistantMessage).toBe('The timer was set.');
        expect(setEnvelope?.toolResult).toEqual({
            action: 'set',
            status: 'set',
            timeoutId: 'tmo_60000',
            dueAt: '2026-03-12T12:00:00.000Z',
        });

        const cancelResultRaw = await functions.cancel_timeout!({
            timeoutId: 'tmo_60000',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const cancelEnvelope = parseToolExecutionEnvelope(cancelResultRaw);
        expect(cancelEnvelope?.assistantMessage).toBe('The timer was cancelled.');
        expect(cancelEnvelope?.toolResult).toEqual({
            action: 'cancel',
            status: 'cancelled',
            timeoutId: 'tmo_60000',
            dueAt: '2026-03-12T12:00:00.000Z',
        });

        const listResultRaw = await functions.list_timeouts!({
            limit: 10,
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const listEnvelope = parseToolExecutionEnvelope(listResultRaw);
        expect(listEnvelope?.assistantMessage).toContain('Found 1 timeout:');
        expect(listEnvelope?.assistantMessage).toContain('tmo_60000');
        expect(listEnvelope?.toolResult).toEqual({
            action: 'list',
            status: 'listed',
            total: 1,
            items: [
                {
                    timeoutId: 'tmo_60000',
                    chatId: 'chat-2',
                    status: 'QUEUED',
                    dueAt: '2026-03-12T12:00:00.000Z',
                    paused: false,
                    message: 'Check messages',
                    recurrenceIntervalMs: null,
                },
            ],
        });

        const cancelAllResultRaw = await functions.cancel_timeout!({
            allActive: true,
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const cancelAllEnvelope = parseToolExecutionEnvelope(cancelAllResultRaw);
        expect(cancelAllEnvelope?.assistantMessage).toContain('Cancelled 2 active timeouts.');
        expect(cancelAllEnvelope?.toolResult).toEqual({
            action: 'cancel',
            status: 'cancelled_all',
            cancelledCount: 2,
            cancelledTimeoutIds: ['tmo_60000', 'tmo_65000'],
            hasMore: undefined,
        });

        const updateResultRaw = await functions.update_timeout!({
            timeoutId: 'tmo_60000',
            paused: true,
            recurrenceIntervalMs: 3_600_000,
            dueAt: '2026-03-12T13:00:00.000Z',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const updateEnvelope = parseToolExecutionEnvelope(updateResultRaw);
        expect(updateEnvelope?.assistantMessage).toContain('Updated timeout');
        expect(updateEnvelope?.toolResult).toEqual({
            action: 'update',
            status: 'updated',
            timeoutId: 'tmo_60000',
            dueAt: '2026-03-12T13:00:00.000Z',
            paused: true,
            recurrenceIntervalMs: 3_600_000,
        });
    });
});

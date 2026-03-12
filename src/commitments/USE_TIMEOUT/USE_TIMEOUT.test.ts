import { afterEach, describe, expect, it } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { parseToolExecutionEnvelope } from '../_common/toolExecutionEnvelope';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT } from '../_common/toolRuntimeContext';
import {
    setTimeoutToolRuntimeAdapter,
    UseTimeoutCommitmentDefinition,
    type TimeoutToolRuntimeAdapter,
} from './USE_TIMEOUT';

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
        expect(requirements.systemMessage).toContain('set_timeout');
        expect(requirements.systemMessage).toContain('cancel_timeout');
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
                return {
                    timeoutId: args.timeoutId,
                    dueAt: '2026-03-12T12:00:00.000Z',
                    status: 'cancelled',
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
    });
});

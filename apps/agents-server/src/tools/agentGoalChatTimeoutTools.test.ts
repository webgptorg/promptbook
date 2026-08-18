import { describe, expect, it, jest } from '@jest/globals';
import { parseToolExecutionEnvelope } from '../../../../src/commitments/_common/toolExecutionEnvelope';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT } from '../../../../src/commitments/_common/toolRuntimeContext';
import type { UserChatTimeoutRecord } from '../utils/userChatTimeout';
import { createAgentGoalChatTimeoutToolFunctions } from './agentGoalChatTimeoutToolFunctions';
import { AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES, createAgentGoalChatTimeoutTools } from './agentGoalChatTimeoutTools';

/**
 * Stable timestamp shared by planned-message fixtures.
 */
const TEST_TIMESTAMP = '2026-08-11T12:00:00.000Z';

/**
 * Creates one complete durable timeout fixture.
 *
 * @param overrides - Fields specific to one test case.
 * @returns Stored timeout record.
 */
function createTimeoutFixture(overrides: Partial<UserChatTimeoutRecord> = {}): UserChatTimeoutRecord {
    return {
        id: 'timeout-1',
        timeoutId: 'timeout-1',
        createdAt: TEST_TIMESTAMP,
        updatedAt: TEST_TIMESTAMP,
        chatId: 'goal-agent-1',
        userId: 42,
        agentPermanentId: 'agent-1',
        status: 'QUEUED',
        message: 'Continue the goal.',
        parameters: {},
        durationMs: 60_000,
        dueAt: '2026-08-11T12:01:00.000Z',
        recurrenceIntervalMs: null,
        cronExpression: null,
        startsAt: null,
        endsAt: null,
        maxRunCount: null,
        queuedAt: TEST_TIMESTAMP,
        startedAt: null,
        completedAt: null,
        cancelRequestedAt: null,
        pausedAt: null,
        leaseExpiresAt: null,
        attemptCount: 0,
        runCount: 0,
        lastFiredAt: null,
        failureReason: null,
        ...overrides,
    };
}

/**
 * Hidden runtime context passed to tool calls in focused tests.
 */
const TEST_RUNTIME_ARGUMENTS = {
    [TOOL_RUNTIME_CONTEXT_ARGUMENT]: {
        memory: {
            agentId: 'agent-1',
        },
    },
};

describe('agent goal-chat timeout tools', () => {
    it('adds scheduling, listing, and cancellation definitions without duplicates', () => {
        const tools = createAgentGoalChatTimeoutTools(
            createAgentGoalChatTimeoutTools([
                {
                    name: 'existing_tool',
                    description: 'Existing tool.',
                    parameters: { type: 'object', properties: {} },
                },
            ]),
        );

        expect(tools.map((tool) => tool.name)).toEqual([
            'existing_tool',
            AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.set,
            AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.update,
            AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.list,
            AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.cancel,
        ]);
    });

    it('rejects an interval shorter than one minute before touching persistence', async () => {
        const scheduleThreadScopedUserChatTimeout = jest.fn(async () => createTimeoutFixture());
        const toolFunctions = createAgentGoalChatTimeoutToolFunctions({ scheduleThreadScopedUserChatTimeout });

        const rawResult = await toolFunctions[AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.set]!({
            ...TEST_RUNTIME_ARGUMENTS,
            milliseconds: 1_000,
            message: 'Continue the goal.',
        });

        expect(JSON.parse(rawResult)).toMatchObject({
            action: 'set',
            status: 'error',
            message: expect.stringContaining('`milliseconds`'),
        });
        expect(scheduleThreadScopedUserChatTimeout).not.toHaveBeenCalled();
    });

    it('always schedules a repeating message in the singleton goal chat', async () => {
        const scheduledTimeout = createTimeoutFixture({ recurrenceIntervalMs: 60_000 });
        const ensureAgentGoalChat = jest.fn(async () => ({ id: 'goal-agent-1', userId: 42 }));
        const scheduleThreadScopedUserChatTimeout = jest.fn(async () => scheduledTimeout);
        const toolFunctions = createAgentGoalChatTimeoutToolFunctions({
            ensureAgentGoalChat,
            scheduleThreadScopedUserChatTimeout,
        });

        const rawResult = await toolFunctions[AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.set]!({
            ...TEST_RUNTIME_ARGUMENTS,
            milliseconds: 60_000,
            message: 'Continue the goal.',
        });
        const result = parseToolExecutionEnvelope(rawResult);

        expect(ensureAgentGoalChat).toHaveBeenCalledWith('agent-1');
        // Note: The requested delay is also the repeat interval, so the planned message keeps waking the agent
        expect(scheduleThreadScopedUserChatTimeout).toHaveBeenCalledWith({
            userId: 42,
            agentPermanentId: 'agent-1',
            chatId: 'goal-agent-1',
            recurrenceIntervalMs: 60_000,
            cronExpression: null,
            startsAt: null,
            endsAt: null,
            maxRunCount: null,
            message: 'Continue the goal.',
        });
        expect(result?.toolResult).toMatchObject({
            action: 'set',
            status: 'set',
            timeoutId: 'timeout-1',
            intervalMs: 60_000,
        });
    });

    it('plans one bounded cron message and re-plans it without losing its identity', async () => {
        const cronTimeout = createTimeoutFixture({ cronExpression: '0 9 * * 1-5', maxRunCount: 10 });
        const ensureAgentGoalChat = jest.fn(async () => ({ id: 'goal-agent-1', userId: 42 }));
        const scheduleThreadScopedUserChatTimeout = jest.fn(async () => cronTimeout);
        const getAgentScopedUserChatTimeout = jest.fn(async () => cronTimeout);
        const updateScheduledUserChatTimeout = jest.fn(async () => ({ ...cronTimeout, maxRunCount: 3 }));
        const toolFunctions = createAgentGoalChatTimeoutToolFunctions({
            ensureAgentGoalChat,
            scheduleThreadScopedUserChatTimeout,
            getAgentScopedUserChatTimeout,
            updateScheduledUserChatTimeout,
        });

        const rawSetResult = await toolFunctions[AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.set]!({
            ...TEST_RUNTIME_ARGUMENTS,
            cronExpression: '0 9 * * 1-5',
            maxRunCount: 10,
            message: 'Send the daily report.',
        });
        const rawUpdateResult = await toolFunctions[AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.update]!({
            ...TEST_RUNTIME_ARGUMENTS,
            timeoutId: 'timeout-1',
            maxRunCount: 3,
        });

        expect(scheduleThreadScopedUserChatTimeout).toHaveBeenCalledWith({
            userId: 42,
            agentPermanentId: 'agent-1',
            chatId: 'goal-agent-1',
            recurrenceIntervalMs: null,
            cronExpression: '0 9 * * 1-5',
            startsAt: null,
            endsAt: null,
            maxRunCount: 10,
            message: 'Send the daily report.',
        });
        expect(parseToolExecutionEnvelope(rawSetResult)?.toolResult).toMatchObject({
            action: 'set',
            cronExpression: '0 9 * * 1-5',
            maxRunCount: 10,
        });
        // Note: Only the requested bound changes, so the cron and the message of the planned message stay
        expect(updateScheduledUserChatTimeout).toHaveBeenCalledWith({
            agentPermanentId: 'agent-1',
            timeoutId: 'timeout-1',
            patch: expect.objectContaining({ cronExpression: '0 9 * * 1-5', maxRunCount: 3 }),
        });
        expect(parseToolExecutionEnvelope(rawUpdateResult)?.toolResult).toMatchObject({
            action: 'update',
            status: 'updated',
            timeoutId: 'timeout-1',
            maxRunCount: 3,
        });
    });

    it('rejects a schedule that mixes a cron with a fixed interval', async () => {
        const scheduleThreadScopedUserChatTimeout = jest.fn(async () => createTimeoutFixture());
        const toolFunctions = createAgentGoalChatTimeoutToolFunctions({ scheduleThreadScopedUserChatTimeout });

        const rawResult = await toolFunctions[AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.set]!({
            ...TEST_RUNTIME_ARGUMENTS,
            cronExpression: '0 9 * * 1-5',
            milliseconds: 60_000,
            message: 'Continue the goal.',
        });

        expect(JSON.parse(rawResult)).toMatchObject({
            action: 'set',
            status: 'error',
            message: expect.stringContaining('not both'),
        });
        expect(scheduleThreadScopedUserChatTimeout).not.toHaveBeenCalled();
    });

    it('lists and cancels planned messages across the whole agent scope', async () => {
        const activeTimeout = createTimeoutFixture();
        const cancelledTimeout = createTimeoutFixture({
            status: 'CANCELLED',
            cancelRequestedAt: TEST_TIMESTAMP,
            completedAt: TEST_TIMESTAMP,
        });
        const listAgentUserChatTimeouts = jest.fn(async () => [activeTimeout]);
        const getAgentScopedUserChatTimeout = jest.fn(async () => activeTimeout);
        const cancelScheduledUserChatTimeout = jest.fn(async () => cancelledTimeout);
        const toolFunctions = createAgentGoalChatTimeoutToolFunctions({
            listAgentUserChatTimeouts,
            getAgentScopedUserChatTimeout,
            cancelScheduledUserChatTimeout,
        });

        await toolFunctions[AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.list]!(TEST_RUNTIME_ARGUMENTS);
        const rawCancelResult = await toolFunctions[AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.cancel]!({
            ...TEST_RUNTIME_ARGUMENTS,
            timeoutId: 'timeout-1',
        });
        const cancelResult = parseToolExecutionEnvelope(rawCancelResult);

        expect(listAgentUserChatTimeouts).toHaveBeenCalledWith({
            agentPermanentId: 'agent-1',
            statuses: ['QUEUED', 'RUNNING'],
            limit: 20,
        });
        expect(getAgentScopedUserChatTimeout).toHaveBeenCalledWith({
            agentPermanentId: 'agent-1',
            timeoutId: 'timeout-1',
        });
        expect(cancelScheduledUserChatTimeout).toHaveBeenCalledWith('timeout-1');
        expect(cancelResult?.toolResult).toMatchObject({
            action: 'cancel',
            status: 'cancelled',
            timeoutId: 'timeout-1',
        });
    });
});

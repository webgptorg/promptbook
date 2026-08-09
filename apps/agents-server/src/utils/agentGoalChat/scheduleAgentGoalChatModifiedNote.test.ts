import { describe, expect, it, jest } from '@jest/globals';
import type { ProvidedServer } from '@/src/tools/$provideServer';
import {
    AGENT_GOAL_CHAT_MODIFIED_NOTE_DEBOUNCE_DELAY_MS,
    createAgentGoalChatModifiedNoteScheduler,
} from './scheduleAgentGoalChatModifiedNote';

/**
 * First isolated server context used by the scheduler test.
 */
const FIRST_TEST_SERVER: ProvidedServer = {
    id: 1,
    publicUrl: new URL('https://first.example.com'),
    tablePrefix: 'first_',
};

/**
 * Second isolated server context used by the scheduler test.
 */
const SECOND_TEST_SERVER: ProvidedServer = {
    id: 2,
    publicUrl: new URL('https://second.example.com'),
    tablePrefix: 'second_',
};

describe('scheduleAgentGoalChatModifiedNote', () => {
    it('writes one latest note per server and agent after one minute of inactivity', () => {
        jest.useFakeTimers();

        try {
            const recordAgentGoalChatLifecycleNote = jest.fn(async () => undefined);
            const runWithServerContextOverride = jest.fn(async (_server: ProvidedServer, callback: () => Promise<void>) =>
                callback(),
            );
            const scheduleAgentGoalChatModifiedNote = createAgentGoalChatModifiedNoteScheduler({
                recordAgentGoalChatLifecycleNote,
                runWithServerContextOverride,
            });

            scheduleAgentGoalChatModifiedNote({
                agentPermanentId: 'agent-a',
                agentName: 'First name',
                server: FIRST_TEST_SERVER,
            });
            jest.advanceTimersByTime(30_000);
            scheduleAgentGoalChatModifiedNote({
                agentPermanentId: 'agent-a',
                agentName: 'Latest name',
                server: FIRST_TEST_SERVER,
            });
            jest.advanceTimersByTime(15_000);
            scheduleAgentGoalChatModifiedNote({
                agentPermanentId: 'agent-a',
                agentName: 'Other agent',
                server: SECOND_TEST_SERVER,
            });
            jest.advanceTimersByTime(AGENT_GOAL_CHAT_MODIFIED_NOTE_DEBOUNCE_DELAY_MS - 15_001);

            expect(recordAgentGoalChatLifecycleNote).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1);

            expect(recordAgentGoalChatLifecycleNote).toHaveBeenCalledTimes(1);
            expect(recordAgentGoalChatLifecycleNote).toHaveBeenCalledWith({
                event: 'MODIFIED',
                agentPermanentId: 'agent-a',
                agentName: 'Latest name',
            });
            expect(runWithServerContextOverride).toHaveBeenCalledWith(FIRST_TEST_SERVER, expect.any(Function));

            jest.advanceTimersByTime(15_000);

            expect(recordAgentGoalChatLifecycleNote).toHaveBeenCalledTimes(2);
            expect(recordAgentGoalChatLifecycleNote).toHaveBeenLastCalledWith({
                event: 'MODIFIED',
                agentPermanentId: 'agent-a',
                agentName: 'Other agent',
            });
            expect(runWithServerContextOverride).toHaveBeenLastCalledWith(SECOND_TEST_SERVER, expect.any(Function));
        } finally {
            jest.useRealTimers();
        }
    });
});

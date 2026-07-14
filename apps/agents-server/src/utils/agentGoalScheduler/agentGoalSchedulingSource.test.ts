import { spaceTrim } from '@promptbook-local/utils';
import type { string_book } from '@promptbook-local/types';
import {
    createAgentGoalAwakeningClientMessageId,
    createAgentGoalAwakeningMessage,
    createAgentGoalChatId,
    createAgentGoalSourceHash,
    hasExplicitUseTimeoutCommitment,
    resolveEffectiveGoalFromAgentSource,
} from './agentGoalSchedulingSource';

describe('agentGoalSchedulingSource', () => {
    it('resolves the last non-empty GOAL or GOALS commitment', () => {
        const agentSource = spaceTrim(`
            Planning Agent

            GOAL Keep a loose draft plan.
            GOALS Publish a new status update every weekday.
        `) as string_book;

        expect(resolveEffectiveGoalFromAgentSource(agentSource)).toBe('Publish a new status update every weekday.');
    });

    it('returns null when an agent source has no goal', () => {
        const agentSource = spaceTrim(`
            Support Agent

            PERSONA You help users with support requests.
        `) as string_book;

        expect(resolveEffectiveGoalFromAgentSource(agentSource)).toBeNull();
    });

    it('detects explicit USE TIMEOUT commitments', () => {
        const agentSource = spaceTrim(`
            Follow-up Agent

            USE TIMEOUT Follow up only when requested.
        `) as string_book;

        expect(hasExplicitUseTimeoutCommitment(agentSource)).toBe(true);
    });

    it('creates stable chat and client message identifiers', () => {
        const agentSource = spaceTrim(`
            Social Agent

            GOAL Keep the Facebook page updated.
        `) as string_book;
        const agentSourceHash = createAgentGoalSourceHash(agentSource);

        expect(createAgentGoalChatId({ userId: 7, agentPermanentId: 'agent-1' })).toBe('agent-goal:7:agent-1');
        expect(
            createAgentGoalAwakeningClientMessageId({
                triggerReason: 'AGENT_SOURCE_UPDATED',
                agentSourceHash,
            }),
        ).toBe(`agent-goal:AGENT_SOURCE_UPDATED:${agentSourceHash}`);
    });

    it('creates a goal wake-up message with scheduling instructions', () => {
        const message = createAgentGoalAwakeningMessage({
            goal: 'Post one project update every day.',
            triggerReason: 'AGENT_CREATED',
            agentSourceHash: 'hash-1',
        });

        expect(message).toContain('Agent goal wake-up');
        expect(message).toContain('Post one project update every day.');
        expect(message).toContain('list_timeouts');
        expect(message).toContain('set_timeout');
        expect(message).toContain('recurrenceIntervalMs');
    });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AgentCollection, string_book } from '@promptbook-local/types';

/**
 * Mocked goal-chat lifecycle recorder.
 */
const RECORD_AGENT_GOAL_CHAT_LIFECYCLE_NOTE_MOCK = jest.fn(async () => undefined);

/**
 * Mocked agent-owner assignment.
 */
const ASSIGN_AGENT_OWNER_MOCK = jest.fn(async () => undefined);

/**
 * Mocked metadata visibility resolver.
 */
const GET_DEFAULT_AGENT_VISIBILITY_MOCK = jest.fn(async () => 'PRIVATE' as const);

jest.mock('./agentGoalChat/recordAgentGoalChatLifecycleNote', () => ({
    recordAgentGoalChatLifecycleNote: RECORD_AGENT_GOAL_CHAT_LIFECYCLE_NOTE_MOCK,
}));

jest.mock('./agentOwnership', () => ({
    assignAgentOwner: ASSIGN_AGENT_OWNER_MOCK,
}));

jest.mock('./getDefaultAgentVisibility', () => ({
    getDefaultAgentVisibility: GET_DEFAULT_AGENT_VISIBILITY_MOCK,
}));

import { createAgentWithDefaultVisibility } from './createAgentWithDefaultVisibility';

describe('createAgentWithDefaultVisibility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('records one goal-chat lifecycle turn for every shared creation path', async () => {
        const agentSource = 'Publishing agent\n\nGOAL Publish one useful update every day.' as string_book;
        const createAgent = jest.fn(async () => ({
            agentName: 'Publishing agent',
            permanentId: 'agent-1',
        }));
        const collection = { createAgent } as unknown as AgentCollection;

        const createdAgent = await createAgentWithDefaultVisibility(collection, agentSource, { userId: 42 });

        expect(createdAgent.permanentId).toBe('agent-1');
        expect(createAgent).toHaveBeenCalledWith(agentSource, { visibility: 'PRIVATE' });
        expect(ASSIGN_AGENT_OWNER_MOCK).toHaveBeenCalledWith('agent-1', 42);
        expect(RECORD_AGENT_GOAL_CHAT_LIFECYCLE_NOTE_MOCK).toHaveBeenCalledWith({
            event: 'CREATED',
            agentPermanentId: 'agent-1',
            agentName: 'Publishing agent',
            agentSource,
        });
    });
});

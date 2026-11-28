import { AGENT_GOAL_CHAT_ID_PREFIX, buildAgentGoalChatId, isAgentGoalChatId } from './agentGoalChatIdentity';

describe('agentGoalChatIdentity', () => {
    it('derives exactly one deterministic goal-chat id per agent', () => {
        expect(buildAgentGoalChatId('agent-kgj7sjiccnnfh5')).toBe(
            `${AGENT_GOAL_CHAT_ID_PREFIX}agent-kgj7sjiccnnfh5`,
        );
        expect(buildAgentGoalChatId('agent-kgj7sjiccnnfh5')).toBe(buildAgentGoalChatId('agent-kgj7sjiccnnfh5'));
        expect(buildAgentGoalChatId('agent-other')).not.toBe(buildAgentGoalChatId('agent-kgj7sjiccnnfh5'));
    });

    it('recognizes goal chats from the chat id alone', () => {
        expect(isAgentGoalChatId(buildAgentGoalChatId('agent-kgj7sjiccnnfh5'))).toBe(true);
        expect(isAgentGoalChatId('Xq7Lp2mNb4Tk9F')).toBe(false);
        expect(isAgentGoalChatId(null)).toBe(false);
        expect(isAgentGoalChatId(undefined)).toBe(false);
    });
});

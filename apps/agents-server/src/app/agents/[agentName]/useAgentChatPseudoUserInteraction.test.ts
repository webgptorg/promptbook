import { describe, expect, it } from '@jest/globals';
import type { ToolCall } from '@promptbook-local/types';
import { resolvePendingPseudoUserInteraction } from './useAgentChatPseudoUserInteraction';

/**
 * Creates one minimal TEAM tool call used by pseudo-user interaction tests.
 *
 * @param result - Serialized TEAM tool result payload.
 * @returns Tool call fixture.
 */
function createPseudoUserToolCall(result: unknown): ToolCall {
    return {
        name: 'team_chat_user',
        createdAt: '2026-04-06T12:00:00.000Z',
        result: JSON.stringify(result),
    } as unknown as ToolCall;
}

describe('resolvePendingPseudoUserInteraction', () => {
    it('preserves the normalized TEAM conversation transcript for the popup', () => {
        const toolCall = createPseudoUserToolCall({
            teammate: {
                label: 'User',
            },
            interaction: {
                kind: 'PSEUDO_USER_SINGLE_MESSAGE',
                prompt: 'Can you confirm the launch date?',
            },
            conversation: [
                {
                    sender: 'AGENT',
                    name: 'Release coordinator',
                    content: 'Can you confirm the launch date?',
                },
                {
                    role: 'TEAMMATE',
                    name: 'User',
                    content: 'Waiting for one user reply.',
                },
                {
                    sender: 'AGENT',
                    content: '   ',
                },
            ],
        });

        const pendingInteraction = resolvePendingPseudoUserInteraction(toolCall, 'Fallback agent');

        expect(pendingInteraction.prompt).toBe('Can you confirm the launch date?');
        expect(pendingInteraction.agentName).toBe('Fallback agent');
        expect(pendingInteraction.teammateLabel).toBe('User');
        expect(pendingInteraction.conversation).toEqual([
            {
                sender: 'AGENT',
                name: 'Release coordinator',
                content: 'Can you confirm the launch date?',
            },
            {
                sender: 'TEAMMATE',
                name: 'User',
                content: 'Waiting for one user reply.',
            },
        ]);
    });

    it('builds a fallback transcript when the TEAM tool result omits conversation entries', () => {
        const toolCall = createPseudoUserToolCall({
            teammate: {
                label: 'Stakeholder',
            },
            request: 'Which option should we choose?',
            response: 'User response is pending in the UI modal.',
        });

        const pendingInteraction = resolvePendingPseudoUserInteraction(toolCall, 'Decision agent');

        expect(pendingInteraction.prompt).toBe('Which option should we choose?');
        expect(pendingInteraction.conversation).toEqual([
            {
                sender: 'AGENT',
                name: 'Decision agent',
                content: 'Which option should we choose?',
            },
            {
                sender: 'TEAMMATE',
                name: 'Stakeholder',
                content: 'User response is pending in the UI modal.',
            },
        ]);
    });
});

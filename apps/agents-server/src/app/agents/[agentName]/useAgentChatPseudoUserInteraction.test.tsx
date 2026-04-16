/** @jest-environment jsdom */

import type { ToolCall } from '@promptbook-local/types';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { PSEUDO_AGENT_USER_URL } from '../../../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import { useAgentChatPseudoUserInteraction } from './useAgentChatPseudoUserInteraction';

/**
 * Test-only harness exposing the pseudo-user interaction hook state.
 */
function PseudoUserInteractionHarness(props: { readonly toolCall: ToolCall }) {
    const { pendingPseudoUserInteraction, openPendingPseudoUserInteraction } = useAgentChatPseudoUserInteraction({
        agent: {
            agentName: 'planner-agent',
            meta: {
                fullname: 'Trip planner',
            },
        },
        sendMessage: jest.fn(),
    });

    return (
        <>
            <button type="button" onClick={() => openPendingPseudoUserInteraction(props.toolCall)}>
                Open teammate call
            </button>
            <pre data-testid="pending-interaction">{JSON.stringify(pendingPseudoUserInteraction)}</pre>
        </>
    );
}

describe('useAgentChatPseudoUserInteraction', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('preserves the mocked teammate conversation transcript from TEAM tool results', () => {
        const toolCall: ToolCall = {
            name: 'team_chat_user',
            result: JSON.stringify({
                teammate: {
                    url: PSEUDO_AGENT_USER_URL,
                    label: 'User',
                },
                request: 'Need details about your budget.',
                interaction: {
                    kind: 'PSEUDO_USER_SINGLE_MESSAGE',
                    prompt: 'Need details about your budget.',
                },
                conversation: [
                    {
                        sender: 'AGENT',
                        name: 'Trip planner',
                        content: 'Need details about your budget.',
                    },
                    {
                        sender: 'TEAMMATE',
                        name: 'User',
                        content: 'Waiting for one user reply.',
                    },
                ],
            }),
        };

        render(<PseudoUserInteractionHarness toolCall={toolCall} />);

        fireEvent.click(screen.getByRole('button', { name: 'Open teammate call' }));

        const pendingInteractionText = screen.getByTestId('pending-interaction').textContent || 'null';
        const pendingInteraction = JSON.parse(pendingInteractionText) as {
            readonly prompt: string;
            readonly agentName: string;
            readonly teammateLabel: string;
            readonly conversation: ReadonlyArray<{
                readonly sender: string;
                readonly name: string;
                readonly content: string;
            }>;
        } | null;

        expect(pendingInteraction?.prompt).toBe('Need details about your budget.');
        expect(pendingInteraction?.agentName).toBe('Trip planner');
        expect(pendingInteraction?.teammateLabel).toBe('User');
        expect(pendingInteraction?.conversation).toEqual([
            {
                sender: 'AGENT',
                name: 'Trip planner',
                content: 'Need details about your budget.',
            },
            {
                sender: 'TEAMMATE',
                name: 'User',
                content: 'Waiting for one user reply.',
            },
        ]);
    });
});

/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react';
import { AgentProfileChatOptimisticNavigationTestSupport } from './AgentProfileChatOptimisticNavigationTestSupport';
import { AgentProfileChat } from './AgentProfileChat';
import { AgentChatHistoryClient } from './chat/AgentChatHistoryClient';
import { setPendingProfileMessage } from './profileMessageCache';

/**
 * Exercises the profile-page handoff flow for one optimistic message label.
 */
async function expectProfileMessageToSurviveHandoff(messageLabel: string): Promise<void> {
    AgentProfileChatOptimisticNavigationTestSupport.preparePendingNewChatBootstrap();

    const profileView = AgentProfileChatOptimisticNavigationTestSupport.renderProfileChat(AgentProfileChat);

    fireEvent.click(screen.getByRole('button', { name: messageLabel }));

    expect(AgentProfileChatOptimisticNavigationTestSupport.routerPushMock).toHaveBeenCalledWith(
        AgentProfileChatOptimisticNavigationTestSupport.newChatDestination,
    );

    profileView.unmount();

    AgentProfileChatOptimisticNavigationTestSupport.renderHistoryClient(AgentChatHistoryClient, {
        initialForceNewChat: true,
    });

    await AgentProfileChatOptimisticNavigationTestSupport.expectQueuedUserMessage(messageLabel);
}

describe('Agent profile to chat optimistic handoff', () => {
    beforeEach(() => {
        AgentProfileChatOptimisticNavigationTestSupport.setup();
    });

    afterEach(() => {
        AgentProfileChatOptimisticNavigationTestSupport.teardown();
    });

    it('shows the quick-button profile message immediately on the chat page before bootstrap resolves', async () => {
        await expectProfileMessageToSurviveHandoff('Quick hello from profile');
    });

    it('shows the typed profile message immediately on the chat page before bootstrap resolves', async () => {
        await expectProfileMessageToSurviveHandoff('Typed hello from profile');
    });

    it('shows query-param auto-executed messages immediately in the targeted existing chat', async () => {
        AgentProfileChatOptimisticNavigationTestSupport.preparePendingExistingChatBootstrap();

        AgentProfileChatOptimisticNavigationTestSupport.renderHistoryClient(AgentChatHistoryClient, {
            initialChatId: 'chat-existing',
            initialAutoExecuteMessage: 'Continue in the existing chat',
        });

        await AgentProfileChatOptimisticNavigationTestSupport.expectActiveChatId('chat-existing');
        await AgentProfileChatOptimisticNavigationTestSupport.expectQueuedUserMessage('Continue in the existing chat');
    });

    it('reuses the persisted profile handoff client message id for the durable send request', async () => {
        setPendingProfileMessage('test-agent', {
            message: 'Typed hello from profile',
            clientMessageId: 'profile-client-message-1',
        });
        AgentProfileChatOptimisticNavigationTestSupport.prepareResolvedExistingChatBootstrap('chat-existing');
        AgentProfileChatOptimisticNavigationTestSupport.renderHistoryClient(AgentChatHistoryClient, {
            initialChatId: 'chat-existing',
        });

        await AgentProfileChatOptimisticNavigationTestSupport.expectSubmittedClientMessageId(
            'profile-client-message-1',
            'chat-existing',
        );
    });
});

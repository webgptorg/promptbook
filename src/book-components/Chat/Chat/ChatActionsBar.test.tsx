/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';
import type { ChatMessage } from '../types/ChatMessage';

jest.mock('../save/_common/getChatSaveFormatDefinitions', () => ({
    getChatSaveFormatDefinitions: () => [],
}));

import { ChatActionsBar } from './ChatActionsBar';

/**
 * Minimal message fixture that keeps the action bar visible during tests.
 */
const FIXTURE_MESSAGES: ReadonlyArray<ChatMessage> = [
    {
        id: 'message-1',
        createdAt: $getCurrentDate(),
        sender: 'AGENT',
        content: 'Hello from the action bar test.',
        isComplete: true,
    },
];

describe('ChatActionsBar', () => {
    it('renders the "New chat" control as a link when a destination href is provided', () => {
        const actionsRef = {
            current: null as HTMLDivElement | null,
        };

        render(
            <ChatActionsBar
                actionsRef={actionsRef}
                messages={FIXTURE_MESSAGES}
                participants={[]}
                title="Action bar test"
                newChatButtonHref="/agents/demo/chat?chat=new"
                isSaveButtonEnabled={false}
                shouldFadeActions={false}
                shouldDisableActions={false}
                onButtonClick={() => () => undefined}
            />,
        );

        const newChatLink = screen.getByRole('link', { name: 'New chat' });

        expect(newChatLink.getAttribute('href')).toBe('/agents/demo/chat?chat=new');
        expect(screen.queryByRole('button', { name: 'New chat' })).toBeNull();
    });
});

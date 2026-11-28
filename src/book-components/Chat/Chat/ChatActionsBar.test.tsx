/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';
import type { ChatMessage } from '../types/ChatMessage';

jest.mock('../save/_common/getChatSaveFormatDefinitions', () => ({
    getChatSaveFormatDefinitions: jest.fn(() => []),
}));

import { getChatSaveFormatDefinitions } from '../save/_common/getChatSaveFormatDefinitions';
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

/**
 * Typed access to the mocked save-format registry.
 */
const getChatSaveFormatDefinitionsMock = getChatSaveFormatDefinitions as jest.MockedFunction<
    typeof getChatSaveFormatDefinitions
>;

describe('ChatActionsBar', () => {
    it('delegates handled save formats to the host application override', async () => {
        const actionsRef = {
            current: null as HTMLDivElement | null,
        };
        const handlePdfDownload = jest.fn(async () => undefined);

        getChatSaveFormatDefinitionsMock.mockReturnValue([
            {
                formatName: 'pdf',
                label: 'PDF',
                mimeType: 'application/pdf',
                fileExtension: 'pdf',
                getContent: jest.fn(async () => 'unused'),
            },
        ]);

        render(
            <ChatActionsBar
                actionsRef={actionsRef}
                messages={FIXTURE_MESSAGES}
                participants={[]}
                title="Action bar test"
                saveFormats={['pdf']}
                saveFormatHandlers={{ pdf: handlePdfDownload }}
                isSaveButtonEnabled={true}
                shouldFadeActions={false}
                shouldDisableActions={false}
                onButtonClick={(handler) => () => {
                    handler?.({} as never);
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        fireEvent.click(screen.getByRole('button', { name: 'PDF' }));

        await waitFor(() =>
            expect(handlePdfDownload).toHaveBeenCalledWith({
                title: 'Action bar test',
                messages: FIXTURE_MESSAGES,
                participants: [],
            }),
        );
    });

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

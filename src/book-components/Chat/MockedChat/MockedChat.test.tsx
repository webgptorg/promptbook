/** @jest-environment jsdom */

import { describe, expect, it, jest } from '@jest/globals';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ChatMessage } from '../types/ChatMessage';

/**
 * Enables React's `act` checks for this browser-component test.
 *
 * @private test constant of `MockedChat`
 */
const REACT_ACT_ENVIRONMENT = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean };
REACT_ACT_ENVIRONMENT.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Captures props passed from MockedChat to its Chat renderer.
 *
 * @private test utility of `MockedChat`
 */
type CapturedChatProps = {
    readonly messages: ReadonlyArray<ChatMessage>;
};

/**
 * Records each mocked `<Chat/>` render for assertions.
 *
 * @private test constant of `MockedChat`
 */
const MOCK_RENDERED_CHAT_PROPS: Array<CapturedChatProps> = [];

jest.mock('../Chat/Chat', () => ({
    Chat: (props: CapturedChatProps) => {
        MOCK_RENDERED_CHAT_PROPS.push(props);
        return null;
    },
}));

import { MockedChat } from './MockedChat';

describe('MockedChat', () => {
    it('provides a stable id when a mocked message has no source id', async () => {
        const container = document.createElement('div');
        const root = createRoot(container);

        await act(async () => {
            root.render(
                <MockedChat
                    layout="STANDALONE"
                    messages={[
                        {
                            sender: 'ASSISTANT',
                            content: 'One two',
                            isComplete: true,
                        },
                    ]}
                    delayConfig={{
                        beforeFirstMessage: 0,
                        showIntermediateMessages: 1,
                    }}
                />,
            );
            await Promise.resolve();
        });

        const renderedMessages = MOCK_RENDERED_CHAT_PROPS.at(-1)?.messages;

        expect(renderedMessages).toEqual([
            expect.objectContaining({
                id: 'mocked-chat-message-0',
            }),
        ]);

        await act(async () => {
            root.unmount();
        });
    });
});

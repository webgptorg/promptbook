/** @jest-environment jsdom */

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { Color } from '../../../utils/color/Color';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import type { ChatInputAreaProps } from './ChatInputArea';
import { ChatInputArea } from './ChatInputArea';

/**
 * Shared participant fixture used by composer tests.
 */
const TEST_PARTICIPANTS: ReadonlyArray<ChatParticipant> = [
    {
        name: 'USER',
        fullname: 'User',
        color: '#115EB6',
        isMe: true,
    },
    {
        name: 'AGENT',
        fullname: 'Agent',
        color: '#ffffff',
        isMe: false,
    },
];

/**
 * Creates minimal props required to render `<ChatInputArea/>` in isolation.
 */
function createProps(overrides: Partial<ChatInputAreaProps> = {}): ChatInputAreaProps {
    return {
        onMessage: async () => undefined,
        isMobile: false,
        participants: TEST_PARTICIPANTS,
        buttonColor: Color.from('#0066cc'),
        onButtonClick: (handler) => (event) => handler?.(event),
        ...overrides,
    };
}

/**
 * Returns the rendered textarea used by the chat composer.
 */
function getComposerTextarea(container: HTMLElement): HTMLTextAreaElement {
    const textarea = container.querySelector('textarea');
    if (!textarea) {
        throw new Error('Expected chat composer textarea.');
    }

    return textarea;
}

describe('ChatInputArea', () => {
    it('sends the message on Enter when enterBehavior is SEND', async () => {
        const onMessage = jest.fn(async () => undefined);
        const { container } = render(<ChatInputArea {...createProps({ onMessage, enterBehavior: 'SEND' })} />);
        const textarea = getComposerTextarea(container);

        fireEvent.change(textarea, { target: { value: 'Hello world' } });
        fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

        await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Hello world', [], null));
        await waitFor(() => expect(textarea.value).toBe(''));
    });

    it('inserts a newline on Ctrl+Enter when enterBehavior is SEND', () => {
        const onMessage = jest.fn(async () => undefined);
        const { container } = render(<ChatInputArea {...createProps({ onMessage, enterBehavior: 'SEND' })} />);
        const textarea = getComposerTextarea(container);

        fireEvent.change(textarea, { target: { value: 'Hello world' } });
        fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', ctrlKey: true });

        expect(onMessage).not.toHaveBeenCalled();
        expect(textarea.value).toBe('Hello world\n');
    });

    it('inserts a newline on Enter and sends on Ctrl+Enter when enterBehavior is NEWLINE', async () => {
        const onMessage = jest.fn(async () => undefined);
        const { container } = render(<ChatInputArea {...createProps({ onMessage, enterBehavior: 'NEWLINE' })} />);
        const textarea = getComposerTextarea(container);

        fireEvent.change(textarea, { target: { value: 'Line one' } });
        fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

        expect(onMessage).not.toHaveBeenCalled();
        expect(textarea.value).toBe('Line one\n');

        fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', ctrlKey: true });

        await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Line one\n', [], null));
        await waitFor(() => expect(textarea.value).toBe(''));
    });

    it('does not treat IME composition Enter as send', () => {
        const onMessage = jest.fn(async () => undefined);
        const { container } = render(<ChatInputArea {...createProps({ onMessage, enterBehavior: 'SEND' })} />);
        const textarea = getComposerTextarea(container);

        fireEvent.change(textarea, { target: { value: 'こんにちは' } });
        fireEvent.keyDown(textarea, {
            key: 'Enter',
            code: 'Enter',
            isComposing: true,
            keyCode: 229,
        });

        expect(onMessage).not.toHaveBeenCalled();
        expect(textarea.value).toBe('こんにちは');
    });

    it('applies the first deferred Enter as send when the resolver returns SEND and the text is unchanged', async () => {
        const onMessage = jest.fn(async () => undefined);
        let resolveBehavior: ((behavior: 'SEND' | 'NEWLINE' | null) => void) | null = null;
        const resolveEnterBehavior = jest.fn(
            () =>
                new Promise<'SEND' | 'NEWLINE' | null>((resolve) => {
                    resolveBehavior = resolve;
                }),
        );
        const { container } = render(
            <ChatInputArea
                {...createProps({
                    onMessage,
                    resolveEnterBehavior,
                })}
            />,
        );
        const textarea = getComposerTextarea(container);

        fireEvent.change(textarea, { target: { value: 'Deferred send' } });
        fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

        expect(resolveEnterBehavior).toHaveBeenCalledTimes(1);
        expect(onMessage).not.toHaveBeenCalled();

        await act(async () => {
            resolveBehavior?.('SEND');
            await Promise.resolve();
        });

        await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Deferred send', [], null));
        await waitFor(() => expect(textarea.value).toBe(''));
    });

    it('keeps the text unchanged when deferred Enter resolves after the user keeps typing', async () => {
        const onMessage = jest.fn(async () => undefined);
        let resolveBehavior: ((behavior: 'SEND' | 'NEWLINE' | null) => void) | null = null;
        const resolveEnterBehavior = jest.fn(
            () =>
                new Promise<'SEND' | 'NEWLINE' | null>((resolve) => {
                    resolveBehavior = resolve;
                }),
        );
        const { container } = render(
            <ChatInputArea
                {...createProps({
                    onMessage,
                    resolveEnterBehavior,
                })}
            />,
        );
        const textarea = getComposerTextarea(container);

        fireEvent.change(textarea, { target: { value: 'Deferred send' } });
        fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
        fireEvent.change(textarea, { target: { value: 'Deferred send later' } });

        await act(async () => {
            resolveBehavior?.('SEND');
            await Promise.resolve();
        });

        expect(onMessage).not.toHaveBeenCalled();
        expect(textarea.value).toBe('Deferred send later');
    });

    it('renders reply preview, sends the selected reply target, and cancels on Escape', async () => {
        const onMessage = jest.fn(async () => undefined);
        const onCancelReply = jest.fn();
        const replyingToMessage: ChatMessage = {
            id: 'assistant-message-1',
            sender: 'AGENT',
            content: 'Can you focus on the quarterly budget?',
            createdAt: '2026-04-10T12:00:00.000Z' as NonNullable<ChatMessage['createdAt']>,
            isComplete: true,
        };
        const { container, getByText } = render(
            <ChatInputArea
                {...createProps({
                    onMessage,
                    onCancelReply,
                    enterBehavior: 'SEND',
                    replyingToMessage,
                    chatUiTranslations: {
                        replyingToLabel: 'Replying to',
                        cancelReplyLabel: 'Cancel reply',
                    },
                })}
            />,
        );
        const textarea = getComposerTextarea(container);

        expect(getByText('Replying to')).toBeDefined();
        expect(getByText('Agent')).toBeDefined();
        expect(getByText('Can you focus on the quarterly budget?')).toBeDefined();

        fireEvent.keyDown(textarea, { key: 'Escape', code: 'Escape' });
        expect(onCancelReply).toHaveBeenCalledTimes(1);

        fireEvent.change(textarea, { target: { value: 'Yes, operating expenses first.' } });
        fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

        await waitFor(() =>
            expect(onMessage).toHaveBeenCalledWith('Yes, operating expenses first.', [], replyingToMessage),
        );
        await waitFor(() => expect(onCancelReply).toHaveBeenCalledTimes(2));
    });
});

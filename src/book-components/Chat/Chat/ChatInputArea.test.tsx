/** @jest-environment jsdom */

import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';
import { Color } from '../../../utils/color/Color';
import type { ChatParticipant } from '../types/ChatParticipant';
import { ChatInputArea, type ChatInputAreaProps } from './ChatInputArea';

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

        await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Hello world', []));
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

        await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Line one\n', []));
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

        await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Deferred send', []));
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
});

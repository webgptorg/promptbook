/** @jest-environment jsdom */
import { describe, expect, it } from '@jest/globals';
import { MockedEchoLlmExecutionTools } from '../../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { ChatMessage } from '../types/ChatMessage';
import type { LlmChatProps } from './LlmChatProps';

type CapturedChatProps = {
    messages: ReadonlyArray<ChatMessage>;
    onReset?: () => Promise<void> | void;
    // Allow other props without using `any`
    [key: string]: unknown;
};

// Mock the Chat component to capture props (including messages + onReset) without rendering DOM
jest.mock('../Chat/Chat', () => ({
    Chat: (props: CapturedChatProps) => {
        (globalThis as unknown as { __lastChatProps?: CapturedChatProps }).__lastChatProps = props;
        return null;
    },
}));

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { LlmChat } from './LlmChat';

describe('LlmChat', () => {
    const mockLlmTools = new MockedEchoLlmExecutionTools({ isVerbose: false });

    it('should pass the thread prop to llmTools.callChatModel', async () => {
        let capturedThread: ChatMessage[] | undefined = undefined;
        const customLlmTools = {
            ...mockLlmTools,
            callChatModel: jest.fn(async (prompt) => {
                capturedThread = prompt.thread;
                return {
                    content: 'Echo',
                    modelName: 'mocked-echo',
                };
            }),
        };

        const thread: ChatMessage[] = [
            {
                channel: 'PROMPTBOOK_CHAT',
                id: 't1',
                createdAt: new Date(),
                sender: 'USER',
                content: 'First',
                isComplete: true,
            },
            {
                channel: 'PROMPTBOOK_CHAT',
                id: 't2',
                createdAt: new Date(),
                sender: 'ASSISTANT',
                content: 'Second',
                isComplete: true,
            },
        ];

        // Render LlmChat with thread prop and trigger a message
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(<LlmChat title="Test" llmTools={customLlmTools as TODO_any} thread={thread} />);
        });

        // Simulate sending a message
        const rawProps = (globalThis as { __lastChatProps?: CapturedChatProps }).__lastChatProps as TODO_any;
        expect(rawProps).toBeDefined();
        if (!rawProps || !rawProps.onMessage) throw new Error('Expected onMessage');
        await act(async () => {
            await rawProps.onMessage('Test message');
        });

        expect(capturedThread).toBeDefined();
        expect(Array.isArray(capturedThread)).toBe(true);
        expect((capturedThread as TODO_any)?.length).toBe(2);
        expect((capturedThread as TODO_any)?.[0]?.content).toBe('First');
        expect((capturedThread as TODO_any)?.[1]?.content).toBe('Second');
    });

    it('should have correct props interface', () => {
        // Test that LlmChatProps derives correctly from ChatProps
        const props: LlmChatProps = {
            title: 'Test',
            llmTools: mockLlmTools,
            placeholderMessageContent: 'Test placeholder',
        };

        expect(props.llmTools).toBe(mockLlmTools);
        expect(props.placeholderMessageContent).toBe('Test placeholder');
    });

    it('should work with MockedEchoLlmExecutionTools', async () => {
        // Test that the LLM tools work correctly
        const result = await mockLlmTools.callChatModel!({
            content: 'Hello AI!',
            parameters: {},
            modelRequirements: {
                modelVariant: 'CHAT',
            },
        });

        expect(result.content).toContain('You said:');
        expect(result.content).toContain('Hello AI!');
        expect(result.modelName).toBe('mocked-echo');
    });

    it('should generate correct participants from LLM tools', () => {
        // Test participant generation logic
        const expectedParticipants = [
            {
                name: 'USER',
                fullname: 'You',
                isMe: true,
                color: '#3b82f6',
            },
            {
                name: 'ASSISTANT',
                fullname: mockLlmTools.title || 'AI Assistant',
                color: '#10b981',
            },
        ];

        expect(expectedParticipants[0]?.name).toBe('USER');
        expect(expectedParticipants[1]?.name).toBe('ASSISTANT');
        expect(expectedParticipants[1]?.fullname).toBe('Mocked echo');
    });

    it('should handle LLM tools without chat model support', () => {
        // Test error handling for LLM tools without callChatModel
        const incompleteLlmTools: Partial<typeof mockLlmTools> = {
            title: 'Incomplete LLM',
            description: 'Test LLM without chat support',
            checkConfiguration: () => {},
            listModels: () => [],
            // Note: Missing callChatModel
        };

        expect(incompleteLlmTools.title).toBe('Incomplete LLM');
        expect(incompleteLlmTools.callChatModel).toBeUndefined();
    });

    it('should validate required props', () => {
        // Test that llmTools is required
        const validProps: LlmChatProps = {
            title: 'Test',
            llmTools: mockLlmTools,
        };

        expect(validProps.llmTools).toBeDefined();
        expect(typeof validProps.llmTools.title).toBe('string');
    });

    it('should support all optional props from Chat component', () => {
        // Test that all optional props are properly typed
        const fullProps: LlmChatProps = {
            title: 'Test',
            llmTools: mockLlmTools,
            onChange: () => {},
            onReset: async () => {},
            isVoiceRecognitionButtonShown: true,
            voiceLanguage: 'en-US',
            placeholderMessageContent: 'Type here...',
            defaultMessage: 'Hello',
            className: 'test-class',
            style: { height: '400px' },
            isVoiceCalling: false,
            isExperimental: true,
            isSaveButtonEnabled: false,
            exportHeaderMarkdown: '# Chat Export',
            onUseTemplate: () => {},
        };

        expect(fullProps.llmTools).toBe(mockLlmTools);
        expect(fullProps.voiceLanguage).toBe('en-US');
        expect(fullProps.style?.height).toBe('400px');
    });

    it('should accept initialMessages with USER and ASSISTANT messages', () => {
        const initialMessages: ChatMessage[] = [
            {
                channel: 'PROMPTBOOK_CHAT',
                id: 'seed-user',
                createdAt: new Date(),
                sender: 'USER',
                content: 'Hello assistant, are you initialized?',
                isComplete: true,
            },
            {
                channel: 'PROMPTBOOK_CHAT',
                id: 'seed-assistant',
                createdAt: new Date(),
                sender: 'ASSISTANT',
                content: 'Initialization complete. Ready to echo your thoughts.',
                isComplete: true,
            },
        ];

        const props: LlmChatProps = {
            title: 'Test',
            llmTools: mockLlmTools,
            initialMessages,
        };

        expect(props.initialMessages).toBeDefined();
        expect(props.initialMessages?.length).toBe(2);
        expect(props.initialMessages?.[0]?.sender).toBe('USER');
        expect(props.initialMessages?.[1]?.sender).toBe('ASSISTANT');
    });

    it('should allow optional external sendMessage prop in LlmChatProps', () => {
        // Minimal shape of SendMessageToLlmChatFunction
        type SendMessageToLlmChatFunction = {
            (message: string): void;
            _attach?: (handler: (message: string) => void) => void;
        };

        const attached: string[] = [];

        const fakeSend: SendMessageToLlmChatFunction = Object.assign(
            (msg: string) => {
                // queue simulation (ignored here)
                attached.push('queued:' + msg);
            },
            {
                _attach: (handler: (m: string) => void) => {
                    // simulate queued flush
                    handler('flush-1');
                    handler('flush-2');
                },
            },
        );

        const props: LlmChatProps = {
            title: 'Test',
            llmTools: mockLlmTools,
            sendMessage: fakeSend,
        };

        expect(typeof props.sendMessage).toBe('function');
        expect(typeof props.sendMessage?._attach).toBe('function');
    });

    it('should re-seed initialMessages after reset (New chat)', async () => {
        const initialMessages: ChatMessage[] = [
            {
                channel: 'PROMPTBOOK_CHAT',
                id: 'init-user',
                createdAt: new Date(),
                sender: 'USER',
                content: 'Hi assistant (seed)',
                isComplete: true,
            },
            {
                channel: 'PROMPTBOOK_CHAT',
                id: 'init-assistant',
                createdAt: new Date(),
                sender: 'ASSISTANT',
                content: 'Hello user (seed)',
                isComplete: true,
            },
        ];

        // Render LlmChat with mocked Chat component
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(<LlmChat title="Test" llmTools={mockLlmTools} initialMessages={initialMessages} />);
        });

        const rawFirstProps = (globalThis as { __lastChatProps?: CapturedChatProps }).__lastChatProps;
        expect(rawFirstProps).toBeDefined();
        const firstProps = rawFirstProps as CapturedChatProps;
        expect(firstProps.messages).toHaveLength(2);
        expect(firstProps.messages[0]!.content).toContain('Hi assistant');
        expect(firstProps.messages[1]!.content).toContain('Hello user');

        // Trigger reset via captured onReset (assert defined to satisfy TS)
        if (!firstProps.onReset) {
            throw new Error('Expected onReset to be defined on firstProps');
        }
        await act(async () => {
            await firstProps.onReset!();
        });

        const rawAfterResetProps = (globalThis as { __lastChatProps?: CapturedChatProps }).__lastChatProps;
        expect(rawAfterResetProps).toBeDefined();
        if (!rawAfterResetProps) {
            throw new Error('Expected after reset chat props to be captured');
        }
        const afterResetProps = rawAfterResetProps as CapturedChatProps;
        expect(afterResetProps.messages).toHaveLength(2);
        expect(afterResetProps.messages[0]!.content).toContain('Hi assistant');
        expect(afterResetProps.messages[1]!.content).toContain('Hello user');
    });
});

/** @jest-environment jsdom */
import { describe, expect, it } from '@jest/globals';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MockedEchoLlmExecutionTools } from '../../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { ChatMessage } from '../types/ChatMessage';
import { AgentChat } from './AgentChat';
import type { AgentChatProps } from './AgentChatProps';

// Mock the LlmChat component to capture props
jest.mock('../LlmChat/LlmChat', () => ({
    LlmChat: (props: CapturedLlmChatProps) => {
        (globalThis as unknown as { __lastLlmChatProps?: CapturedLlmChatProps }).__lastLlmChatProps = props;
        return null;
    },
}));

/** @jest-environment jsdom */
import { Agent } from '../../../llm-providers/agent/Agent';
import { book } from '../../../pipeline/book-notation';

type CapturedLlmChatProps = {
    messages?: ReadonlyArray<ChatMessage>;
    onReset?: () => Promise<void> | void;
    initialMessages?: ReadonlyArray<ChatMessage>;
    title?: string;
    participants?: ReadonlyArray<TODO_any>;
    // Allow other props without using `any`
    [key: string]: unknown;
};

// Mock the LlmChat component to capture props
jest.mock('../LlmChat/LlmChat', () => ({
    LlmChat: (props: CapturedLlmChatProps) => {
        (globalThis as unknown as { __lastLlmChatProps?: CapturedLlmChatProps }).__lastLlmChatProps = props;
        return null;
    },
}));

describe('AgentChat', () => {
    const mockLlmTools = new MockedEchoLlmExecutionTools({ isVerbose: false });

    function createMockAgent(agentName = 'TestAgent', color = '#FF5733'): Agent {
        return new Agent({
            agentSource: book`
                ${agentName /* <- TODO: [🕛] There should be `agentFullname` not `agentName` */}

                PERSONA A helpful test assistant
                META IMAGE https://example.com/avatar.png
                META COLOR ${color}
            `,
            executionTools: {
                llm: mockLlmTools,
            },
            isVerbose: false,
        });
    }

    it('should render with required agent prop', async () => {
        const agent = createMockAgent('ChatBot');
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(<AgentChat agent={agent} />);
        });

        const capturedProps = (globalThis as { __lastLlmChatProps?: CapturedLlmChatProps }).__lastLlmChatProps;
        expect(capturedProps).toBeDefined();
        expect(capturedProps?.title).toContain(
            'Chat with chat-bot' /* <- TODO: [🕛] There should be `agentName` and `agentFullname` and here "Chat with ChatBot" */,
        );
    });

    it('should use custom title when provided', async () => {
        const agent = createMockAgent('BotName');
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(<AgentChat agent={agent} title="Custom Chat Title" />);
        });

        const capturedProps = (globalThis as { __lastLlmChatProps?: CapturedLlmChatProps }).__lastLlmChatProps;
        expect(capturedProps?.title).toBe('Custom Chat Title');
    });

    it('should configure participants correctly', async () => {
        const agent = createMockAgent('FriendlyBot', '#10b981');
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(<AgentChat agent={agent} />);
        });

        const capturedProps = (globalThis as { __lastLlmChatProps?: CapturedLlmChatProps }).__lastLlmChatProps;
        expect(capturedProps?.participants).toBeDefined();
        expect(Array.isArray(capturedProps?.participants)).toBe(true);

        const participants = capturedProps?.participants as TODO_any[];
        expect(participants.length).toBe(2);

        // Check AGENT participant
        const agentParticipant = participants.find((p: TODO_any) => p.name === 'AGENT');
        expect(agentParticipant).toBeDefined();
        expect(agentParticipant?.fullname).toBe('friendly-bot'); // <- TODO: [🕛] There should be `agentName` and `agentFullname` and here "FriendlyBot"
        expect(agentParticipant?.color).toBe('#10b981');
        expect(agentParticipant?.isMe).toBe(false);

        // Check USER participant
        const userParticipant = participants.find((p: TODO_any) => p.name === 'USER');
        expect(userParticipant).toBeDefined();
        expect(userParticipant?.fullname).toBe('User');
        expect(userParticipant?.isMe).toBe(true);
    });

    it('should include initial greeting message from agent', async () => {
        const agent = createMockAgent('GreeterBot');
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(<AgentChat agent={agent} />);
        });

        const capturedProps = (globalThis as { __lastLlmChatProps?: CapturedLlmChatProps }).__lastLlmChatProps;
        expect(capturedProps?.initialMessages).toBeDefined();
        expect(Array.isArray(capturedProps?.initialMessages)).toBe(true);

        const initialMessages = capturedProps?.initialMessages as ChatMessage[];
        expect(initialMessages.length).toBeGreaterThan(0);

        const firstMessage = initialMessages[0];
        expect(firstMessage?.from).toBe('AGENT');
        expect(firstMessage?.content).toContain('greeter-bot'); // <- TODO: [🕛]
    });

    it('should pass through optional props to LlmChat', async () => {
        const agent = createMockAgent();
        const container = document.createElement('div');
        document.body.appendChild(container);
        const mockOnChange = jest.fn();

        await act(async () => {
            const root = createRoot(container);
            root.render(
                <AgentChat
                    agent={agent}
                    onChange={mockOnChange}
                    isVoiceRecognitionButtonShown={true}
                    voiceLanguage="en-US"
                    className="custom-class"
                    style={{ height: '500px' }}
                />,
            );
        });

        const capturedProps = (globalThis as { __lastLlmChatProps?: CapturedLlmChatProps }).__lastLlmChatProps;
        expect(capturedProps).toBeDefined();
        expect(capturedProps?.onChange).toBe(mockOnChange);
        expect(capturedProps?.isVoiceRecognitionButtonShown).toBe(true);
        expect(capturedProps?.voiceLanguage).toBe('en-US');
        expect(capturedProps?.className).toBe('custom-class');
        expect((capturedProps?.style as TODO_any)?.height).toBe('500px');
    });

    it('should use agent metadata for participant configuration', async () => {
        const agent = createMockAgent('MetaBot', '#FF00FF');
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(<AgentChat agent={agent} />);
        });

        const capturedProps = (globalThis as { __lastLlmChatProps?: CapturedLlmChatProps }).__lastLlmChatProps;
        const participants = capturedProps?.participants as TODO_any[];
        const agentParticipant = participants?.find((p: TODO_any) => p.name === 'AGENT');

        expect(agentParticipant?.avatarSrc).toBe('https://example.com/avatar.png');
        expect(agentParticipant?.color).toBe('#FF00FF');
    });

    it('should work with minimal agent configuration', async () => {
        const minimalAgent = new Agent({
            agentSource: book`MinimalAgent`,
            executionTools: {
                llm: mockLlmTools,
            },
            isVerbose: false,
        });

        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(<AgentChat agent={minimalAgent} />);
        });

        const capturedProps = (globalThis as { __lastLlmChatProps?: CapturedLlmChatProps }).__lastLlmChatProps;
        expect(capturedProps).toBeDefined();
        expect(capturedProps?.title).toContain('minimal-agent'); // <- TODO: [🕛]
    });

    it('should have correct props interface', () => {
        const agent = createMockAgent();

        // Test that AgentChatProps has the correct shape
        const props: AgentChatProps = {
            agent,
            title: 'Test Chat',
            onChange: () => {},
            className: 'test-class',
        };

        expect(props.agent).toBe(agent);
        expect(props.title).toBe('Test Chat');
        expect(typeof props.onChange).toBe('function');
    });

    it('should use persistenceKey when provided', async () => {
        const agent = createMockAgent('PersistentBot');
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(<AgentChat agent={agent} persistenceKey="test-persistence-key" />);
        });

        const capturedProps = (globalThis as { __lastLlmChatProps?: CapturedLlmChatProps }).__lastLlmChatProps;
        expect(capturedProps?.persistenceKey).toBe('test-persistence-key');
    });

    it('should generate default persistenceKey from agent name', async () => {
        const agent = createMockAgent('KeyBot');
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(<AgentChat agent={agent} />);
        });

        const capturedProps = (globalThis as { __lastLlmChatProps?: CapturedLlmChatProps }).__lastLlmChatProps;
        expect(capturedProps?.persistenceKey).toContain('agent-chat');
        expect(capturedProps?.persistenceKey).toContain('agent-chat-key-bot');
    });
});

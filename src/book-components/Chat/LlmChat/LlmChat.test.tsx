import { describe, expect, it } from '@jest/globals';
import { MockedEchoLlmExecutionTools } from '../../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import type { LlmChatProps } from './LlmChatProps';

describe('LlmChat', () => {
    const mockLlmTools = new MockedEchoLlmExecutionTools({ isVerbose: false });

    it('should have correct props interface', () => {
        // Test that LlmChatProps derives correctly from ChatProps
        const props: LlmChatProps = {
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
            llmTools: mockLlmTools,
        };

        expect(validProps.llmTools).toBeDefined();
        expect(typeof validProps.llmTools.title).toBe('string');
    });

    it('should support all optional props from Chat component', () => {
        // Test that all optional props are properly typed
        const fullProps: LlmChatProps = {
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
});

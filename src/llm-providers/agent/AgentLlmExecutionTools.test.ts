import { describe, expect, it, jest } from '@jest/globals';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { Prompt } from '../../types/Prompt';
import type {
    Parameters,
    string_date_iso8601,
    string_markdown_text,
    string_model_name,
    string_title,
} from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { AgentLlmExecutionTools } from './AgentLlmExecutionTools';

describe('AgentLlmExecutionTools', () => {
    it('appends promptSufix from RULE commitments to outgoing chat prompts', async () => {
        const agentSource = `
            AI Agent

            RULE Rule 1
            RULE Rule 2
            RULE Rule 3
        ` as string_book;

        const timing: { start: string_date_iso8601; complete: string_date_iso8601 } = {
            start: '2026-02-09T00:00:00.000Z' as string_date_iso8601,
            complete: '2026-02-09T00:00:01.000Z' as string_date_iso8601,
        };

        const chatPromptResult: ChatPromptResult = {
            content: 'Response',
            modelName: 'agent-chat-model' as string_model_name,
            timing,
            usage: UNCERTAIN_USAGE,
            rawPromptContent: 'empty',
            rawRequest: null,
            rawResponse: {},
        };

        const callChatModelMock = jest.fn(async (_prompt: Prompt) => {
            keepUnused(_prompt);
            return chatPromptResult;
        }) as jest.MockedFunction<(prompt: Prompt) => Promise<ChatPromptResult>>;

        const availableModels: ReadonlyArray<AvailableModel> = [
            {
                modelName: 'mock-chat-model' as string_model_name,
                modelVariant: 'CHAT',
            },
        ];

        const llmTools: LlmExecutionTools = {
            title: 'Mock Tools' as string_title & string_markdown_text,
            checkConfiguration: async () => {},
            listModels: async () => availableModels,
            callChatModel: callChatModelMock,
        };

        const agentTools = new AgentLlmExecutionTools({
            llmTools,
            agentSource,
        });

        const prompt: Prompt = {
            title: 'Test prompt',
            content: 'Please answer plainly.',
            modelRequirements: {
                modelVariant: 'CHAT',
            },
            parameters: {} as Parameters,
        };

        await agentTools.callChatModel(prompt);

        expect(callChatModelMock).toHaveBeenCalledTimes(1);
        const forwardedPrompt = callChatModelMock.mock.calls[0]![0] as Prompt;
        expect(forwardedPrompt.content).toBe('Please answer plainly.\n\n- Rule 1\n- Rule 2\n- Rule 3');
    });
});

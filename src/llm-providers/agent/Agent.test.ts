import { describe, expect, it, jest } from '@jest/globals';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { Parameters } from '../../types/Parameters';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown_text } from '../../types/string_markdown';
import type { string_model_name } from '../../types/string_model_name';
import type { string_title } from '../../types/string_title';
import type { string_date_iso8601 } from '../../types/string_token';
import { keepUnused } from '../../utils/organization/keepUnused';
import { Agent } from './Agent';

describe('Agent', () => {
    it('preserves precomputed model requirements during initial source subscription', async () => {
        const precomputedModelRequirements: AgentModelRequirements = {
            systemMessage: '## Teammates\n1) slave tool `team_chat_slave`\n   TEAM instructions: Ask for anything',
            promptSuffix: '',
            modelName: 'mock-chat-model' as string_model_name,
            parentAgentUrl: null,
            isClosed: true,
            tools: [
                {
                    name: 'team_chat_slave',
                    description: 'Consult teammate slave\nTEAM instructions: Ask for anything',
                    parameters: {
                        type: 'object',
                        properties: {
                            message: {
                                type: 'string',
                                description: 'Question to ask slave.',
                            },
                        },
                        required: ['message'],
                    },
                },
            ],
        };

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

        const llmTools: LlmExecutionTools = {
            title: 'Mock Tools' as string_title & string_markdown_text,
            checkConfiguration: async () => {},
            listModels: async () => {
                throw new Error('listModels should not be called when precomputed model requirements are provided');
            },
            callChatModel: callChatModelMock,
        };

        const agent = new Agent({
            executionTools: {
                llm: llmTools,
            },
            agentSource: `
                Master

                TEAM Ask for anything {slave}
                CLOSED
            ` as string_book,
            precomputedModelRequirements,
            teacherAgent: null,
        });

        const prompt: Prompt = {
            title: 'Test prompt',
            content: 'What CNAMEs are in the records?',
            modelRequirements: {
                modelVariant: 'CHAT',
            },
            parameters: {} as Parameters,
        };

        await agent.callChatModel(prompt);

        const forwardedPrompt = callChatModelMock.mock.calls[0]![0] as Prompt;
        const forwardedModelRequirements = forwardedPrompt.modelRequirements as unknown as AgentModelRequirements;
        expect(forwardedModelRequirements.systemMessage).toContain('TEAM instructions: Ask for anything');
        expect(forwardedModelRequirements.tools?.map((tool) => tool.name)).toContain('team_chat_slave');
    });
});

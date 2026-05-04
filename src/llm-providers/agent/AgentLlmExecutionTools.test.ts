import { describe, expect, it, jest } from '@jest/globals';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
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
    it('appends promptSuffix from RULE commitments to outgoing chat prompts', async () => {
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
        expect(forwardedPrompt.content).toBe('Please answer plainly.\n\n-   Rule 1\n-   Rule 2\n-   Rule 3');
    });

    it('merges runtime prompt tools with tools coming from agent commitments', async () => {
        const agentSource = `
            AI Agent

            USE BROWSER
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
            content: 'Inspect the file.',
            modelRequirements: {
                modelVariant: 'CHAT',
                tools: [
                    {
                        name: 'read_attached_file',
                        description: 'Read one attached file chunk.',
                        parameters: {
                            type: 'object',
                            properties: {},
                            required: [],
                        },
                    },
                ],
            },
            parameters: {} as Parameters,
        };

        await agentTools.callChatModel(prompt);

        const forwardedPrompt = callChatModelMock.mock.calls[0]![0] as Prompt;
        expect(forwardedPrompt.modelRequirements.tools?.map((tool) => tool.name)).toEqual(
            expect.arrayContaining(['fetch_url_content', 'run_browser', 'read_attached_file']),
        );
    });

    it('uses precomputed model requirements instead of recompiling unresolved TEAM commitments', async () => {
        const agentSource = `
            Master

            TEAM Ask for anything {slave}
            CLOSED
        ` as string_book;

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

        const agentTools = new AgentLlmExecutionTools({
            llmTools,
            agentSource,
            precomputedModelRequirements,
        });

        const prompt: Prompt = {
            title: 'Test prompt',
            content: 'What CNAMEs are in the records?',
            modelRequirements: {
                modelVariant: 'CHAT',
            },
            parameters: {} as Parameters,
        };

        await agentTools.callChatModel(prompt);

        const forwardedPrompt = callChatModelMock.mock.calls[0]![0] as Prompt;
        const forwardedModelRequirements = forwardedPrompt.modelRequirements as unknown as AgentModelRequirements;
        expect(forwardedModelRequirements.systemMessage).toContain('TEAM instructions: Ask for anything');
        expect(forwardedModelRequirements.tools?.map((tool) => tool.name)).toContain('team_chat_slave');
    });

    it('forwards explicit finished-stream chunks from the underlying llm tools', async () => {
        const agentSource = `AI Agent` as string_book;
        const timing: { start: string_date_iso8601; complete: string_date_iso8601 } = {
            start: '2026-02-09T00:00:00.000Z' as string_date_iso8601,
            complete: '2026-02-09T00:00:01.000Z' as string_date_iso8601,
        };
        const streamedChunk = {
            content: 'Response',
            modelName: 'agent-chat-model' as string_model_name,
            timing,
            usage: UNCERTAIN_USAGE,
            rawPromptContent: 'empty',
            rawRequest: null,
            rawResponse: {},
            isFinished: true,
        } as ChatPromptResult & { isFinished?: boolean };
        const finalResult: ChatPromptResult = {
            content: 'Response',
            modelName: 'agent-chat-model' as string_model_name,
            timing,
            usage: UNCERTAIN_USAGE,
            rawPromptContent: 'empty',
            rawRequest: null,
            rawResponse: {},
        };
        const observedChunks: Array<ChatPromptResult & { isFinished?: boolean }> = [];
        const callChatModelStreamMock = jest.fn(
            async (
                _prompt: Prompt,
                onProgress: (chunk: ChatPromptResult & { isFinished?: boolean }) => void,
            ): Promise<ChatPromptResult> => {
                keepUnused(_prompt);
                onProgress(streamedChunk);
                return finalResult;
            },
        );

        const llmTools: LlmExecutionTools = {
            title: 'Mock Tools' as string_title & string_markdown_text,
            checkConfiguration: async () => {},
            listModels: async () => [
                {
                    modelName: 'mock-chat-model' as string_model_name,
                    modelVariant: 'CHAT',
                },
            ],
            callChatModelStream: callChatModelStreamMock,
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

        const result = await agentTools.callChatModelStream(prompt, (chunk) => {
            observedChunks.push(chunk as ChatPromptResult & { isFinished?: boolean });
        });

        expect(result.content).toBe('Response');
        expect(observedChunks).toEqual([
            expect.objectContaining({
                content: 'Response',
                isFinished: true,
            }),
        ]);
    });
});

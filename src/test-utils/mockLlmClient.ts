import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import type { ChatPromptResult, CompletionPromptResult, EmbeddingPromptResult } from '../execution/PromptResult';
import type { Prompt } from '../types/Prompt';
import { $getCurrentDate } from '../utils/$getCurrentDate';

export class MockLlmClient implements LlmExecutionTools {
    private mockResponses: Map<string, string> = new Map();
    private mockFunctionCalls: Map<string, { name: string; arguments: string }> = new Map();

    constructor(
        public readonly title: string = 'Mock LLM',
        public readonly description: string = 'A mock LLM client for testing',
    ) {}

    public setMockResponse(prompt: string, response: string): void {
        this.mockResponses.set(prompt, response);
    }

    public setMockFunctionCall(prompt: string, functionCall: { name: string; arguments: string }): void {
        this.mockFunctionCalls.set(prompt, functionCall);
    }

    public async callChatModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'format'> & {
            functions?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>;
        },
    ): Promise<ChatPromptResult> {
        const { content } = prompt;
        const start = $getCurrentDate();
        const complete = $getCurrentDate();

        const response = this.mockResponses.get(content) || 'Mock response';
        const functionCall = this.mockFunctionCalls.get(content);

        return {
            name: 'promptResult',
            message: `Result of \`MockLlmClient.callChatModel\``,
            order: [],
            value: {
                content: response,
                modelName: 'mock-model',
                timing: { start, complete },
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                rawPromptContent: content,
                rawRequest: prompt,
                rawResponse: { choices: [{ message: { content: response, function_call: functionCall } }] },
                functionCall,
            },
        };
    }

    public async callCompletionModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<CompletionPromptResult> {
        const { content } = prompt;
        const start = $getCurrentDate();
        const complete = $getCurrentDate();

        const response = this.mockResponses.get(content) || 'Mock completion response';

        return {
            name: 'promptResult',
            message: `Result of \`MockLlmClient.callCompletionModel\``,
            order: [],
            value: {
                content: response,
                modelName: 'mock-model',
                timing: { start, complete },
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                rawPromptContent: content,
                rawRequest: prompt,
                rawResponse: { choices: [{ text: response }] },
            },
        };
    }

    public async callEmbeddingModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<EmbeddingPromptResult> {
        const { content } = prompt;
        const start = $getCurrentDate();
        const complete = $getCurrentDate();

        return {
            name: 'promptResult',
            message: `Result of \`MockLlmClient.callEmbeddingModel\``,
            order: [],
            value: {
                content: [0.1, 0.2, 0.3], // Mock embedding vector
                modelName: 'mock-model',
                timing: { start, complete },
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                rawPromptContent: content,
                rawRequest: prompt,
                rawResponse: { data: [{ embedding: [0.1, 0.2, 0.3] }] },
            },
        };
    }
}

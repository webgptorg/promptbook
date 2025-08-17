import { setupIntegrationTest, teardownIntegrationTest } from '../../../test-utils/integrationTestSetup';
import { OpenAiCompatibleExecutionTools } from '../OpenAiCompatibleExecutionTools';

describe('OpenAiCompatibleExecutionTools Integration', () => {
    let context: Awaited<ReturnType<typeof setupIntegrationTest>>;

    beforeAll(async () => {
        context = await setupIntegrationTest();
    });

    afterAll(async () => {
        await teardownIntegrationTest(context);
    });

    it('should handle function calling with mock LLM', async () => {
        const { mockLlm } = context;
        const tools = new OpenAiCompatibleExecutionTools({
            apiKey: 'test-key',
            getClient: () => Promise.resolve(mockLlm),
        });

        // Set up mock response
        mockLlm.setMockResponse('Call the test function', 'Function called successfully');
        mockLlm.setMockFunctionCall('Call the test function', {
            name: 'testFunction',
            arguments: '{"arg1": "value1"}',
        });

        const prompt = {
            content: 'Call the test function',
            parameters: {},
            modelRequirements: { modelVariant: 'CHAT' },
            format: 'TEXT',
            functions: [
                {
                    name: 'testFunction',
                    description: 'A test function',
                    parameters: { type: 'object', properties: { arg1: { type: 'string' } } },
                },
            ],
        };

        const result = await tools.callChatModel(prompt);

        expect(result.value.functionCall).toEqual({
            name: 'testFunction',
            arguments: '{"arg1": "value1"}',
        });
        expect(result.value.content).toBe('Function called successfully');
    });

    it('should handle chat completion with mock LLM', async () => {
        const { mockLlm } = context;
        const tools = new OpenAiCompatibleExecutionTools({
            apiKey: 'test-key',
            getClient: () => Promise.resolve(mockLlm),
        });

        // Set up mock response
        mockLlm.setMockResponse('Hello, how are you?', 'I am doing well, thank you!');

        const prompt = {
            content: 'Hello, how are you?',
            parameters: {},
            modelRequirements: { modelVariant: 'CHAT' },
            format: 'TEXT',
        };

        const result = await tools.callChatModel(prompt);

        expect(result.value.content).toBe('I am doing well, thank you!');
        expect(result.value.modelName).toBe('mock-model');
    });

    it('should handle completion with mock LLM', async () => {
        const { mockLlm } = context;
        const tools = new OpenAiCompatibleExecutionTools({
            apiKey: 'test-key',
            getClient: () => Promise.resolve(mockLlm),
        });

        // Set up mock response
        mockLlm.setMockResponse('Complete this sentence: The quick brown fox', 'jumps over the lazy dog.');

        const prompt = {
            content: 'Complete this sentence: The quick brown fox',
            parameters: {},
            modelRequirements: { modelVariant: 'COMPLETION' },
        };

        const result = await tools.callCompletionModel(prompt);

        expect(result.value.content).toBe('jumps over the lazy dog.');
        expect(result.value.modelName).toBe('mock-model');
    });
});

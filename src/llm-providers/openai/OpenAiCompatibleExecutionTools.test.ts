describe('OpenAiCompatibleExecutionTools', () => {
    // ... existing tests ...

    it('should handle function calling in callChatModel', async () => {
        const mockClient = {
            chat: {
                completions: {
                    create: jest.fn().mockResolvedValue({
                        choices: [
                            {
                                message: {
                                    content: 'Function called successfully',
                                    function_call: {
                                        name: 'testFunction',
                                        arguments: '{"arg1": "value1"}',
                                    },
                                },
                            },
                        ],
                        model: 'gpt-4',
                    }),
                },
            },
        };

        const tools = new OpenAiCompatibleExecutionTools({
            apiKey: 'test-key',
            getClient: () => Promise.resolve(mockClient),
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
    });
});

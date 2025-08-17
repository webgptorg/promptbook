import { withTestEnvironment } from '../../../test-utils/integrationTestSetup';
import { PerformanceTest } from '../../../test-utils/performanceTest';
import { TestDataGenerator } from '../../../test-utils/testDataGenerator';
import { OpenAiCompatibleExecutionTools } from '../OpenAiCompatibleExecutionTools';

describe('OpenAiCompatibleExecutionTools E2E', () => {
    it('should handle a complete RAG workflow', async () => {
        await withTestEnvironment(async ({ mockLlm, mockFs, env, tempDir }) => {
            // Set up knowledge base
            const knowledgeFiles = TestDataGenerator.generateTestFiles(`${tempDir}/knowledge`, 3);
            for (const file of knowledgeFiles) {
                await mockFs.writeFile(file.path, file.content);
            }

            // Generate query and expected response
            const query = TestDataGenerator.generatePrompt();
            const response = TestDataGenerator.generateText({ minLength: 200, maxLength: 500 });

            // Set up mock responses for each step
            mockLlm.setMockResponse(
                `Search knowledge base for: ${query}`,
                JSON.stringify(knowledgeFiles.map((f) => f.content)),
            );
            mockLlm.setMockResponse(`Answer question using context: ${query}`, response);

            const tools = new OpenAiCompatibleExecutionTools({
                apiKey: env.getEnv('OPENAI_API_KEY')!,
                getClient: () => Promise.resolve(mockLlm),
            });

            // Execute RAG workflow
            const searchResult = await tools.callChatModel({
                content: `Search knowledge base for: ${query}`,
                parameters: {},
                modelRequirements: { modelVariant: 'CHAT' },
                format: 'TEXT',
            });

            const answerResult = await tools.callChatModel({
                content: `Answer question using context: ${query}`,
                parameters: { context: searchResult.value.content },
                modelRequirements: { modelVariant: 'CHAT' },
                format: 'TEXT',
            });

            // Verify results
            expect(answerResult.value.content).toBe(response);
            expect(JSON.parse(searchResult.value.content)).toHaveLength(3);

            // Save results
            await mockFs.writeFile(
                `${tempDir}/rag_result.json`,
                JSON.stringify({
                    query,
                    context: JSON.parse(searchResult.value.content),
                    answer: answerResult.value.content,
                }),
            );
        });
    });

    it('should handle a multi-step translation workflow', async () => {
        await withTestEnvironment(async ({ mockLlm, mockFs, env, tempDir }) => {
            // Generate test data
            const sourceText = TestDataGenerator.generateText({ minLength: 100, maxLength: 200 });
            const intermediateText = TestDataGenerator.generateText({ minLength: 100, maxLength: 200 });
            const finalText = TestDataGenerator.generateText({ minLength: 100, maxLength: 200 });

            // Set up mock responses
            mockLlm.setMockResponse(`Translate to intermediate format: ${sourceText}`, intermediateText);
            mockLlm.setMockResponse(`Translate to final format: ${intermediateText}`, finalText);

            const tools = new OpenAiCompatibleExecutionTools({
                apiKey: env.getEnv('OPENAI_API_KEY')!,
                getClient: () => Promise.resolve(mockLlm),
            });

            // Execute translation workflow
            const step1Result = await tools.callChatModel({
                content: `Translate to intermediate format: ${sourceText}`,
                parameters: {},
                modelRequirements: { modelVariant: 'CHAT' },
                format: 'TEXT',
            });

            const step2Result = await tools.callChatModel({
                content: `Translate to final format: ${step1Result.value.content}`,
                parameters: {},
                modelRequirements: { modelVariant: 'CHAT' },
                format: 'TEXT',
            });

            // Verify results
            expect(step1Result.value.content).toBe(intermediateText);
            expect(step2Result.value.content).toBe(finalText);

            // Save workflow results
            await mockFs.writeFile(
                `${tempDir}/translation_workflow.json`,
                JSON.stringify({
                    source: sourceText,
                    intermediate: step1Result.value.content,
                    final: step2Result.value.content,
                }),
            );
        });
    });

    it('should handle concurrent function calls with rate limiting', async () => {
        await withTestEnvironment(async ({ mockLlm, env }) => {
            // Generate test data
            const functionCalls = Array.from({ length: 5 }, () => TestDataGenerator.generateFunctionCall());
            const prompts = functionCalls.map((fc) => `Call function ${fc.name} with arguments ${fc.arguments}`);
            const responses = prompts.map(() => TestDataGenerator.generateText());

            // Set up mock responses
            prompts.forEach((prompt, index) => {
                mockLlm.setMockResponse(prompt, responses[index]);
                mockLlm.setMockFunctionCall(prompt, functionCalls[index]);
            });

            const tools = new OpenAiCompatibleExecutionTools({
                apiKey: env.getEnv('OPENAI_API_KEY')!,
                getClient: () => Promise.resolve(mockLlm),
                maxRequestsPerMinute: 60, // Rate limit to 1 request per second
            });

            // Measure performance of concurrent calls
            const metrics = await PerformanceTest.benchmark(
                'Concurrent Function Calls',
                async () => {
                    const results = await Promise.all(
                        prompts.map((prompt) =>
                            tools.callChatModel({
                                content: prompt,
                                parameters: {},
                                modelRequirements: { modelVariant: 'CHAT' },
                                format: 'TEXT',
                                functions: [
                                    {
                                        name: 'translate',
                                        description: 'Translate text',
                                        parameters: {
                                            type: 'object',
                                            properties: {
                                                text: { type: 'string' },
                                                targetLanguage: { type: 'string' },
                                            },
                                        },
                                    },
                                    {
                                        name: 'calculate',
                                        description: 'Perform calculation',
                                        parameters: {
                                            type: 'object',
                                            properties: {
                                                operation: { type: 'string' },
                                                numbers: { type: 'array', items: { type: 'number' } },
                                            },
                                        },
                                    },
                                    {
                                        name: 'search',
                                        description: 'Search content',
                                        parameters: {
                                            type: 'object',
                                            properties: { query: { type: 'string' }, filters: { type: 'object' } },
                                        },
                                    },
                                ],
                            }),
                        ),
                    );

                    // Verify results
                    results.forEach((result, index) => {
                        expect(result.value.functionCall).toEqual(functionCalls[index]);
                        expect(result.value.content).toBe(responses[index]);
                    });
                },
                { iterations: 10, warmupIterations: 2 },
            );

            // Log performance metrics
            console.log(PerformanceTest.formatMetrics(metrics));

            // Assert performance requirements
            expect(metrics.executionTime).toBeLessThan(5000); // Less than 5 seconds for 10 iterations
            expect(metrics.operationsPerSecond).toBeGreaterThan(1); // At least 1 op/sec with rate limiting
        });
    });

    it('should handle error cases and retries', async () => {
        await withTestEnvironment(async ({ mockLlm, env }) => {
            const tools = new OpenAiCompatibleExecutionTools({
                apiKey: env.getEnv('OPENAI_API_KEY')!,
                getClient: () => Promise.resolve(mockLlm),
                maxRetries: 3,
            });

            // Set up mock to fail twice then succeed
            let attemptCount = 0;
            const mockClient = {
                chat: {
                    completions: {
                        create: jest.fn().mockImplementation(async () => {
                            attemptCount++;
                            if (attemptCount <= 2) {
                                throw new Error('Rate limit exceeded');
                            }
                            return {
                                choices: [{ message: { content: 'Success after retries' } }],
                                model: 'mock-model',
                            };
                        }),
                    },
                },
            };

            // Execute with retries
            const result = await tools.callChatModel({
                content: 'Test retry mechanism',
                parameters: {},
                modelRequirements: { modelVariant: 'CHAT' },
                format: 'TEXT',
            });

            // Verify results
            expect(result.value.content).toBe('Success after retries');
            expect(attemptCount).toBe(3); // Two failures + one success
        });
    });

    it('should handle streaming responses', async () => {
        await withTestEnvironment(async ({ mockLlm, env }) => {
            const tools = new OpenAiCompatibleExecutionTools({
                apiKey: env.getEnv('OPENAI_API_KEY')!,
                getClient: () => Promise.resolve(mockLlm),
            });

            // Set up streaming response
            const chunks = ['Hello', ' ', 'world', '!'];
            let chunkIndex = 0;
            const mockClient = {
                chat: {
                    completions: {
                        create: jest.fn().mockImplementation(async () => ({
                            choices: [{ message: { content: chunks[chunkIndex++] } }],
                            model: 'mock-model',
                        })),
                    },
                },
            };

            // Execute streaming request
            const stream = await tools.callChatModel({
                content: 'Generate a greeting',
                parameters: {},
                modelRequirements: { modelVariant: 'CHAT' },
                format: 'TEXT',
                stream: true,
            });

            // Collect streamed chunks
            const receivedChunks: string[] = [];
            for await (const chunk of stream) {
                receivedChunks.push(chunk.value.content);
            }

            // Verify streaming behavior
            expect(receivedChunks).toEqual(chunks);
            expect(receivedChunks.join('')).toBe('Hello world!');
        });
    });

    it('should handle token counting', async () => {
        await withTestEnvironment(async ({ mockLlm, env }) => {
            const tools = new OpenAiCompatibleExecutionTools({
                apiKey: env.getEnv('OPENAI_API_KEY')!,
                getClient: () => Promise.resolve(mockLlm),
            });

            // Set up mock response with token count
            const text = TestDataGenerator.generateText({ minLength: 100, maxLength: 200 });
            const tokenCount = Math.ceil(text.length / 4); // Rough estimate
            mockLlm.setMockResponse(text, text, { tokenCount });

            // Execute request with token counting
            const result = await tools.callChatModel({
                content: text,
                parameters: {},
                modelRequirements: { modelVariant: 'CHAT' },
                format: 'TEXT',
                countTokens: true,
            });

            // Verify token counting
            expect(result.value.tokenCount).toBeValidTokenCount();
            expect(result.value.tokenCount).toBeWithinRange(tokenCount - 5, tokenCount + 5);
        });
    });

    it('should handle concurrent streaming requests', async () => {
        await withTestEnvironment(async ({ mockLlm, env }) => {
            const tools = new OpenAiCompatibleExecutionTools({
                apiKey: env.getEnv('OPENAI_API_KEY')!,
                getClient: () => Promise.resolve(mockLlm),
                maxRequestsPerMinute: 60,
            });

            // Generate test data
            const prompts = Array.from({ length: 3 }, () => TestDataGenerator.generatePrompt());
            const responses = prompts.map(() => TestDataGenerator.generateText());

            // Set up streaming responses
            prompts.forEach((prompt, index) => {
                const chunks = responses[index].split(' ');
                let chunkIndex = 0;
                mockLlm.setMockResponse(prompt, chunks[chunkIndex++], { stream: true });
            });

            // Execute concurrent streaming requests
            const streams = await Promise.all(
                prompts.map((prompt) =>
                    tools.callChatModel({
                        content: prompt,
                        parameters: {},
                        modelRequirements: { modelVariant: 'CHAT' },
                        format: 'TEXT',
                        stream: true,
                    }),
                ),
            );

            // Collect and verify streamed responses
            const results = await Promise.all(
                streams.map(async (stream) => {
                    const chunks: string[] = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk.value.content);
                    }
                    return chunks.join(' ');
                }),
            );

            // Verify results
            results.forEach((result, index) => {
                expect(result).toBe(responses[index]);
            });
        });
    });

    it('should handle token counting with function calls', async () => {
        await withTestEnvironment(async ({ mockLlm, env }) => {
            const tools = new OpenAiCompatibleExecutionTools({
                apiKey: env.getEnv('OPENAI_API_KEY')!,
                getClient: () => Promise.resolve(mockLlm),
            });

            // Set up function call with token count
            const functionCall = TestDataGenerator.generateFunctionCall();
            const response = TestDataGenerator.generateText();
            const tokenCount = Math.ceil((functionCall.arguments.length + response.length) / 4);
            mockLlm.setMockResponse('Call function', response, { functionCall, tokenCount });

            // Execute request with token counting
            const result = await tools.callChatModel({
                content: 'Call function',
                parameters: {},
                modelRequirements: { modelVariant: 'CHAT' },
                format: 'TEXT',
                countTokens: true,
                functions: [
                    {
                        name: 'translate',
                        description: 'Translate text',
                        parameters: {
                            type: 'object',
                            properties: { text: { type: 'string' }, targetLanguage: { type: 'string' } },
                        },
                    },
                ],
            });

            // Verify token counting with function call
            expect(result.value.tokenCount).toBeValidTokenCount();
            expect(result.value.tokenCount).toBeWithinRange(tokenCount - 5, tokenCount + 5);
            expect(result.value.functionCall).toEqual(functionCall);
        });
    });

    it('should handle performance under load', async () => {
        await withTestEnvironment(async ({ mockLlm, env }) => {
            const tools = new OpenAiCompatibleExecutionTools({
                apiKey: env.getEnv('OPENAI_API_KEY')!,
                getClient: () => Promise.resolve(mockLlm),
                maxRequestsPerMinute: 120, // 2 requests per second
            });

            // Generate test data
            const prompts = Array.from({ length: 50 }, () => TestDataGenerator.generatePrompt());
            const responses = prompts.map(() => TestDataGenerator.generateText());

            // Set up mock responses
            prompts.forEach((prompt, index) => {
                mockLlm.setMockResponse(prompt, responses[index]);
            });

            // Run performance test
            const metrics = await PerformanceTest.benchmark(
                'Load Test',
                async () => {
                    const results = await Promise.all(
                        prompts.map((prompt) =>
                            tools.callChatModel({
                                content: prompt,
                                parameters: {},
                                modelRequirements: { modelVariant: 'CHAT' },
                                format: 'TEXT',
                            }),
                        ),
                    );

                    // Verify results
                    results.forEach((result, index) => {
                        expect(result.value.content).toBe(responses[index]);
                    });
                },
                { iterations: 1, warmupIterations: 0 },
            );

            // Log performance metrics
            console.log(PerformanceTest.formatMetrics(metrics));

            // Assert performance requirements
            expect(metrics.executionTime).toBeLessThan(30000); // Less than 30 seconds for 50 requests
            expect(metrics.operationsPerSecond).toBeGreaterThan(1); // At least 1 op/sec
            expect(metrics.memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB heap usage
        });
    });
});

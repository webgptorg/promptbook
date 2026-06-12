import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { book } from '../pipeline/book-notation';

const mockRun = jest.fn<(...args: Array<unknown>) => Promise<{ finalOutput: unknown }>>();
const mockAgentConstructor = jest.fn();
const mockSetDefaultOpenAIClient = jest.fn();
const mockSetDefaultOpenAIKey = jest.fn();

jest.mock('@openai/agents', () => ({
    Agent: function Agent(this: { configuration: unknown }, configuration: unknown) {
        mockAgentConstructor(configuration);
        this.configuration = configuration;
        return this;
    },
    fileSearchTool: jest.fn(),
    run: (...args: unknown[]) => mockRun(...args),
    setDefaultOpenAIClient: (...args: unknown[]) => mockSetDefaultOpenAIClient(...args),
    setDefaultOpenAIKey: (...args: unknown[]) => mockSetDefaultOpenAIKey(...args),
}));

jest.mock('../book-2.0/agent-source/createAgentModelRequirements', () => ({
    createAgentModelRequirements: jest.fn(async () => ({
        systemMessage: 'You are concise.',
        promptSuffix: 'Answer in one sentence.',
        modelName: 'gpt-5.4-mini',
        temperature: 0.2,
        topP: 0.7,
        parentAgentUrl: null,
        isClosed: true,
    })),
}));

describe('LiteAgent', () => {
    let LiteAgent: typeof import('./LiteAgent').LiteAgent;

    beforeAll(async () => {
        ({ LiteAgent } = await import('./LiteAgent'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockRun.mockResolvedValue({
            finalOutput: 'Short answer',
        });
    });

    it('creates one OpenAI Agents SDK agent from compiled Book requirements', async () => {
        const liteAgent = new LiteAgent({
            apiKey: 'test-key',
            book: book`
                Lite Agent

                PERSONA Helpful
            `,
        });

        const answer = await liteAgent.run('Hello', {
            context: 'Important background',
        });

        expect(answer).toBe('Short answer');
        expect(mockSetDefaultOpenAIClient).toHaveBeenCalledTimes(1);
        expect(mockSetDefaultOpenAIKey).toHaveBeenCalledWith('test-key');
        expect(mockAgentConstructor).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Lite Agent',
                model: 'gpt-5.4-mini',
                instructions: 'You are concise.',
                modelSettings: {
                    temperature: 0.2,
                    topP: 0.7,
                },
            }),
        );
        expect(mockRun).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('Hello'), undefined);
        expect(mockRun.mock.calls[0]![1]).toContain('Important background');
        expect(mockRun.mock.calls[0]![1]).toContain('Answer in one sentence.');
    });

    it('normalizes non-string final output into JSON', async () => {
        mockRun.mockResolvedValue({
            finalOutput: {
                status: 'ok',
            },
        });

        const liteAgent = new LiteAgent({
            book: book`
                Object Agent

                PERSONA Helpful
            `,
        });

        const answer = await liteAgent.run('Return JSON');

        expect(answer).toContain('"status": "ok"');
    });
});

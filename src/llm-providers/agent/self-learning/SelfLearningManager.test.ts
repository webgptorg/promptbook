import { describe, expect, it, jest } from '@jest/globals';
import spaceTrim from 'spacetrim';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import type { ChatPromptResult } from '../../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../../execution/utils/usage-constants';
import type { Prompt } from '../../../types/Prompt';
import type { string_date_iso8601, string_model_name } from '../../../types/typeAliases';
import { SelfLearningManager } from './SelfLearningManager';

describe('SelfLearningManager', () => {
    it('stores INTERNAL MESSAGE samplings with model trace and tool calls', async () => {
        const agentSource = spaceTrim(`
            # My Agent

            PERSONA A helpful assistant.
        `) as string_book;

        let updatedSource: string_book = agentSource;
        const manager = new SelfLearningManager({
            teacherAgent: null,
            getAgentSource: () => updatedSource,
            updateAgentSource: (source: string_book) => {
                updatedSource = source;
            },
        });

        const prompt: Prompt = {
            title: 'Test prompt',
            content: 'Search weather in Prague',
            modelRequirements: { modelVariant: 'CHAT' },
            parameters: {},
        };

        const result: ChatPromptResult = {
            content: 'It is sunny.',
            modelName: 'agent-model' as string_model_name,
            timing: {
                start: '2026-02-24T12:00:00.000Z' as string_date_iso8601,
                complete: '2026-02-24T12:00:01.000Z' as string_date_iso8601,
            },
            usage: UNCERTAIN_USAGE,
            rawPromptContent: 'Search weather in Prague',
            rawRequest: {
                provider: 'openai-compatible',
                phase: 'request',
            },
            rawResponse: {
                provider: 'openai-compatible',
                phase: 'response',
                reasoning: 'Thinking...',
            },
            toolCalls: [
                {
                    name: 'search',
                    arguments: '{"q":"weather Prague"}',
                    result: '[]',
                },
            ],
        };

        await manager.runSelfLearning(prompt, result);

        expect(updatedSource).toContain('USER MESSAGE');
        expect(updatedSource).toContain('INTERNAL MESSAGE');
        expect(updatedSource).toContain('"kind": "MODEL_REQUEST"');
        expect(updatedSource).toContain('"kind": "MODEL_RESPONSE"');
        expect(updatedSource).toContain('"kind": "TOOL_CALL"');
        expect(updatedSource).toContain('"name": "search"');
        expect(updatedSource).toContain('AGENT MESSAGE');
    });

    it('adds INITIAL MESSAGE generation instruction to teacher prompt when it is missing', async () => {
        const agentSource = spaceTrim(`
            # My Agent

            PERSONA A helpful assistant.
        `) as string_book;

        let updatedSource: string_book = agentSource;
        const getAgentSource = jest.fn(() => updatedSource);
        const updateAgentSource = jest.fn((source: string_book) => {
            updatedSource = source;
        });

        const callChatModelMock = jest.fn(async (prompt: Prompt) => {
            // Check if the prompt contains the instruction to generate INITIAL MESSAGE
            if (prompt.content.includes('The agent source does not have an INITIAL MESSAGE defined, generate one.')) {
                return {
                    content: '```book\nINITIAL MESSAGE Hello! I am your helpful assistant.\n```',
                    modelName: 'teacher-model' as string_model_name,
                    timing: {
                        start: '2026-02-24T12:00:00.000Z' as string_date_iso8601,
                        complete: '2026-02-24T12:00:01.000Z' as string_date_iso8601,
                    },
                    usage: UNCERTAIN_USAGE,
                    rawPromptContent: prompt.content,
                    rawRequest: null,
                    rawResponse: {},
                } as ChatPromptResult;
            }
            return {
                content: '```book\n```',
                modelName: 'teacher-model' as string_model_name,
                timing: {
                    start: '2026-02-24T12:00:00.000Z' as string_date_iso8601,
                    complete: '2026-02-24T12:00:01.000Z' as string_date_iso8601,
                },
                usage: UNCERTAIN_USAGE,
                rawPromptContent: prompt.content,
                rawRequest: null,
                rawResponse: {},
            } as ChatPromptResult;
        });

        const teacherAgent = {
            callChatModel: callChatModelMock,
        };

        const manager = new SelfLearningManager({
            teacherAgent,
            getAgentSource,
            updateAgentSource,
        });

        const prompt: Prompt = {
            title: 'Test prompt',
            content: 'Hello',
            modelRequirements: { modelVariant: 'CHAT' },
            parameters: {},
        };

        const result: ChatPromptResult = {
            content: 'Hi there!',
            modelName: 'agent-model' as string_model_name,
            timing: {
                start: '2026-02-24T12:00:00.000Z' as string_date_iso8601,
                complete: '2026-02-24T12:00:01.000Z' as string_date_iso8601,
            },
            usage: UNCERTAIN_USAGE,
            rawPromptContent: 'Hello',
            rawRequest: null,
            rawResponse: {},
        };

        await manager.runSelfLearning(prompt, result);

        expect(callChatModelMock).toHaveBeenCalled();
        const teacherPrompt = callChatModelMock.mock.calls[0]![0] as Prompt;
        expect(teacherPrompt.content).toContain(
            'The agent source does not have an INITIAL MESSAGE defined, generate one.',
        );
        expect(updatedSource).toContain('INITIAL MESSAGE Hello! I am your helpful assistant.');
    });

    it('does NOT add INITIAL MESSAGE generation instruction to teacher prompt when it is ALREADY PRESENT', async () => {
        const agentSource = spaceTrim(`
            # My Agent

            PERSONA A helpful assistant.
            INITIAL MESSAGE Welcome!
        `) as string_book;

        let updatedSource: string_book = agentSource;
        const getAgentSource = jest.fn(() => updatedSource);
        const updateAgentSource = jest.fn((source: string_book) => {
            updatedSource = source;
        });

        const callChatModelMock = jest.fn(async (prompt: Prompt) => {
            return {
                content: '```book\nKNOWLEDGE New info.\n```',
                modelName: 'teacher-model' as string_model_name,
                timing: {
                    start: '2026-02-24T12:00:00.000Z' as string_date_iso8601,
                    complete: '2026-02-24T12:00:01.000Z' as string_date_iso8601,
                },
                usage: UNCERTAIN_USAGE,
                rawPromptContent: prompt.content,
                rawRequest: null,
                rawResponse: {},
            } as ChatPromptResult;
        });

        const teacherAgent = {
            callChatModel: callChatModelMock,
        };

        const manager = new SelfLearningManager({
            teacherAgent,
            getAgentSource,
            updateAgentSource,
        });

        const prompt: Prompt = {
            title: 'Test prompt',
            content: 'Hello',
            modelRequirements: { modelVariant: 'CHAT' },
            parameters: {},
        };

        const result: ChatPromptResult = {
            content: 'Hi there!',
            modelName: 'agent-model' as string_model_name,
            timing: {
                start: '2026-02-24T12:00:00.000Z' as string_date_iso8601,
                complete: '2026-02-24T12:00:01.000Z' as string_date_iso8601,
            },
            usage: UNCERTAIN_USAGE,
            rawPromptContent: 'Hello',
            rawRequest: null,
            rawResponse: {},
        };

        await manager.runSelfLearning(prompt, result);

        expect(callChatModelMock).toHaveBeenCalled();
        const teacherPrompt = callChatModelMock.mock.calls[0]![0] as Prompt;
        expect(teacherPrompt.content).not.toContain(
            'The agent source does not have an INITIAL MESSAGE defined, generate one.',
        );
        expect(updatedSource).not.toContain('INITIAL MESSAGE Hello! I am your helpful assistant.');
        expect(updatedSource).toContain('KNOWLEDGE New info.');
    });

    it('marks exactly the last persisted self-learning update as final when no avatar materializer is configured', async () => {
        const agentSource = spaceTrim(`
            # My Agent

            PERSONA A helpful assistant.
        `) as string_book;

        let updatedSource: string_book = agentSource;
        const persistCalls: Array<{ source: string_book; isFinal: boolean }> = [];
        const manager = new SelfLearningManager({
            teacherAgent: null,
            getAgentSource: () => updatedSource,
            updateAgentSource: (source: string_book) => {
                updatedSource = source;
            },
            persistAgentSourceUpdate: async (source, options) => {
                persistCalls.push({
                    source,
                    isFinal: options.isFinal,
                });
            },
        });

        const prompt: Prompt = {
            title: 'Test prompt',
            content: 'Hello',
            modelRequirements: { modelVariant: 'CHAT' },
            parameters: {},
        };

        const result: ChatPromptResult = {
            content: 'Hi there!',
            modelName: 'agent-model' as string_model_name,
            timing: {
                start: '2026-02-24T12:00:00.000Z' as string_date_iso8601,
                complete: '2026-02-24T12:00:01.000Z' as string_date_iso8601,
            },
            usage: UNCERTAIN_USAGE,
            rawPromptContent: 'Hello',
            rawRequest: null,
            rawResponse: {},
        };

        await manager.runSelfLearning(prompt, result);

        expect(persistCalls.length).toBeGreaterThanOrEqual(2);
        expect(persistCalls.slice(0, -1).every((call) => call.isFinal === false)).toBe(true);
        expect(persistCalls[persistCalls.length - 1]?.isFinal).toBe(true);
    });

    it('defers final persistence to the scheduled avatar materialization task', async () => {
        const agentSource = spaceTrim(`
            # My Agent

            PERSONA A helpful assistant.
        `) as string_book;

        let updatedSource: string_book = agentSource;
        const persistCalls: Array<{ source: string_book; isFinal: boolean }> = [];
        const scheduledBackgroundTasks: Array<Promise<void>> = [];
        let releaseBackgroundTask: (() => void) | undefined = undefined;
        const waitForBackgroundRelease = new Promise<void>((resolve) => {
            releaseBackgroundTask = resolve;
        });
        const manager = new SelfLearningManager({
            teacherAgent: null,
            getAgentSource: () => updatedSource,
            updateAgentSource: (source: string_book) => {
                updatedSource = source;
            },
            persistAgentSourceUpdate: async (source, options) => {
                persistCalls.push({
                    source,
                    isFinal: options.isFinal,
                });
            },
            materializeMetaImage: async ({ getAgentSource, applyAgentSourceUpdate }) => {
                const placeholderSource = `${getAgentSource()}\n\nMETA IMAGE https://cdn.example.com/avatar.png` as string_book;
                await applyAgentSourceUpdate(placeholderSource, { isFinal: false });

                return {
                    backgroundTask: (async () => {
                        await waitForBackgroundRelease;
                        const finalizedSource =
                            `${placeholderSource}\nMETA COLOR #112233, #445566, #778899` as string_book;
                        await applyAgentSourceUpdate(finalizedSource, { isFinal: true });
                    })(),
                };
            },
            scheduleBackgroundTask: (task) => {
                scheduledBackgroundTasks.push(task);
            },
        });

        const prompt: Prompt = {
            title: 'Test prompt',
            content: 'Hello',
            modelRequirements: { modelVariant: 'CHAT' },
            parameters: {},
        };

        const result: ChatPromptResult = {
            content: 'Hi there!',
            modelName: 'agent-model' as string_model_name,
            timing: {
                start: '2026-02-24T12:00:00.000Z' as string_date_iso8601,
                complete: '2026-02-24T12:00:01.000Z' as string_date_iso8601,
            },
            usage: UNCERTAIN_USAGE,
            rawPromptContent: 'Hello',
            rawRequest: null,
            rawResponse: {},
        };

        await manager.runSelfLearning(prompt, result);

        expect(scheduledBackgroundTasks).toHaveLength(1);
        expect(persistCalls[persistCalls.length - 1]?.isFinal).toBe(false);

        const backgroundRelease = releaseBackgroundTask;
        if (backgroundRelease === undefined) {
            throw new Error('Expected background-task release callback to be initialized.');
        }

        (backgroundRelease as () => void)();
        await Promise.all(scheduledBackgroundTasks);

        expect(persistCalls[persistCalls.length - 1]?.isFinal).toBe(true);
        expect(updatedSource).toContain('META IMAGE https://cdn.example.com/avatar.png');
        expect(updatedSource).toContain('META COLOR #112233, #445566, #778899');
    });
});

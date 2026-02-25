import { describe, expect, it, jest } from '@jest/globals';
import spaceTrim from 'spacetrim';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import type { ChatPromptResult } from '../../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../../execution/utils/usage-constants';
import type { Prompt } from '../../../types/Prompt';
import type { string_date_iso8601, string_model_name } from '../../../types/typeAliases';
import { SelfLearningManager } from './SelfLearningManager';

describe('SelfLearningManager', () => {
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
});

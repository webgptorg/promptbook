import { describe, expect, it } from '@jest/globals';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { createImmediateUserChatAnswerModelRequirements } from './createImmediateUserChatAnswerModelRequirements';

describe('createImmediateUserChatAnswerModelRequirements', () => {
    it('keeps only lightweight instruction commitments in the immediate pre-answer system message', () => {
        const agentSource = `
            Support Agent

            GOAL Help users understand the product quickly.
            RULE Be concise and practical.
            WRITING RULES Use short paragraphs.
            KNOWLEDGE Internal policy database should not be loaded for the fast answer.
            USE PRIVACY Do not store anything from this conversation.
            USE CALENDAR https://calendar.google.com/calendar/u/0/r
        ` as string_book;

        const modelRequirements = createImmediateUserChatAnswerModelRequirements(agentSource);
        const systemMessage = modelRequirements.systemMessage || '';

        expect(modelRequirements.modelVariant).toBe('CHAT');
        expect(modelRequirements).not.toHaveProperty('knowledgeSources');
        expect(modelRequirements).not.toHaveProperty('tools');
        expect(systemMessage).toContain('This response is not the final answer. It is only a confirmation');
        expect(systemMessage).toContain('The final answer will arrive after the background processing finishes.');
        expect(systemMessage).toContain('Do not provide any part of the final answer yet.');
        expect(systemMessage).toContain('Do not include code snippets');
        expect(systemMessage).toContain('briefly name the kind of work being done');
        expect(systemMessage).toContain("At the start of every response, clearly say in the user's language");
        expect(systemMessage).toContain('override any agent instruction below that would make the answer sound final or complete');
        expect(systemMessage).toContain('GOAL: Help users understand the product quickly.');
        expect(systemMessage).toContain('RULE: Be concise and practical.');
        expect(systemMessage).toContain('WRITING RULES: Use short paragraphs.');
        expect(systemMessage).not.toContain('Internal policy database');
        expect(systemMessage).not.toContain('Do not store anything from this conversation.');
        expect(systemMessage).not.toContain('https://calendar.google.com/calendar/u/0/r');
    });

    it('falls back to the agent name when no lightweight instruction commitments are present', () => {
        const agentSource = `
            Bare Agent

            KNOWLEDGE Slow knowledge source.
        ` as string_book;

        const modelRequirements = createImmediateUserChatAnswerModelRequirements(agentSource);
        const systemMessage = modelRequirements.systemMessage || '';

        expect(systemMessage).toContain('Bare Agent');
        expect(systemMessage).not.toContain('Slow knowledge source');
    });
});

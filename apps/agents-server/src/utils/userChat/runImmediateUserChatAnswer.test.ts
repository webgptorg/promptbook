import { describe, expect, it } from '@jest/globals';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { createImmediateUserChatAnswerModelRequirements } from './createImmediateUserChatAnswerModelRequirements';

describe('createImmediateUserChatAnswerModelRequirements', () => {
    it('keeps only lightweight instruction commitments in the immediate answer system message', () => {
        const agentSource = `
            Support Agent

            GOAL Help users understand the product quickly.
            RULE Be concise and practical.
            WRITING RULES Use short paragraphs.
            KNOWLEDGE Internal policy database should not be loaded for the fast answer.
            MEMORY Remember user preferences.
            USE SEARCH ENGINE Search public documentation before answering.
            USE BROWSER Browse the product website.
            USE EMAIL support@example.com
        ` as string_book;

        const modelRequirements = createImmediateUserChatAnswerModelRequirements(agentSource);
        const systemMessage = modelRequirements.systemMessage || '';

        expect(modelRequirements.modelVariant).toBe('CHAT');
        expect(modelRequirements).not.toHaveProperty('knowledgeSources');
        expect(modelRequirements).not.toHaveProperty('tools');
        expect(systemMessage).toContain('This fast answer is only a draft, not the final answer.');
        expect(systemMessage).toContain('the final answer is still being prepared by the external service');
        expect(systemMessage).toContain('the final answer can arrive in several minutes');
        expect(systemMessage).toContain('the final answer may change compared with this draft');
        expect(systemMessage).toContain('the user should not treat this draft as final');
        expect(systemMessage).toContain('GOAL: Help users understand the product quickly.');
        expect(systemMessage).toContain('RULE: Be concise and practical.');
        expect(systemMessage).toContain('WRITING RULES: Use short paragraphs.');
        expect(systemMessage).not.toContain('Internal policy database');
        expect(systemMessage).not.toContain('Search public documentation');
        expect(systemMessage).not.toContain('Browse the product website');
        expect(systemMessage).not.toContain('support@example.com');
    });

    it('falls back to the agent name when no lightweight instruction commitments are present', () => {
        const agentSource = `
            Bare Agent

            KNOWLEDGE Slow knowledge source.
        ` as string_book;

        const modelRequirements = createImmediateUserChatAnswerModelRequirements(agentSource);
        const systemMessage = modelRequirements.systemMessage || '';

        expect(systemMessage).toContain('Bare Agent');
        expect(systemMessage).toContain('Start your answer with a short draft notice');
        expect(systemMessage).not.toContain('Slow knowledge source');
    });
});

import { spaceTrim } from 'spacetrim';
import { describe, expect, it } from '@jest/globals';
import { deduplicateSystemMessage } from './deduplicateSystemMessage';

describe('deduplicateSystemMessage', () => {
    it('merges sections sharing one heading into the position of the first occurrence', () => {
        const systemMessage = spaceTrim(`
            You are Copywriter

            ## Writing rules
            Shared writing guidance.

            First writing rules.

            ## Rules

            -   Be nice.

            ## Writing rules
            Shared writing guidance.

            Second writing rules.
        `);

        expect(deduplicateSystemMessage(systemMessage)).toBe(
            spaceTrim(`
                You are Copywriter

                ## Writing rules
                Shared writing guidance.

                First writing rules.

                Second writing rules.

                ## Rules

                -   Be nice.
            `),
        );
    });

    it('keeps a repeated identical section only once', () => {
        const systemMessage = spaceTrim(`
            ## Privacy

            -   Use \`turn_privacy_on\` when the user asks for a private conversation.
            -   Do not claim that end-to-end encryption is implemented yet.

            ## Privacy

            -   Use \`turn_privacy_on\` when the user asks for a private conversation.
            -   Do not claim that end-to-end encryption is implemented yet.
        `);

        expect(deduplicateSystemMessage(systemMessage)).toBe(
            spaceTrim(`
                ## Privacy

                -   Use \`turn_privacy_on\` when the user asks for a private conversation.
                -   Do not claim that end-to-end encryption is implemented yet.
            `),
        );
    });

    it('joins merged list blocks into one compact list', () => {
        const systemMessage = spaceTrim(`
            ## Language

            -   Your language is English

            ## Language

            -   Your language is Czech
        `);

        expect(deduplicateSystemMessage(systemMessage)).toBe(
            spaceTrim(`
                ## Language

                -   Your language is English
                -   Your language is Czech
            `),
        );
    });

    it('keeps the original spacing of a list which was not merged', () => {
        const systemMessage = spaceTrim(`
            ## Knowledge

            -   First loose item

            -   Second loose item
        `);

        expect(deduplicateSystemMessage(systemMessage)).toBe(systemMessage);
    });

    it('keeps identical blocks placed under different headings', () => {
        const systemMessage = spaceTrim(`
            ## Rules

            -   Stay concise.

            ## Goal

            -   Stay concise.
        `);

        expect(deduplicateSystemMessage(systemMessage)).toBe(systemMessage);
    });

    it('does not split or deduplicate inside fenced code blocks', () => {
        const systemMessage = spaceTrim(`
            ## Knowledge

            \`\`\`text
            ## Repeated heading inside code

            Repeated paragraph inside code

            Repeated paragraph inside code
            \`\`\`
        `);

        expect(deduplicateSystemMessage(systemMessage)).toBe(systemMessage);
    });

    it('leaves a system message without duplicates unchanged', () => {
        const systemMessage = spaceTrim(`
            You are Copywriter

            ## Rules

            -   Be nice.
            -   Be brief.

            Output Format: JSON
        `);

        expect(deduplicateSystemMessage(systemMessage)).toBe(systemMessage);
    });

    it('keeps an empty system message untouched', () => {
        expect(deduplicateSystemMessage('')).toBe('');
    });
});

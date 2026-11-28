import { spaceTrim } from 'spacetrim';
import { describe, expect, it } from '@jest/globals';
import { createAgentModelRequirements } from './createAgentModelRequirements';
import { validateBook } from './string_book';

/**
 * Counts literal substring occurrences inside a string.
 *
 * @param haystack - Full text to scan.
 * @param needle - Exact substring to count.
 * @returns Number of literal matches.
 *
 * @private test utility of `createAgentModelRequirements.deduplication.test.ts`
 */
function countOccurrences(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
}

describe('createAgentModelRequirements system message deduplication', () => {
    it('emits the shared WRITING RULES guidance only once', async () => {
        const agentSource = validateBook(
            spaceTrim(`
            Copywriter
            WRITING RULES First writing rules.
            WRITING RULES Second writing rules.
        `),
        );

        const requirements = await createAgentModelRequirements(agentSource);

        expect(countOccurrences(requirements.systemMessage, '## Writing rules')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'prefer the newer writing-rules blocks')).toBe(1);
        expect(requirements.systemMessage.indexOf('First writing rules.')).toBeLessThan(
            requirements.systemMessage.indexOf('Second writing rules.'),
        );
    });

    it('emits the shared WRITING SAMPLE guidance only once', async () => {
        const agentSource = validateBook(
            spaceTrim(`
            Copywriter
            WRITING SAMPLE First voice sample.
            WRITING RULES Some writing rules.
            WRITING SAMPLE Second voice sample.
        `),
        );

        const requirements = await createAgentModelRequirements(agentSource);

        expect(countOccurrences(requirements.systemMessage, '## Writing sample')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'newer samples have higher weight than older ones')).toBe(
            1,
        );
        expect(requirements.systemMessage.indexOf('First voice sample.')).toBeLessThan(
            requirements.systemMessage.indexOf('Second voice sample.'),
        );
    });

    it('emits repeated USE commitment instructions only once', async () => {
        const agentSource = validateBook(
            spaceTrim(`
            Assistant
            USE PRIVACY
            USE POPUP
            USE PRIVACY
            USE POPUP
        `),
        );

        const requirements = await createAgentModelRequirements(agentSource);

        expect(countOccurrences(requirements.systemMessage, '## Privacy')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, '## Popup')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'You can open a popup window with a specific URL')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Do not claim that end-to-end encryption')).toBe(1);
    });

    it('merges repeated LANGUAGE sections while keeping every distinct instruction', async () => {
        const agentSource = validateBook(
            spaceTrim(`
            Translator
            LANGUAGE English
            LANGUAGE Czech
        `),
        );

        const requirements = await createAgentModelRequirements(agentSource);

        expect(countOccurrences(requirements.systemMessage, '## Language')).toBe(1);
        expect(requirements.systemMessage).toContain('-   Your language is English\n-   Your language is Czech');
    });

    it('keeps one occurrence of a repeated instruction without its own heading', async () => {
        const agentSource = validateBook(
            spaceTrim(`
            Assistant
            STYLE Formal.
            STYLE Formal.
        `),
        );

        const requirements = await createAgentModelRequirements(agentSource);

        expect(countOccurrences(requirements.systemMessage, 'Style: Formal.')).toBe(1);
    });
});

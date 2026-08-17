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
 * @private test utility of `createAgentModelRequirements.commitmentAggregation.test.ts`
 */
function countOccurrences(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
}

describe('createAgentModelRequirements commitment aggregation', () => {
    it('keeps multi-PERSONA content merged without duplication or reordering', async () => {
        const agentSource = validateBook(
            spaceTrim(`
            Persona Agent
            PERSONA First persona trait.
            PERSONA Second persona trait.
        `),
        );

        const requirements = await createAgentModelRequirements(agentSource);

        expect(countOccurrences(requirements.systemMessage, 'You are Persona Agent')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'First persona trait.')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Second persona trait.')).toBe(1);
        expect(requirements.systemMessage.indexOf('First persona trait.')).toBeLessThan(
            requirements.systemMessage.indexOf('Second persona trait.'),
        );
    });

    it('keeps only the last GOAL commitment effective after rewrite ordering', async () => {
        const agentSource = validateBook(
            spaceTrim(`
            Goal Agent
            GOAL Inherited goal.
            RULE Stay concise.
            GOALS Final goal.
        `),
        );

        const requirements = await createAgentModelRequirements(agentSource);

        expect(countOccurrences(requirements.systemMessage, 'Inherited goal.')).toBe(0);
        expect(countOccurrences(requirements.systemMessage, 'Final goal.')).toBe(1);
        expect(countOccurrences(requirements.promptSuffix, 'Inherited goal.')).toBe(0);
        expect(countOccurrences(requirements.promptSuffix, 'Final goal.')).toBe(1);
        expect(requirements.systemMessage).toContain('## Rules');
        expect(requirements.systemMessage).toContain('-   Stay concise.');
    });
});

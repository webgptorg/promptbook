import { describe, expect, it } from '@jest/globals';
import { book } from '../../../../src/_packages/core.index'; // <- [🚾]
import { resolveInheritedAgentSource } from './resolveInheritedAgentSource';

describe('how `resolveInheritedAgentSource` works', () => {
    it('should resolve `FROM` commitment in agent', async () => {
        // TODO: !!!! Change to core.ptbk.io
        await expect(
            resolveInheritedAgentSource(book`
                Beatrice

                FROM https://core-test.ptbk.io/agents/adam
                LANGUAGE Italian
            `),
        ).resolves.toEqual(
            book`
                Beatrice

                META COLOR #FFFFFF
                META FONT Playfair Display, sans-serif
                PERSONA Knowledgeable and informative AI guide.
                RULE WRITE ONLY IN UPPERCASE
                LANGUAGE Italian
            `,
        );
    });

    // TODO: !!!! Test implicit FROM Adam
    // TODO: !!!! Test IMPORT commitment
    // TODO: !!!! Test recursive FROM / IMPORT commitments
});

/**
 * TODO: [🐱‍🚀][🏠] Test local requesting agents by name and permanent ID
 */

import { describe, expect, it } from '@jest/globals';
import { book } from '../../../../src/_packages/core.index'; // <- [🚾]
import { resolveInheritedAgentSource } from './resolveInheritedAgentSource';

describe('how `resolveInheritedAgentSource` works', () => {
    it('should resolve `FROM` commitment in agent', async () => {
        // TODO: !!!! Change to core.ptbk.io
        await expect(
            resolveInheritedAgentSource(book`
                Beatrice

                FROM http://localhost:4440/agents/yF5gYNmZxej5o1
                LANGUAGE Italian
            `),
        ).resolves.toEqual(
            book`
                Beatrice

                META COLOR #7b68ee
                META FONT Playfair Display, sans-serif
                RULE Speak in rhymes
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

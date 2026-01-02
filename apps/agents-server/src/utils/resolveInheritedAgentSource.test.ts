import { describe, expect, it } from '@jest/globals';
import { book } from '../../../../src/_packages/core.index'; // <- [🚾]
import { resolveInheritedAgentSource } from './resolveInheritedAgentSource';

describe('how `resolveInheritedAgentSource` works', () => {
    it('should resolve `FROM` commitment in agent', async () => {
        await expect(
            resolveInheritedAgentSource(book`
                Beatrice

                FROM https://core-test.ptbk.io/agents/test-0
                LANGUAGE Italian
            `),
        ).resolves.toEqual(
            book`
                Beatrice

                NOTE Inherited FROM https://core-test.ptbk.io/agents/test-0
                FROM VOID
                NONCE 0

                ---

                LANGUAGE Italian
            `,
        );
    });

    it('should resolve `FROM VOID` commitment in agent', async () => {
        await expect(
            resolveInheritedAgentSource(book`
                Beatrice

                FROM VOID
                LANGUAGE Italian
            `),
        ).resolves.toEqual(
            book`
                Beatrice

                FROM VOID
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

import { describe, expect, it } from '@jest/globals';
import { book, NotFoundError } from '../../../../src/_packages/core.index'; // <- [🚾]
import { importAgent } from './importAgent';

describe('how `importAgent` works', () => {
    it('should fetch agent from Core server', async () => {
        await expect(importAgent(`https://core-test.ptbk.io/agents/test-0`)).resolves.toEqual(
            book`
                Test 0

                FROM VOID
                NONCE 0
                CLOSED


            `,
        );
    });

    it('should fail fetching a non-existent agent', async () => {
        await expect(importAgent(`https://core-test.ptbk.io/agents/foobarhululu`)).rejects.toThrowError(NotFoundError);
    });

    // <- TODO: !!!! What about non-existent server?
});

/**
 * TODO: [🐱‍🚀][🏠] Test local requesting agents by name and permanent ID
 */

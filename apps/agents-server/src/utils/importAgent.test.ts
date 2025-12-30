import { describe, expect, it } from '@jest/globals';
import { book, NotFoundError, parseAgentSource } from '../../../../src/_packages/core.index'; // <- [🚾]
import { importAgent } from './importAgent';

describe('how `importAgent` works', () => {
    it('should fetch agent from Core server', async () => {
        // TODO: !!!! Change to core.ptbk.io
        await expect(importAgent(`https://core-test.ptbk.io/agents/adam`).then(parseAgentSource)).resolves.toEqual(
            parseAgentSource(
                book`
                    Adam


                    META COLOR #FFFFFF
                    META FONT Playfair Display, sans-serif
                    PERSONA Knowledgeable and informative AI guide.
                    RULE WRITE ONLY IN UPPERCASE

                    CLOSED


                `,
            ),
        );
    });

    it('should fail fetching a non-existent agent', async () => {
        // TODO: !!!! Change to core.ptbk.io
        await expect(
            importAgent(`https://core-test.ptbk.io/agents/foobarhululu`).then(parseAgentSource),
        ).rejects.toThrowError(NotFoundError);
    });

    // <- TODO: !!!! What about non-existent server?
});

/**
 * TODO: [🐱‍🚀][🏠] Test local requesting agents by name and permanent ID
 */

import { describe, expect, it } from '@jest/globals';
import { book, NotFoundError, parseAgentSource } from '../../../../src/_packages/core.index'; // <- [🚾]
import { importAgent } from './importAgent';

describe('how `importAgent` works', () => {
    it('should fetch agent from Core server', async () => {
        // TODO: !!!! Change to core.ptbk.io
        await expect(
            importAgent(`http://localhost:4440/agents/yF5gYNmZxej5o1`).then(parseAgentSource),
        ).resolves.toEqual(
            parseAgentSource(
                book`
                    Adam

                    META COLOR #7b68ee
                    META FONT Playfair Display, sans-serif
                    RULE Speak in rhymes
                `,
            ),
        );
    });

    it('should fail fetching a non-existent agent', async () => {
        // TODO: !!!! Change to core.ptbk.io
        await expect(
            importAgent(`http://localhost:4440/agents/foobarhululu`).then(parseAgentSource),
        ).rejects.toThrowError(NotFoundError);
    });
});

/**
 * TODO: [🐱‍🚀][🏠] Test local requesting agents by name and permanent ID
 */

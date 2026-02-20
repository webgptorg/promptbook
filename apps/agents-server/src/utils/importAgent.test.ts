import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { book, NotFoundError } from '../../../../src/_packages/core.index'; // <- [🚾]
import { importAgent } from './importAgent';

/**
 * Keeps original global fetch implementation to restore after each test.
 */
const ORIGINAL_FETCH = global.fetch;

afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.restoreAllMocks();
});

describe('how `importAgent` works', () => {
    it('should fetch agent from Core server', async () => {
        global.fetch = jest.fn(async (input: RequestInfo | URL) => {
            const url = String(input);

            if (url !== 'https://core-test.ptbk.io/agents/test-0/api/book?recursionLevel=1') {
                throw new Error(`Unexpected fetch URL: ${url}`);
            }

            return new Response(
                book`
                    Test 0

                    FROM VOID
                    NONCE 0
                    CLOSED


                `,
                {
                    status: 200,
                    headers: { 'content-type': 'text/plain' },
                },
            );
        }) as typeof fetch;

        await expect(importAgent('https://core-test.ptbk.io/agents/test-0')).resolves.toEqual(
            book`
                Test 0

                FROM VOID
                NONCE 0
                CLOSED


            `,
        );
    });

    it('should fail fetching a non-existent agent', async () => {
        global.fetch = jest.fn(async (input: RequestInfo | URL) => {
            const url = String(input);

            if (url !== 'https://core-test.ptbk.io/agents/foobarhululu/api/book?recursionLevel=1') {
                throw new Error(`Unexpected fetch URL: ${url}`);
            }

            return new Response(JSON.stringify({ name: 'NotFoundError', message: 'Agent not found', stack: '' }), {
                status: 404,
                headers: { 'content-type': 'application/json' },
            });
        }) as typeof fetch;

        await expect(importAgent('https://core-test.ptbk.io/agents/foobarhululu')).rejects.toThrowError(NotFoundError);
    });

    // <- TODO: !!!! What about non-existent server?
});

/**
 * TODO: [🐱‍🚀][🏠] Test local requesting agents by name and permanent ID
 */

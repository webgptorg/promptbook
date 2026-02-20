import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { book } from '../../../../src/_packages/core.index'; // <- [🚾]
import type { string_book } from '../../../../src/_packages/types.index'; // <- [🚾]
import { resolveAgentProfileWithInheritance } from './resolveAgentProfileWithInheritance';

/**
 * Restores the global fetch implementation after each test.
 */
const ORIGINAL_FETCH = global.fetch;

/**
 * Mocks parent-agent fetch used by `importAgent`.
 *
 * @param parentAgentUrl - Parent URL used in `FROM`.
 * @param parentAgentSource - Text returned from `/api/book`.
 */
function mockParentAgentFetch(parentAgentUrl: string, parentAgentSource: string): void {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const expectedUrl = `${parentAgentUrl}/api/book?recursionLevel=1`;

        if (url === expectedUrl) {
            return new Response(parentAgentSource, {
                status: 200,
                headers: { 'content-type': 'text/plain' },
            });
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
    }) as typeof fetch;
}

afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.restoreAllMocks();
});

describe('resolveAgentProfileWithInheritance', () => {
    it('inherits META and INITIAL MESSAGE from parent when child does not define them', async () => {
        const parentAgentUrl = 'https://example.com/agents/parent';
        mockParentAgentFetch(
            parentAgentUrl,
            book`
                Parent Agent

                FROM VOID
                META IMAGE https://cdn.example.com/parent.png
                META DESCRIPTION Parent description
                META COLOR #123456
                INITIAL MESSAGE Hello from parent.
            `,
        );

        const profile = await resolveAgentProfileWithInheritance(
            `
                Child Agent

                FROM ${parentAgentUrl}
                RULE Answer shortly.
            ` as string_book,
            {
                adamAgentUrl: 'https://example.com/agents/adam',
            },
        );

        expect(profile.meta.image).toBe('https://cdn.example.com/parent.png');
        expect(profile.meta.description).toBe('Parent description');
        expect(profile.meta.color).toBe('#123456');
        expect(profile.initialMessage).toBe('Hello from parent.');
    });

    it('lets child override inherited META and INITIAL MESSAGE while preserving child capability parsing', async () => {
        const parentAgentUrl = 'https://example.com/agents/parent';
        mockParentAgentFetch(
            parentAgentUrl,
            book`
                Parent Agent

                FROM VOID
                USE BROWSER
                META IMAGE https://cdn.example.com/parent.png
                META DESCRIPTION Parent description
                INITIAL MESSAGE Hello from parent.
            `,
        );

        const profile = await resolveAgentProfileWithInheritance(
            `
                Child Agent

                FROM ${parentAgentUrl}
                USE SEARCH ENGINE
                META DESCRIPTION Child description
                INITIAL MESSAGE Hello from child.
            ` as string_book,
            {
                adamAgentUrl: 'https://example.com/agents/adam',
            },
        );

        expect(profile.meta.image).toBe('https://cdn.example.com/parent.png');
        expect(profile.meta.description).toBe('Child description');
        expect(profile.initialMessage).toBe('Hello from child.');
        expect(profile.capabilities.some((capability: { type: string }) => capability.type === 'search-engine')).toBe(
            true,
        );
        expect(profile.capabilities.some((capability: { type: string }) => capability.type === 'browser')).toBe(
            false,
        );
    });
});

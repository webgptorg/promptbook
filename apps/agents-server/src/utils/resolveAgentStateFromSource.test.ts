import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { book, createAgentModelRequirements } from '../../../../src/_packages/core.index'; // <- [🚾]
import type { string_book } from '../../../../src/_packages/types.index';
import { resolveAgentStateFromSource } from './resolveAgentStateFromSource';

/**
 * Original fetch implementation restored after each test.
 */
const ORIGINAL_FETCH = global.fetch;

/**
 * Installs one deterministic fetch mock for parent-agent imports.
 *
 * @param routes - Text responses keyed by normalized `/api/book` URL.
 */
function mockFetchRoutes(routes: Record<string, string>): void {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const normalizedUrl = url.pathname.endsWith('/api/book')
            ? `${url.origin}${url.pathname}?recursionLevel=${url.searchParams.get('recursionLevel') || ''}`
            : url.href;
        const route = routes[normalizedUrl];

        if (!route) {
            throw new Error(`Unexpected fetch URL: ${url.href}`);
        }

        return new Response(route, {
            status: 200,
            headers: { 'content-type': 'text/plain' },
        });
    }) as typeof fetch;
}

afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.restoreAllMocks();
});

describe('resolveAgentStateFromSource', () => {
    it('inherits metadata and initial message from the resolved parent source', async () => {
        const parentAgentUrl = 'https://example.com/agents/parent-metadata';
        mockFetchRoutes({
            [`${parentAgentUrl}/api/book?recursionLevel=1`]: book`
                Parent Agent

                FROM VOID
                META IMAGE https://cdn.example.com/parent.png
                META DESCRIPTION Parent description
                META COLOR #123456
                META FONT Arial, sans-serif
                INITIAL MESSAGE Hello from parent.
            `,
        });

        const resolvedAgentState = await resolveAgentStateFromSource(
            `
                Child Agent

                FROM ${parentAgentUrl}
                RULE Answer shortly.
            ` as string_book,
            {
                adamAgentUrl: 'https://example.com/agents/adam',
                canonicalAgentUrl: 'https://local.example/agents/child',
            },
        );

        expect(resolvedAgentState.resolvedAgentProfile.meta.image).toBe('https://cdn.example.com/parent.png');
        expect(resolvedAgentState.resolvedAgentProfile.meta.description).toBe('Parent description');
        expect(resolvedAgentState.resolvedAgentProfile.meta.color).toBe('#123456');
        expect(resolvedAgentState.resolvedAgentProfile.meta.font).toBe('Arial, sans-serif');
        expect(resolvedAgentState.resolvedAgentProfile.initialMessage).toBe('Hello from parent.');
    });

    it('gives child overrides precedence while keeping inherited rules and commitments', async () => {
        const parentAgentUrl = 'https://example.com/agents/parent-overrides';
        mockFetchRoutes({
            [`${parentAgentUrl}/api/book?recursionLevel=1`]: book`
                Parent Agent

                FROM VOID
                USE BROWSER
                RULE Follow the parent rule.
                META COLOR #123456
                META FONT Arial, sans-serif
                INITIAL MESSAGE Hello from parent.
            `,
        });

        const resolvedAgentState = await resolveAgentStateFromSource(
            `
                Child Agent

                FROM ${parentAgentUrl}
                USE SEARCH ENGINE
                RULE Follow the child rule.
                META COLOR #654321
                INITIAL MESSAGE Hello from child.
            ` as string_book,
            {
                adamAgentUrl: 'https://example.com/agents/adam',
                canonicalAgentUrl: 'https://local.example/agents/child',
            },
        );
        const modelRequirements = await createAgentModelRequirements(resolvedAgentState.resolvedAgentSource);

        expect(resolvedAgentState.resolvedAgentProfile.meta.color).toBe('#654321');
        expect(resolvedAgentState.resolvedAgentProfile.meta.font).toBe('Arial, sans-serif');
        expect(resolvedAgentState.resolvedAgentProfile.initialMessage).toBe('Hello from child.');
        expect(
            resolvedAgentState.resolvedAgentProfile.capabilities.some((capability) => capability.type === 'browser'),
        ).toBe(true);
        expect(
            resolvedAgentState.resolvedAgentProfile.capabilities.some(
                (capability) => capability.type === 'search-engine',
            ),
        ).toBe(true);
        expect(modelRequirements.systemMessage).toContain('Follow the parent rule.');
        expect(modelRequirements.systemMessage).toContain('Follow the child rule.');
    });

    it('uses the child last GOAL for resolved profile text while keeping inherited commitments', async () => {
        const parentAgentUrl = 'https://example.com/agents/parent-goal';
        mockFetchRoutes({
            [`${parentAgentUrl}/api/book?recursionLevel=1`]: book`
                Parent Agent

                FROM VOID
                GOAL Parent goal.
                RULE Follow the parent rule.
            `,
        });

        const resolvedAgentState = await resolveAgentStateFromSource(
            `
                Child Agent

                FROM ${parentAgentUrl}
                PERSONA Deprecated child persona.
                GOAL Child goal.
                RULE Follow the child rule.
            ` as string_book,
            {
                adamAgentUrl: 'https://example.com/agents/adam',
                canonicalAgentUrl: 'https://local.example/agents/child',
            },
        );
        const modelRequirements = await createAgentModelRequirements(resolvedAgentState.resolvedAgentSource);

        expect(resolvedAgentState.resolvedAgentProfile.personaDescription).toBe('Child goal.');
        expect(modelRequirements.systemMessage).toContain('Child goal.');
        expect(modelRequirements.systemMessage).not.toContain('Parent goal.');
        expect(modelRequirements.systemMessage).toContain('Follow the parent rule.');
        expect(modelRequirements.systemMessage).toContain('Follow the child rule.');
    });
});

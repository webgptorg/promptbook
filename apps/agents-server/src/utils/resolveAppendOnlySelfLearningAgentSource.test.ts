import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { book } from '../../../../src/_packages/core.index';
import { padBook } from '../../../../src/book-2.0/agent-source/padBook';
import type { string_book } from '../../../../src/book-2.0/agent-source/string_book';
import { validateBook } from '../../../../src/book-2.0/agent-source/string_book';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { resolveInheritedAgentSource } from './resolveInheritedAgentSource';
import { resolveAppendOnlySelfLearningAgentSource } from './resolveAppendOnlySelfLearningAgentSource';

/**
 * Original fetch implementation restored after each test.
 */
const ORIGINAL_FETCH = global.fetch;

/**
 * Mocked HTTP response definition keyed by normalized URL.
 */
type MockFetchRoute = {
    readonly body: string | Record<string, unknown>;
    readonly contentType?: string;
    readonly status?: number;
    readonly headers?: Record<string, string>;
};

/**
 * Normalizes URLs used by `importAgent` so tests can ignore revalidation/cycle query params.
 *
 * @param rawUrl - Raw request URL.
 * @returns Stable key for the mocked response map.
 */
function normalizeFetchKey(rawUrl: string): string {
    const url = new URL(rawUrl);

    if (url.pathname.endsWith('/api/book')) {
        return `${url.origin}${url.pathname}?recursionLevel=${url.searchParams.get('recursionLevel') || ''}`;
    }

    return `${url.origin}${url.pathname}`;
}

/**
 * Installs a deterministic `fetch` mock for remote/local agent imports.
 *
 * @param routes - Mocked responses keyed by normalized URL.
 */
function mockFetchRoutes(routes: Record<string, MockFetchRoute>): void {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
        const requestUrl = String(input);
        const route = routes[normalizeFetchKey(requestUrl)];

        if (!route) {
            throw new Error(`Unexpected fetch URL: ${requestUrl}`);
        }

        return new Response(
            typeof route.body === 'string' ? route.body : JSON.stringify(route.body),
            {
                status: route.status || 200,
                headers: {
                    'content-type': route.contentType || (typeof route.body === 'string' ? 'text/plain' : 'application/json'),
                    ...(route.headers || {}),
                },
            },
        );
    }) as typeof fetch;
}

/**
 * Appends one section into a book value for test fixture setup.
 *
 * @param agentSource - Existing source.
 * @param section - Section to append.
 * @returns Source with appended section.
 */
function appendBookSection(agentSource: string_book, section: string): string_book {
    return padBook(validateBook(`${spaceTrim(agentSource)}\n\n${spaceTrim(section)}`));
}

afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.restoreAllMocks();
});

describe('resolveAppendOnlySelfLearningAgentSource', () => {
    it('preserves child-only storage for implicit default Adam inheritance', async () => {
        const unresolvedChildSource = book`
            Child Agent

            RULE Child baseline.
        `;

        mockFetchRoutes({
            'https://core-test.ptbk.io/agents/adam/api/book?recursionLevel=1': {
                body: book`
                    Adam

                    FROM VOID
                    RULE Parent rule from Adam.
                `,
            },
        });

        const resolvedBeforeLearning = await resolveInheritedAgentSource(unresolvedChildSource, {
            adamAgentUrl: 'https://core-test.ptbk.io/agents/adam',
            currentAgentUrl: 'https://local.example/agents/child-agent',
        });
        const resolvedAfterLearning = appendBookSection(
            resolvedBeforeLearning,
            `
                KNOWLEDGE Learned from chat interaction.
            `,
        );

        const nextStoredSource = resolveAppendOnlySelfLearningAgentSource({
            unresolvedAgentSourceBeforeLearning: unresolvedChildSource,
            resolvedAgentSourceBeforeLearning: resolvedBeforeLearning,
            resolvedAgentSourceAfterLearning: resolvedAfterLearning,
        });

        expect(nextStoredSource).not.toBeNull();
        expect(nextStoredSource).toContain('RULE Child baseline.');
        expect(nextStoredSource).toContain('KNOWLEDGE Learned from chat interaction.');
        expect(nextStoredSource).not.toContain('NOTE Inherited Adam FROM https://core-test.ptbk.io/agents/adam');
        expect(nextStoredSource).not.toContain('RULE Parent rule from Adam.');
    });

    it('preserves child-only storage for explicit FROM inheritance', async () => {
        const unresolvedChildSource = book`
            Child Agent

            FROM https://local.example/agents/parent-1
            RULE Child baseline.
        `;

        mockFetchRoutes({
            'https://local.example/agents/parent-1/api/book?recursionLevel=1': {
                body: book`
                    Parent Agent

                    FROM VOID
                    RULE Parent rule from explicit FROM.
                `,
            },
        });

        const resolvedBeforeLearning = await resolveInheritedAgentSource(unresolvedChildSource, {
            adamAgentUrl: 'https://core-test.ptbk.io/agents/adam',
            currentAgentUrl: 'https://local.example/agents/child-agent',
        });
        const resolvedAfterLearning = appendBookSection(
            resolvedBeforeLearning,
            `
                RULE Learned extra child behavior.
            `,
        );

        const nextStoredSource = resolveAppendOnlySelfLearningAgentSource({
            unresolvedAgentSourceBeforeLearning: unresolvedChildSource,
            resolvedAgentSourceBeforeLearning: resolvedBeforeLearning,
            resolvedAgentSourceAfterLearning: resolvedAfterLearning,
        });

        expect(nextStoredSource).not.toBeNull();
        expect(nextStoredSource).toContain('FROM https://local.example/agents/parent-1');
        expect(nextStoredSource).toContain('RULE Child baseline.');
        expect(nextStoredSource).toContain('RULE Learned extra child behavior.');
        expect(nextStoredSource).not.toContain('NOTE Inherited FROM https://local.example/agents/parent-1');
        expect(nextStoredSource).not.toContain('RULE Parent rule from explicit FROM.');
    });

    it('returns null when the same section is already stored (idempotency)', () => {
        const unresolvedChildSource = book`
            Child Agent

            RULE Child baseline.
            KNOWLEDGE Learned from chat interaction.
        `;
        const resolvedBeforeLearning = unresolvedChildSource;
        const resolvedAfterLearning = appendBookSection(
            resolvedBeforeLearning,
            `
                KNOWLEDGE Learned from chat interaction.
            `,
        );

        const nextStoredSource = resolveAppendOnlySelfLearningAgentSource({
            unresolvedAgentSourceBeforeLearning: unresolvedChildSource,
            resolvedAgentSourceBeforeLearning: resolvedBeforeLearning,
            resolvedAgentSourceAfterLearning: resolvedAfterLearning,
        });

        expect(nextStoredSource).toBeNull();
    });
});

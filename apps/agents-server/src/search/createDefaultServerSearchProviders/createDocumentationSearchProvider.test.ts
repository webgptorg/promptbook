import { describe, expect, it } from '@jest/globals';
import { createDocumentationSearchProvider } from './createDocumentationSearchProvider';

describe('createDocumentationSearchProvider', () => {
    it('labels the grouped OPEN/CLOSED docs entry with both commitment names', async () => {
        const provider = createDocumentationSearchProvider();
        const results = await provider.search({
            query: 'open closed',
            limitPerProvider: 10,
            isAdmin: false,
            currentUser: null,
        });

        const openClosedResult = results.find((result) => result.href === '/docs/OPEN');

        expect(openClosedResult).toBeDefined();
        expect(openClosedResult?.title).toBe('OPEN / CLOSED');
    });
});

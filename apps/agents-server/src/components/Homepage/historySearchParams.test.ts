/** @jest-environment jsdom */

import { afterEach, describe, expect, it } from '@jest/globals';
import { buildHistorySearchParamsHref, updateHistorySearchParams } from './historySearchParams';

describe('historySearchParams', () => {
    afterEach(() => {
        window.history.replaceState(null, '', 'http://localhost/');
    });

    it('builds an href without a dangling query separator when the mutation clears all params', () => {
        const nextHref = buildHistorySearchParamsHref({
            pathname: '/dashboard',
            searchParamsSnapshot: 'folder=ops',
            updateSearchParams: (searchParams) => {
                searchParams.delete('folder');
            },
        });

        expect(nextHref).toBe('/dashboard');
    });

    it('pushes folder navigation immediately while preserving unrelated query params', () => {
        window.history.replaceState(null, '', 'http://localhost/dashboard?view=graph');

        updateHistorySearchParams({
            mode: 'push',
            pathname: '/dashboard',
            searchParamsSnapshot: 'view=graph',
            updateSearchParams: (searchParams) => {
                searchParams.set('folder', 'Operations/On-call');
            },
        });

        expect(window.location.pathname).toBe('/dashboard');
        expect(window.location.search).toBe('?view=graph&folder=Operations%2FOn-call');
    });

    it('replaces the current history entry when normalizing an invalid folder query', () => {
        window.history.replaceState(null, '', 'http://localhost/dashboard?folder=Missing');

        updateHistorySearchParams({
            mode: 'replace',
            pathname: '/dashboard',
            searchParamsSnapshot: 'folder=Missing',
            updateSearchParams: (searchParams) => {
                searchParams.delete('folder');
            },
        });

        expect(window.location.pathname).toBe('/dashboard');
        expect(window.location.search).toBe('');
    });
});

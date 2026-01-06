import type { Promisable } from 'type-fest';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
import type { SearchEngine } from '../SearchEngine';
import type { SearchResult } from '../SearchResult';

/**
 * A search engine implementation that uses the Google Custom Search JSON API.
 *
 * @private <- TODO: !!!! Export via some package
 */
export class GoogleSearchEngine implements SearchEngine {
    public get title(): string_title & string_markdown_text {
        return 'Google Search Engine';
    }

    public get description(): string_markdown {
        return 'Search engine that uses Google Custom Search JSON API to fetch results';
    }

    /**
     * @see https://developers.google.com/custom-search/v1/overview
     */
    public checkConfiguration(): Promisable<void> {
        if (!process.env.GOOGLE_SEARCH_API_KEY) {
            throw new Error('GOOGLE_SEARCH_API_KEY is not configured');
        }
        if (!process.env.GOOGLE_SEARCH_ID) {
            throw new Error('GOOGLE_SEARCH_ID (cx) is not configured');
        }
    }

    public async search(query: string): Promise<SearchResult[]> {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const cx = process.env.GOOGLE_SEARCH_ID;

        if (!apiKey) {
            throw new Error('GOOGLE_SEARCH_API_KEY is not configured');
        }

        if (!cx) {
            throw new Error('GOOGLE_SEARCH_ID (cx) is not configured');
        }

        const url = new URL('https://customsearch.googleapis.com/customsearch/v1');
        url.searchParams.set('key', apiKey);
        url.searchParams.set('cx', cx);
        url.searchParams.set('q', query);

        const response = await fetch(url.toString());

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Google Search API failed with status ${response.status}: ${response.statusText}\n${body}`);
        }

        const data = (await response.json()) as GoogleSearchResponse;

        return (data.items || []).map((item) => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet || '',
        }));
    }
}

/**
 * @see https://developers.google.com/custom-search/v1/reference/rest/v1/Search
 */
type GoogleSearchResponse = {
    items?: Array<{
        title: string;
        link: string;
        snippet?: string;
    }>;
};

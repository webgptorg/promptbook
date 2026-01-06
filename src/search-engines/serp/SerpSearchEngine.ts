import type { Promisable } from 'type-fest';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
import type { SearchEngine } from '../SearchEngine';
import type { SearchResult } from '../SearchResult';

/**
 * A search engine implementation that uses the SerpApi to fetch Google search results.
 *
 * @private <- TODO: !!!! Export via some package
 */
export class SerpSearchEngine implements SearchEngine {
    public get title(): string_title & string_markdown_text {
        return 'SerpApi Search Engine';
    }

    public get description(): string_markdown {
        return 'Search engine that uses SerpApi to fetch Google search results';
    }

    public checkConfiguration(): Promisable<void> {
        if (!process.env.SERP_API_KEY) {
            throw new Error('SERP_API_KEY is not configured');
        }
    }

    public async search(query: string): Promise<SearchResult[]> {
        const apiKey = process.env.SERP_API_KEY;

        if (!apiKey) {
            throw new Error('SERP_API_KEY is not configured');
        }

        const url = new URL('https://serpapi.com/search');
        url.searchParams.set('q', query);
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('engine', 'google');

        const response = await fetch(url.toString());

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`SerpApi failed with status ${response.status}: ${response.statusText}\n${body}`);
        }

        const data = (await response.json()) as SerpSearchResponse;

        return (data.organic_results || []).map((item) => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet || '',
        }));
    }
}

/**
 * @see https://serpapi.com/search-api
 */
type SerpSearchResponse = {
    organic_results?: Array<{
        title: string;
        link: string;
        snippet?: string;
    }>;
};

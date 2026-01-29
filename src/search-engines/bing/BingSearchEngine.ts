import type { Promisable } from 'type-fest';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
import type { SearchEngine } from '../SearchEngine';
import type { SearchResult } from '../SearchResult';

/**
 * A search engine implementation that uses the Bing Web Search API.
 *
 * @private <- TODO: !!!! Export via some package
 */
export class BingSearchEngine implements SearchEngine {
    public get title(): string_title & string_markdown_text {
        return 'Bing Search Engine';
    }

    public get description(): string_markdown {
        return 'Search engine that uses Bing API to fetch results';
    }

    public checkConfiguration(): Promisable<void> {
        if (!process.env.BING_SEARCH_API_KEY) {
            throw new Error('BING_SEARCH_API_KEY is not configured');
        }
    }

    public async search(query: string, options: Record<string, unknown> = {}): Promise<SearchResult[]> {
        console.log('BingSearchEngine.search', { query, options });
        const apiKey = process.env.BING_SEARCH_API_KEY;

        if (!apiKey) {
            throw new Error('BING_SEARCH_API_KEY is not configured');
        }

        const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`;
        // <- TODO: !!!! Maybe this endpoint is wrong, check the docs @see https://ai.azure.com/foundryProject/overview?wsid=/subscriptions/5668831b-3e82-400d-ace1-eb4cdd597526/resourceGroups/rg-me-2816/providers/Microsoft.CognitiveServices/accounts/promptbook-resource/projects/promptbook&tid=3e95d341-9c77-4368-9636-65d24a44a5d9

        const response = await fetch(url, {
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
            },
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Bing Search API failed with status ${response.status}: ${response.statusText}\n${body}`);
        }

        const data = (await response.json()) as BingSearchResponse;

        return (data.webPages?.value || []).map((item) => ({
            title: item.name,
            url: item.url,
            snippet: item.snippet,
        }));
    }
}

/**
 * @see https://learn.microsoft.com/en-us/bing/search-apis/bing-web-search/reference/response-objects
 */
type BingSearchResponse = {
    webPages?: {
        value: Array<{
            name: string;
            url: string;
            snippet: string;
        }>;
    };
};

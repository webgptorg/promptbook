'use server';

import { BingSearchEngine } from '../../../../../../src/search-engines/bing/BingSearchEngine';
import { DummySearchEngine } from '../../../../../../src/search-engines/dummy/DummySearchEngine';
import { SerpSearchEngine } from '../../../../../../src/search-engines/serp/SerpSearchEngine';
import { GoogleSearchEngine } from '../../../../../../src/search-engines/google/GoogleSearchEngine';
import { SearchResult } from '../../../../../../src/search-engines/SearchResult';

export async function search(
    query: string,
    provider: string,
    options: Record<string, unknown> = {},
): Promise<SearchResult[]> {
    if (provider === 'dummy') {
        const searchEngine = new DummySearchEngine();
        return searchEngine.search(query, options);
    } else if (provider === 'serp') {
        const searchEngine = new SerpSearchEngine();
        await searchEngine.checkConfiguration();
        return searchEngine.search(query, options);
    } else if (provider === 'bing') {
        const searchEngine = new BingSearchEngine();
        await searchEngine.checkConfiguration();
        return searchEngine.search(query, options);
    } else if (provider === 'google') {
        const searchEngine = new GoogleSearchEngine();
        await searchEngine.checkConfiguration();
        return searchEngine.search(query, options);
    }
    throw new Error(`Unknown provider: ${provider}`);

    // <- TODO: [🚃] List Search engines this dynamically from proper register
}

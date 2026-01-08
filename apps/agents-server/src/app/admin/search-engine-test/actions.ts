'use server';

import { BingSearchEngine } from '../../../../../../src/search-engines/bing/BingSearchEngine';
import { DummySearchEngine } from '../../../../../../src/search-engines/dummy/DummySearchEngine';
import { SerpSearchEngine } from '../../../../../../src/search-engines/serp/SerpSearchEngine';
import { SearchResult } from '../../../../../../src/search-engines/SearchResult';

export async function search(query: string, provider: string): Promise<SearchResult[]> {
    if (provider === 'dummy') {
        const searchEngine = new DummySearchEngine();
        return searchEngine.search(query);
    } else if (provider === 'serp') {
        const searchEngine = new SerpSearchEngine();
        await searchEngine.checkConfiguration();
        return searchEngine.search(query);
    } else if (provider === 'bing') {
        const searchEngine = new BingSearchEngine();
        await searchEngine.checkConfiguration();
        return searchEngine.search(query);
    }
    throw new Error(`Unknown provider: ${provider}`);

    // <- TODO: [🚃] List Search engines this dynamically from proper register
}

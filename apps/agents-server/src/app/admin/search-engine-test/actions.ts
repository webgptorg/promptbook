'use server';

import { DummySearchEngine } from '../../../../../../src/search-engines/dummy/DummySearchEngine';
import { SearchResult } from '../../../../../../src/search-engines/SearchResult';

export async function search(query: string, provider: string): Promise<SearchResult[]> {
    if (provider === 'dummy') {
        const searchEngine = new DummySearchEngine();
        return searchEngine.search(query);
    }
    throw new Error(`Unknown provider: ${provider}`);
}

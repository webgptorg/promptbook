import type { string_url } from '../types/typeAliases';

/**
 * Represents a search result from a search engine.
 */
export type SearchResult = {
    /**
     * The title of the search result.
     */
    title: string;

    /**
     * The URL of the search result.
     */
    url: string_url;

    /**
     * A short snippet or description of the search result.
     */
    snippet: string;
};

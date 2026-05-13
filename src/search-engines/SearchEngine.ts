import type { Promisable } from 'type-fest';
import type { string_markdown, string_markdown_text } from '../types/string_markdown';
import type { string_title } from '../types/string_title';
import type { SearchResult } from './SearchResult';

/**
 * Type describing search engine.
 */
export type SearchEngine = {
    readonly title: string_title & string_markdown_text;
    readonly description?: string_markdown;
    checkConfiguration(): Promisable<void>;
    search(query: string, options?: Record<string, unknown>): Promise<SearchResult[]>;
};

import type { Promisable } from 'type-fest';
import type { string_markdown, string_markdown_text, string_title } from '../types/typeAliases';
import type { SearchResult } from './SearchResult';

export type SearchEngine = {
    readonly title: string_title & string_markdown_text;
    readonly description?: string_markdown;
    checkConfiguration(): Promisable<void>;
    search(query: string, options?: Record<string, unknown>): Promise<SearchResult[]>;
};

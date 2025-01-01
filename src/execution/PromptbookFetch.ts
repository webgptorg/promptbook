import type { string_url } from '../types/typeAliases';

/**
 * Fetch function for fetching data from the internet used in scraping
 */
export type PromptbookFetch = (url: string_url, init?: RequestInit) => Promise<Response>;

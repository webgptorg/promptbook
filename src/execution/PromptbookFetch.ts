import type { string_url } from '../types/typeAliases';

/**
 * Fetch function used in Promptbook engine
 *
 * In most cases it is just native `fetch` function with a lightweight error handling wrapper
 * But it can be replaced with any other fetch function, polyfill, custom implementation, security layer, etc.
 *
 * It is used in theese places:
 * - Fetching knowledge sources
 * - Callbacks from remote server ([👩🏾‍🤝‍🧑🏾] Not yet implemented)
 */
export type PromptbookFetch = (url: string_url, init?: RequestInit) => Promise<Response>;

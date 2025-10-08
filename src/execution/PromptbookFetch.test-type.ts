import { keepUnused } from '../utils/organization/keepUnused';
import type { PromptbookFetch } from './PromptbookFetch';

// Note: Checking that `fetch` is implementing `PromptbookFetch`
let compatibleFetch: PromptbookFetch | null;
compatibleFetch = null;
compatibleFetch = fetch;
keepUnused(compatibleFetch);

/**
 * Note: [⚪] This should never be in any released package
 * TODO: Is this a good pattern to do type testing?
 */

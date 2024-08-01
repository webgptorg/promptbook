import { keepUnused } from '../../utils/organization/keepUnused';
import type { PromptbookStorage } from './PromptbookStorage';

// Note: Checking if localStorage and sessionStorage are implementing PromptbookStorage<string>
let storage: PromptbookStorage<string>;
storage = localStorage;
storage = sessionStorage;
keepUnused(storage);

/**
 * Note: [⚪] This should never be in any released package
 * TODO: Is this a good pattern to do type testing?
 */

import { notUsing } from '../../utils/organization/notUsing';
import { PromptbookStorage } from './PromptbookStorage';

// Note: Checking if localStorage and sessionStorage are implementing PromptbookStorage<string>
let storage: PromptbookStorage<string>;
storage = localStorage;
storage = sessionStorage;
notUsing(storage);

/**
 * TODO: !!!!! Check that this files is not exported into build
 * TODO: Is this a good pattern to do type testing?
 */

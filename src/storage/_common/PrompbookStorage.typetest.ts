import { notUsing } from '../../utils/organization/notUsing';
import { PrompbookStorage } from './PrompbookStorage';

// Note: Checking if localStorage and sessionStorage are implementing IStorage<string>
let storage: PrompbookStorage<string>;
storage = localStorage;
storage = sessionStorage;
notUsing(storage);

/**
 * TODO: !!!!! Check that this files is not exported into build
 * TODO: Is this a good pattern to do type testing?
 */

import { deepFreeze } from './utils/deepFreeze';

/**
 * The maximum number of iterations for a loops
 */
export const LOOP_LIMIT = 1000;

/**
 * The maximum number of iterations for a loops which adds characters one by one
 */
export const CHARACTER_LOOP_LIMIT = 100000;

/**
 * The maximum number of (LLM) tasks running in parallel
 */
export const MAX_PARALLEL_COUNT = 5;

/**
 * The maximum number of attempts to execute LLM task before giving up
 */
export const MAX_EXECUTION_ATTEMPTS = 3;

/**
 * The maximum length of the (generated) filename
 */
export const MAX_FILENAME_LENGTH = 30;

/**
 * The name of the builded pipeline collection made by CLI `ptbk make` and for lookup in `createCollectionFromDirectory`
 */
export const PIPELINE_COLLECTION_BASE_FILENAME = `index`;

/**
 * The names of the parameters that are reserved for special purposes
 */
export const RESERVED_PARAMETER_NAMES = deepFreeze([
    'context',
    // <- TODO: Add more like 'date', 'modelName',...
    // <- TODO: Add [emoji] + instructions ACRY when adding new reserved parameter
]);

/**
 * Nonce which is used for replacing things in strings
 */
export const REPLACING_NONCE = 'u$k42k%!V2zo34w7Fu#@QUHYPW';

/*
TODO: !!! Just testing false-negative detection of [🟡][🟢][🔵][⚪] leak
*/

// [🟡][🟢][🔵][⚪]

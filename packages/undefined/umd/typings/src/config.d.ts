/**
 * The maximum number of iterations for a loops
 *
 * @private within the repository - too low-level in comparison to other `MAX_...`
 */
export declare const LOOP_LIMIT = 1000;
/**
 * The maximum number of iterations for a loops which adds characters one by one
 *
 * @private within the repository - too low-level in comparison to other `MAX_...`
 */
export declare const CHARACTER_LOOP_LIMIT = 100000;
/**
 * The maximum number of (LLM) tasks running in parallel
 *
 * @public exported from `@promptbook/core`
 */
export declare const MAX_PARALLEL_COUNT = 5;
/**
 * The maximum number of attempts to execute LLM task before giving up
 *
 * @public exported from `@promptbook/core`
 */
export declare const MAX_EXECUTION_ATTEMPTS = 3;
/**
 * The maximum length of the (generated) filename
 *
 * @public exported from `@promptbook/core`
 */
export declare const MAX_FILENAME_LENGTH = 30;
/**
 * @@@
 * TODO: [🐝] !!! Use
 *
 * @public exported from `@promptbook/core`
 */
export declare const MAX_KNOWLEDGE_SOURCES_SCRAPING_DEPTH = 3;
/**
 * @@@
 * TODO: [🐝] !!! Use
 *
 * @public exported from `@promptbook/core`
 */
export declare const MAX_KNOWLEDGE_SOURCES_SCRAPING_TOTAL = 200;
/**
 * Where to store the cache of executions for promptbook CLI
 *
 * @public exported from `@promptbook/core`
 */
export declare const EXECUTIONS_CACHE_DIRNAME = "/.promptbook/executions-cache";
/**
 * The name of the builded pipeline collection made by CLI `ptbk make` and for lookup in `createCollectionFromDirectory`
 *
 * @public exported from `@promptbook/core`
 */
export declare const PIPELINE_COLLECTION_BASE_FILENAME = "index";
/**
 * Nonce which is used for replacing things in strings
 */
export declare const REPLACING_NONCE = "u$k42k%!V2zo34w7Fu#@QUHYPW";
/**
 * The names of the parameters that are reserved for special purposes
 *
 * @public exported from `@promptbook/core`
 */
export declare const RESERVED_PARAMETER_NAMES: readonly ["content", "context", "knowledge", "samples", "modelName", "currentDate"];
/**
 * @@@
 *
 * @private within the repository
 */
export declare const RESERVED_PARAMETER_MISSING_VALUE: string;
/**
 * @@@
 *
 * @private within the repository
 */
export declare const RESERVED_PARAMETER_RESTRICTED: string;
/**
 * @@@
 *
 * @private within the repository
 */
export declare const DEBUG_ALLOW_PAYED_TESTING: boolean;
/**
 * TODO: !!!!!! Check that all @private contains some normalized explanation
 */

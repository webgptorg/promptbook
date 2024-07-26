/**
 * The maximum number of iterations for a loops
 */
export const LOOP_LIMIT = 1000;

/**
 * The maximum number of iterations for a loops which adds characters one by one
 */
export const CHARACTER_LOOP_LIMIT = 100000;

/**
 * The name of the builded pipeline collection made by CLI `ptbk make` and for lookup in `createCollectionFromDirectory`
 */
export const PIPELINE_COLLECTION_BASE_FILENAME = `index`;

/**
 * The names of the parameters that are reserved for special purposes
 */
export const RESERVED_PARAMETER_NAMES = [
    'context',
    // <- TODO: Add more like 'date', 'modelName',...
    // <- TODO: Add [emoji] + instructions ACRY when adding new reserved parameter
];

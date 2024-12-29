import { exportJson } from './utils/serialization/exportJson';

/**
 * The names of the parameters that are reserved for special purposes
 *
 * @public exported from `@promptbook/core`
 */
export const RESERVED_PARAMETER_NAMES = exportJson({
    name: 'RESERVED_PARAMETER_NAMES',
    message: `The names of the parameters that are reserved for special purposes`,
    value: [
        'content',
        'context', // <- [🧠][🏍] Is parameter {context} good for anything?
        'knowledge',
        'examples',
        'modelName',
        'currentDate',

        // <- TODO: list here all command names
        // <- TODO: Add more like 'date', 'modelName',...
        // <- TODO: Add [emoji] + instructions ACRY when adding new reserved parameter
    ] as const,
});



/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
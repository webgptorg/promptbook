import type { PipelineJson } from './pipeline/PipelineJson/PipelineJson';
import type { ExportJsonOptions } from './utils/serialization/exportJson';
import { exportJson } from './utils/serialization/exportJson';

/**
 * Order of keys in the pipeline JSON
 *
 * @public exported from `@promptbook/core`
 */
export const ORDER_OF_PIPELINE_JSON: ExportJsonOptions<PipelineJson>['order'] = [
    // Note: [🍙] In this order will be pipeline serialized
    'title',
    'pipelineUrl',
    'bookVersion',
    'description',
    'formfactorName',
    'parameters',
    'tasks',
    'personas',
    'preparations',
    'knowledgeSources',
    'knowledgePieces',
    'sources', // <- TODO: [🧠] Where should the `sources` be
];

/**
 * Nonce which is used for replacing things in strings
 *
 * @private within the repository
 */
export const REPLACING_NONCE = 'ptbkauk42kV2dzao34faw7FudQUHYPtW';

/**
 * Placeholder value indicating a parameter is missing its value.
 *
 * @private within the repository
 */
export const RESERVED_PARAMETER_MISSING_VALUE = 'MISSING-' + REPLACING_NONCE;

/**
 * Placeholder value indicating a parameter is restricted and cannot be used directly.
 *
 * @private within the repository
 */
export const RESERVED_PARAMETER_RESTRICTED = 'RESTRICTED-' + REPLACING_NONCE;

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

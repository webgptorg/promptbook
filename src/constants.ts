import type { PipelineJson } from './pipeline/PipelineJson/PipelineJson';
import type { string_name } from './types/typeAliases';
import type { ExportJsonOptions } from './utils/serialization/exportJson';
import { exportJson } from './utils/serialization/exportJson';

/**
 * How is the model provider trusted?
 *
 * @public exported from `@promptbook/core`
 */
export const MODEL_TRUST_LEVELS = {
    FULL: `Model is running on the local machine, training data and model weights are known, data are ethically sourced`,
    OPEN: `Model is open source, training data and model weights are known`,
    PARTIALLY_OPEN: `Model is open source, but training data and model weights are not (fully) known`,
    CLOSED_LOCAL: `Model can be run locally, but it is not open source`,
    CLOSED_FREE: `Model is behind API gateway but free to use`,
    CLOSED_BUSINESS: `Model is behind API gateway and paid but has good SLA, TOS, privacy policy and in general is a good to use in business applications`,
    CLOSED: `Model is behind API gateway and paid`,
    UNTRUSTED: `Model has questions about the training data and ethics, but it is not known if it is a problem or not`,
    VURNABLE: `Model has some known serious vulnerabilities, leaks, ethical problems, etc.`,
} as const satisfies Record<string_name, string_name>;
// <- TODO: Maybe do better levels of trust

/**
 * How is the model provider important?
 *
 * @public exported from `@promptbook/core`
 */
export const MODEL_ORDERS = {
    /**
     * Top-tier models, e.g. OpenAI, Anthropic,...
     */
    TOP_TIER: 333,

    /**
     * Mid-tier models, e.g. Llama, Mistral, etc.
     */
    NORMAL: 100,

    /**
     * Low-tier models, e.g. Phi, Tiny, etc.
     */
    LOW_TIER: 0,
} as const satisfies Record<string_name, number>;

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
 * Nonce which is used as string which is not occurring in normal text
 *
 * @private within the repository
 */
export const SALT_NONCE = 'ptbkghhewbvruets21t54et5';

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

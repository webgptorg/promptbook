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
 * Limits for IDs, names, and other strings
 *
 * @public exported from `@promptbook/core`
 */
export const LIMITS = {
    /**
     * Minimum length of a name (e.g. agent name, persona name)
     */
    NAME_MIN_LENGTH: 3,

    /**
     * Recommended maximum length of a name
     */
    NAME_MAX_LENGTH: 20,

    /**
     * Maximum length of a short description or a hash
     */
    SHORT_TEXT_MAX_LENGTH: 30,

    /**
     * Gone
     */
    GONE: 410,

    /**
     * Gateway timeout
     */
    GATEWAY_TIMEOUT: 504,

    /**
     * Too many requests
     */
    TOO_MANY_REQUESTS: 429,

    /**
     * Maximum length of a file path segment
     */
    FILE_PATH_SEGMENT_MAX_LENGTH: 8,

    /**
     * Default length of a short name (e.g. for default agent names)
     */
    SHORT_NAME_LENGTH: 6,
} as const;

/**
 * Common time intervals in milliseconds
 *
 * @public exported from `@promptbook/core`
 */
export const TIME_INTERVALS = {

/**
     * Hundred milliseconds
     */
    HUNDRED_MILLISECONDS: 100,


    /**
     * One second in milliseconds
     */
    SECOND: 1000,

    /**
     * Two seconds in milliseconds
     */
    TWO_SECONDS: 2000,

    /**
     * One minute in milliseconds
     */
    MINUTE: 60000,

    /**
     * Thirty seconds in milliseconds
     */
    THIRTY_SECONDS: 30000,

    /**
     * Five seconds in milliseconds
     */
    FIVE_SECONDS: 5000,
} as const;

/**
 * Common ports and network limits
 *
 * @public exported from `@promptbook/core`
 */
export const NETWORK_LIMITS = {
    /**
     * Maximum valid port number
     */
    MAX_PORT: 65535,
} as const;

/**
 * Common color and image constants
 *
 * @public exported from `@promptbook/core`
 */
export const COLOR_CONSTANTS = {
    /**
     * Maximum value for a color channel (0-255)
     */
    MAX_CHANNEL_VALUE: 255,

    /**
     * Number of possible colors in 24-bit color (0xFFFFFF)
     */
    MAX_24BIT_COLOR: 16777215,

    /**
     * Base for hexadecimal strings
     */
    HEX_BASE: 16,

    /**
     * Length of a hex color without alpha (e.g. "FF0000")
     */
    HEX_COLOR_LENGTH: 6,

    /**
     * Full circle in degrees
     */
    FULL_CIRCLE_DEGREES: 360,

    /**
     * Half circle in degrees
     */
    HALF_CIRCLE_DEGREES: 180,
} as const;

/**
 * HTTP Status Codes
 *
 * @public exported from `@promptbook/core`
 */
export const HTTP_STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    TOO_MANY_REQUESTS: 429,
} as const;

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

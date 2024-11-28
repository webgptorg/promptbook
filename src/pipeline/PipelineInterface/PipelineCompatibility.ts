/**
 * Level of compatibility between two pipelines or pipeline interfaces
 *
 * - *(not implemented)* `IDENTICAL` - pipelines are identical
 * - *(not implemented)* `IDENTICAL_UNPREPARED` - pipelines are identical, but can be prepared differently (for example, with different embeddings)
 * - `IDENTICAL_INTERFACE` - pipelines have identical interfaces
 * - `IDENTICAL_NAMES` - pipelines have identical names in the interfaces
 * - `INTERSECTING` - pipelines have intersecting interfaces
 * - `NON_INTERSECTING` - pipelines have non-intersecting interfaces
 *
 * @see https://github.com/webgptorg/promptbook/discussions/171
 */
export type PipelineCompatibility =
    /*
    TODO: [😵] In future, we may want to add more detailed compatibility levels not just for interfaces, but for pipelines themselves
    | 'IDENTICAL'
    | 'IDENTICAL_UNPREPARED'
    */
    'IDENTICAL_INTERFACE' | 'IDENTICAL_NAMES' | 'INTERSECTING' | 'NON_INTERSECTING';

/**
 * TODO: [🧠][🤓] How to handle compatibility of optional parameters - for example summary in FORMFACTOR Translator
 */

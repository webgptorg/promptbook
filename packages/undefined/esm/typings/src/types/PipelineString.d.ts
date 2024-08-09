/**
 * Promptbook is the **core concept of this package**.
 * It represents a series of prompt templates chained together to form a pipeline / one big prompt template with input and result parameters.
 *
 * @see @@@ https://github.com/webgptorg/promptbook#promptbook
 */
export type PipelineString = string & {
    readonly _type: 'Promptbook';
};
/**
 * TODO: !! Better validation (validatePipelineString) or remove branded type and make it just string
 */

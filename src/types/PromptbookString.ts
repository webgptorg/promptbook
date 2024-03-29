/**
 * Promptbook is the **core concept of this library**.
 * It represents a series of prompt templates chained together to form a pipeline / one big prompt template with input and result parameters.
 *
 * @see https://github.com/webgptorg/promptbook#promptbook
 */
export type PromptbookString = string & {
    readonly _type: 'Promptbook' /* <- TODO: [🏟] What is the best shape of the additional object in branded types */;
};

/**
 * TODO: !! Better validation (validatePromptbookString) or remove branded type and make it just string
 */

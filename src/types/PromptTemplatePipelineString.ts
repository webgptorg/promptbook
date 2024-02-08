/**
 * Prompt template pipeline is the **core concept of this library**.
 * It represents a series of prompt templates chained together to form a pipeline / one big prompt template with input and result parameters.
 *
 * It can have 3 formats:
 * -   _(this)_ **.ptbk.md file** in custom markdown format described above
 * -   **JSON** format, parsed from the .ptbk.md file
 *
 * @see https://github.com/webgptorg/promptbook#prompt-template-pipeline
 */
export type PromptTemplatePipelineString = string & {
    readonly _type: 'PromptTemplatePipeline' /* <- TODO: [🏟] What is the best shape of the additional object in branded types */;
};


/**
 * TODO: !! Better validation (validatePromptTemplatePipelineString) or remove branded type and make it just string
 */
/**
 * Prompt template pipeline is the **core concept of this library**.
 * It represents a series of prompt templates chained together to form a pipeline / one big prompt template with input and result parameters.
 *
 * It can have 3 formats:
 * -   _(this)_ **.ptp.md file** in custom markdown format described above
 * -   **JSON** format, parsed from the .ptp.md file
 * -   **Object** which is created from JSON format and bound with tools around (but not the execution logic)
 *
 * @see https://github.com/webgptorg/ptp#prompt-template-pipeline
 */
export type PromptTemplatePipelineString = string & {
    readonly __type: 'PromptTemplatePipeline' /* <- TODO: [0] What is the best shape of the additional object in branded types */;
};

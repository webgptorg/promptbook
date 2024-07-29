import type { string_markdown_text } from '../typeAliases';
import type { string_name } from '../typeAliases';

/**
 * Describes one parameter of the promptbook
 */
export type PromptTemplateParameterJson = {
    /**
     * Name of the parameter
     * - It must be unique across the pipeline
     * - It should start lowercase and contain letters and numbers
     */
    readonly name: string_name;

    /**
     * The parameter is input of the pipeline
     */
    readonly isInput: boolean;

    /**
     * The parameter is output of the pipeline
     */
    readonly isOutput: boolean;

    /**
     * Description of the parameter
     * - It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly description?: string_markdown_text;
};



/**
 * TODO: [♈] Probbably move expectations from templates to parameters
 */
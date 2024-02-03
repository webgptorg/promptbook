import { string_name } from '../.././types/typeAliases';

/**
 * Describes one parameter of the prompt template pipeline
 */
export interface PromptTemplateParameterJson {
    /**
     * Name of the parameter
     * - It must be unique across the pipeline
     * - It should start lowercase and contain letters and numbers
     */
    readonly name: string_name;

    /**
     * The parameter is input of the pipeline
     *
     * Note: OUTPUT PARAMETER is every parameter including input one
     */
    readonly isInput: boolean;

    /**
     * Description of the parameter
     * - It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly description?: string;
}

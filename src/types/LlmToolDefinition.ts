import type { string_markdown_text, string_name } from './typeAliases';

/**
 * Definition of a tool that can be used by the model
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type LlmToolDefinition = {
    /**
     * Name of the tool
     */
    readonly name: string_name;

    /**
     * Description of the tool
     */
    readonly description: string_markdown_text;

    /**
     * Parameters of the tool in JSON Schema format
     */
    readonly parameters: Record<string, unknown>;
};

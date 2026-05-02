import type { string_markdown_text, string_name } from './typeAliases';

/**
 * Minimal recursive JSON Schema entry used by tool definitions.
 *
 * Note: [🚉] This is fully serializable as JSON
 */
type LlmToolJsonSchema = {
    type?: string;
    description?: string;
    properties?: Record<string, LlmToolJsonSchema>;
    required?: string[];
    items?: LlmToolJsonSchema;
    enum?: Array<string | number | boolean | null>;
    additionalProperties?: boolean;
};

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
    readonly parameters: LlmToolJsonSchema & {
        readonly type: 'object';
        readonly properties: Record<string, LlmToolJsonSchema>;
    };
};

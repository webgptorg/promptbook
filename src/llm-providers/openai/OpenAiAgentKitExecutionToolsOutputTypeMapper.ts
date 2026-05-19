import type OpenAI from 'openai';
import type { TODO_any } from '../../utils/organization/TODO_any';

/**
 * Type describing Json schema definition entry.
 */
type JsonSchemaDefinitionEntry = {
    type?: string;
    description?: string;
    properties?: Record<string, JsonSchemaDefinitionEntry>;
    required?: Array<string>;
    items?: JsonSchemaDefinitionEntry;
    [key: string]: TODO_any;
};

/**
 * Definition of Json schema.
 */
type JsonSchemaDefinition = {
    type: 'json_schema';
    name: string;
    strict: boolean;
    schema: {
        type: 'object';
        properties: Record<string, JsonSchemaDefinitionEntry>;
        required: Array<string>;
        additionalProperties: boolean;
        description?: string;
    };
};

/**
 * JSON schema inputs accepted by AgentKit normalization helpers.
 *
 * Supports both OpenAI's `{ name, strict, schema }` shape and shorthand schemas
 * where the object definition is provided directly.
 */
type JsonSchemaDefinitionInput = {
    name?: string;
    strict?: boolean | null;
    schema?: {
        description?: string;
        additionalProperties?: boolean;
        properties?: Record<string, JsonSchemaDefinitionEntry>;
        required?: Array<string>;
    };
    type?: string;
    description?: string;
    additionalProperties?: boolean;
    properties?: Record<string, JsonSchemaDefinitionEntry>;
    required?: Array<string>;
};

/**
 * Type describing open Ai chat response format.
 */
type OpenAiChatResponseFormat = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming['response_format'];

/**
 * Constant for default JSON schema name.
 */
const DEFAULT_JSON_SCHEMA_NAME = 'StructuredOutput';

/**
 * Maps OpenAI `response_format` payloads to AgentKit output types.
 *
 * @private helper of `OpenAiAgentKitExecutionTools`
 */
export class OpenAiAgentKitExecutionToolsOutputTypeMapper {
    /**
     * Maps one OpenAI `response_format` payload to the AgentKit output type shape.
     */
    public static mapResponseFormatToAgentOutputType(
        responseFormat?: OpenAiChatResponseFormat,
    ): 'text' | JsonSchemaDefinition | undefined {
        if (!responseFormat) {
            return undefined;
        }

        if (typeof responseFormat === 'string') {
            if (responseFormat === 'text') {
                return 'text';
            }
            if (responseFormat === 'json_schema' || responseFormat === 'json_object') {
                return this.buildJsonSchemaDefinition();
            }
            return 'text';
        }

        switch (responseFormat.type) {
            case 'text':
                return 'text';
            case 'json_schema':
                return this.buildJsonSchemaDefinition(responseFormat.json_schema);
            case 'json_object':
                return this.buildJsonSchemaDefinition();
            default:
                return undefined;
        }
    }

    /**
     * Determines whether a schema fragment includes meaningful constraints.
     */
    private static hasJsonSchemaContent(schema?: {
        description?: string;
        additionalProperties?: boolean;
        properties?: Record<string, JsonSchemaDefinitionEntry>;
        required?: Array<string>;
    }): boolean {
        if (!schema) {
            return false;
        }

        if (typeof schema.description === 'string' && schema.description.trim() !== '') {
            return true;
        }

        if (schema.additionalProperties !== undefined) {
            return true;
        }

        if (schema.properties && Object.keys(schema.properties).length > 0) {
            return true;
        }

        if (Array.isArray(schema.required) && schema.required.length > 0) {
            return true;
        }

        return false;
    }

    /**
     * Normalizes inline OpenAI JSON schema payloads to the AgentKit structure.
     */
    private static normalizeJsonSchemaInput(jsonSchema?: JsonSchemaDefinitionInput | null): {
        name?: string;
        strict?: boolean | null;
        schema: {
            description?: string;
            additionalProperties?: boolean;
            properties?: Record<string, JsonSchemaDefinitionEntry>;
            required?: Array<string>;
        };
        hasSchema: boolean;
    } {
        if (!jsonSchema || typeof jsonSchema !== 'object') {
            return { schema: {}, hasSchema: false };
        }

        const explicitSchema = jsonSchema.schema;
        if (explicitSchema && typeof explicitSchema === 'object') {
            return {
                name: jsonSchema.name,
                strict: jsonSchema.strict,
                schema: explicitSchema,
                hasSchema: this.hasJsonSchemaContent(explicitSchema),
            };
        }

        const inlineSchema = {
            description: jsonSchema.description,
            additionalProperties: jsonSchema.additionalProperties,
            properties: jsonSchema.properties,
            required: jsonSchema.required,
        };
        const hasInlineSchema =
            this.hasJsonSchemaContent(inlineSchema) ||
            (typeof jsonSchema.type === 'string' && jsonSchema.type === 'object');

        return {
            name: jsonSchema.name,
            strict: jsonSchema.strict,
            schema: hasInlineSchema ? inlineSchema : {},
            hasSchema: hasInlineSchema,
        };
    }

    /**
     * Builds an AgentKit-compatible JSON schema definition from the supplied payload.
     */
    private static buildJsonSchemaDefinition(jsonSchema?: JsonSchemaDefinitionInput): JsonSchemaDefinition {
        const normalizedSchema = this.normalizeJsonSchemaInput(jsonSchema);
        const schema = normalizedSchema.schema ?? {};
        const strict =
            normalizedSchema.strict === undefined || normalizedSchema.strict === null
                ? normalizedSchema.hasSchema
                : Boolean(normalizedSchema.strict);

        return {
            type: 'json_schema',
            name: normalizedSchema.name ?? DEFAULT_JSON_SCHEMA_NAME,
            strict,
            schema: {
                type: 'object',
                properties: (schema.properties ?? {}) as Record<string, JsonSchemaDefinitionEntry>,
                required: Array.isArray(schema.required) ? schema.required : [],
                additionalProperties:
                    schema.additionalProperties === undefined ? true : Boolean(schema.additionalProperties),
                description: schema.description,
            },
        };
    }
}

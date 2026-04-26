import { spaceTrim } from 'spacetrim';

/**
 * Formats a JSON-schema fragment into a Zod expression for generated transpiled code.
 *
 * The Claude Code and AgentOS transpilers both need the same JSON-schema-to-Zod conversion,
 * but Claude Code needs raw Zod shapes while AgentOS needs wrapped `z.object(...)` schemas.
 *
 * @param schema - JSON-schema fragment used for one tool input definition.
 * @returns Zod expression source ready to embed in generated JavaScript.
 *
 * @private shared between Claude and AgentOS transpilers
 */
export function createZodSchemaSource(schema: JsonSchemaLike): string {
    if (schema.type === 'object' || schema.properties) {
        const objectSource = `z.object(${createZodShapeSource(schema)})${schema.additionalProperties === false ? '.strict()' : '.passthrough()'}`;
        return appendZodDescription(objectSource, schema.description);
    }

    return appendZodDescription(createZodTypeSource(schema), schema.description);
}

/**
 * Formats a JSON-schema fragment into a raw Zod shape object literal.
 *
 * Claude Code SDK custom tools expect a Zod raw shape instead of a wrapped `z.object(...)`
 * expression, so this helper reuses the same conversion logic but returns only the object literal
 * body.
 *
 * @param schema - JSON-schema fragment used for one tool input definition.
 * @returns Raw Zod shape source ready to embed in `tool(...)`.
 *
 * @private shared between Claude and AgentOS transpilers
 */
export function createZodShapeSource(schema: JsonSchemaLike): string {
    if (schema.type === 'object' || schema.properties) {
        const propertyNames = Object.keys(schema.properties || {});
        const requiredPropertyNames = new Set((schema.required || []).map((propertyName) => propertyName.trim()));

        const propertySources = propertyNames.map((propertyName) => {
            const propertySchema = schema.properties?.[propertyName] || {};
            const propertySource = createZodTypeSource(propertySchema);
            const isRequired = requiredPropertyNames.has(propertyName);
            const resolvedPropertySource = isRequired ? propertySource : `${propertySource}.optional()`;

            return `${JSON.stringify(propertyName)}: ${resolvedPropertySource}`;
        });

        return spaceTrim(
            (block) => `
                {
                    ${block(propertySources.join(',\n'))}
                }
            `,
        );
    }

    return spaceTrim(
        (block) => `
            {
                value: ${block(createZodTypeSource(schema))}
            }
        `,
    );
}

/**
 * Formats one JSON-schema fragment as a standalone Zod expression.
 *
 * @param schema - JSON-schema fragment used for one tool input definition.
 * @returns Zod expression source for a nested property or a top-level fallback.
 *
 * @private shared between Claude and AgentOS transpilers
 */
function createZodTypeSource(schema: JsonSchemaLike): string {
    if (schema.type === 'array') {
        const itemSchema = schema.items || {};
        return appendZodDescription(`z.array(${createZodTypeSource(itemSchema)})`, schema.description);
    }

    if (schema.type === 'integer') {
        return appendZodDescription('z.number().int()', schema.description);
    }

    if (schema.type === 'number') {
        return appendZodDescription('z.number()', schema.description);
    }

    if (schema.type === 'boolean') {
        return appendZodDescription('z.boolean()', schema.description);
    }

    if (schema.type === 'null') {
        return appendZodDescription('z.null()', schema.description);
    }

    if (schema.type === 'string') {
        return appendZodDescription('z.string()', schema.description);
    }

    if (Array.isArray(schema.enum) && schema.enum.length > 0) {
        const literals = schema.enum.map((value) => `z.literal(${JSON.stringify(value)})`);
        const enumSource = literals.length === 1 ? literals[0]! : `z.union([${literals.join(', ')}])`;
        return appendZodDescription(enumSource, schema.description);
    }

    if (schema.type === 'object' || schema.properties) {
        return createZodSchemaSource(schema);
    }

    return appendZodDescription('z.any()', schema.description);
}

/**
 * Adds a description to one Zod expression when the schema contains one.
 *
 * @param zodSource - Zod expression source.
 * @param description - Optional schema description.
 * @returns Zod expression with a trailing `.describe()` call when appropriate.
 *
 * @private shared between Claude and AgentOS transpilers
 */
function appendZodDescription(zodSource: string, description?: string): string {
    const normalizedDescription = description?.trim();

    if (!normalizedDescription) {
        return zodSource;
    }

    return `${zodSource}.describe(${JSON.stringify(normalizedDescription)})`;
}

/**
 * Minimal JSON-schema shape used by the transpiled Claude and AgentOS harness generators.
 *
 * @private shared between Claude and AgentOS transpilers
 */
type JsonSchemaLike = {
    readonly type?: string;
    readonly description?: string;
    readonly properties?: Record<string, JsonSchemaLike>;
    readonly required?: ReadonlyArray<string>;
    readonly items?: JsonSchemaLike;
    readonly enum?: ReadonlyArray<string | number | boolean | null>;
    readonly additionalProperties?: boolean;
};

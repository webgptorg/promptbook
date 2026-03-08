import type { string_book } from '../../book-2.0/agent-source/string_book';
import { LimitReachedError } from '../../errors/LimitReachedError';
import { ParseError } from '../../errors/ParseError';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import { spaceTrim } from '../../utils/organization/spaceTrim';

/**
 * Supported visibility options for agent creation.
 *
 * @private shared create-agent contract
 */
export const CREATE_AGENT_VISIBILITY_VALUES = ['PRIVATE', 'UNLISTED', 'PUBLIC'] as const;

/**
 * Supported visibility options for agent creation.
 *
 * @private shared create-agent contract
 */
export type CreateAgentVisibility = (typeof CREATE_AGENT_VISIBILITY_VALUES)[number];

/**
 * Canonical input payload for creating one persisted agent entity.
 *
 * @private shared create-agent contract
 */
export type CreateAgentInput = {
    /**
     * Full agent source in Promptbook format (book/markdown/yaml text accepted by parser).
     */
    readonly source: string_book;
    /**
     * Optional folder placement in Agents Server organization.
     */
    readonly folderId?: number | null;
    /**
     * Optional sort order within the selected folder.
     */
    readonly sortOrder?: number;
    /**
     * Optional visibility override.
     */
    readonly visibility?: CreateAgentVisibility;
};

/**
 * Maximum allowed source length for create-agent payloads.
 *
 * @private shared create-agent contract
 */
export const CREATE_AGENT_INPUT_SOURCE_MAX_LENGTH = 120000;

/**
 * Strict list of accepted create-agent payload keys.
 *
 * @private utility of `parseCreateAgentInput`
 */
const CREATE_AGENT_INPUT_ALLOWED_KEYS = ['source', 'folderId', 'sortOrder', 'visibility'] as const;

/**
 * Parses and validates unknown data into strict `CreateAgentInput`.
 *
 * - Requires `source`.
 * - Rejects unknown fields.
 * - Enforces source-size limits.
 *
 * @private shared create-agent contract
 */
export function parseCreateAgentInput(rawValue: unknown): CreateAgentInput {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
        throw new ParseError(
            spaceTrim(`
                Invalid create-agent payload.

                Payload must be a JSON object.
            `),
        );
    }

    const rawRecord = rawValue as Record<string, unknown>;
    const unknownKeys = Object.keys(rawRecord).filter(
        (key) => !CREATE_AGENT_INPUT_ALLOWED_KEYS.includes(key as (typeof CREATE_AGENT_INPUT_ALLOWED_KEYS)[number]),
    );

    if (unknownKeys.length > 0) {
        throw new ParseError(
            spaceTrim(`
                Invalid create-agent payload.

                Unknown field(s): ${unknownKeys.map((key) => `\`${key}\``).join(', ')}.
            `),
        );
    }

    const source = parseSource(rawRecord.source);
    const folderId = parseOptionalFolderId(rawRecord.folderId);
    const sortOrder = parseOptionalSortOrder(rawRecord.sortOrder);
    const visibility = parseOptionalVisibility(rawRecord.visibility);

    return {
        source,
        ...(folderId !== undefined ? { folderId } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(visibility !== undefined ? { visibility } : {}),
    };
}

/**
 * Builds strict JSON schema for create-agent tool parameters.
 *
 * @private shared create-agent contract
 */
export function createCreateAgentInputToolParametersSchema(): LlmToolDefinition['parameters'] {
    return {
        type: 'object',
        additionalProperties: false,
        properties: {
            source: {
                type: 'string',
                description: 'Full source of the new persisted agent (Promptbook/book markdown).',
            },
            folderId: {
                type: 'number',
                description: 'Optional folder identifier where the new agent should be placed.',
            },
            sortOrder: {
                type: 'number',
                description: 'Optional sort order inside the selected folder.',
            },
            visibility: {
                type: 'string',
                description: 'Optional visibility: PRIVATE, UNLISTED, or PUBLIC.',
            },
        },
        required: ['source'],
    };
}

/**
 * Validates the required `source` value.
 *
 * @private utility of `parseCreateAgentInput`
 */
function parseSource(rawValue: unknown): string_book {
    if (typeof rawValue !== 'string') {
        throw new ParseError(
            spaceTrim(`
                Invalid create-agent payload.

                Missing required field \`source\`.
            `),
        );
    }

    if (rawValue.trim() === '') {
        throw new ParseError(
            spaceTrim(`
                Invalid create-agent payload.

                Field \`source\` must not be empty.
            `),
        );
    }

    if (rawValue.length > CREATE_AGENT_INPUT_SOURCE_MAX_LENGTH) {
        throw new LimitReachedError(
            spaceTrim(`
                Create-agent payload is too large.

                Field \`source\` exceeds ${CREATE_AGENT_INPUT_SOURCE_MAX_LENGTH} characters.
            `),
        );
    }

    return rawValue as string_book;
}

/**
 * Validates optional `folderId`.
 *
 * @private utility of `parseCreateAgentInput`
 */
function parseOptionalFolderId(rawValue: unknown): number | null | undefined {
    if (rawValue === undefined) {
        return undefined;
    }

    if (rawValue === null) {
        return null;
    }

    if (typeof rawValue !== 'number' || !Number.isInteger(rawValue)) {
        throw new ParseError(
            spaceTrim(`
                Invalid create-agent payload.

                Field \`folderId\` must be an integer or \`null\`.
            `),
        );
    }

    return rawValue;
}

/**
 * Validates optional `sortOrder`.
 *
 * @private utility of `parseCreateAgentInput`
 */
function parseOptionalSortOrder(rawValue: unknown): number | undefined {
    if (rawValue === undefined) {
        return undefined;
    }

    if (typeof rawValue !== 'number' || !Number.isInteger(rawValue)) {
        throw new ParseError(
            spaceTrim(`
                Invalid create-agent payload.

                Field \`sortOrder\` must be an integer.
            `),
        );
    }

    return rawValue;
}

/**
 * Validates optional `visibility`.
 *
 * @private utility of `parseCreateAgentInput`
 */
function parseOptionalVisibility(rawValue: unknown): CreateAgentVisibility | undefined {
    if (rawValue === undefined) {
        return undefined;
    }

    if (typeof rawValue !== 'string') {
        throw new ParseError(
            spaceTrim(`
                Invalid create-agent payload.

                Field \`visibility\` must be one of: ${CREATE_AGENT_VISIBILITY_VALUES.join(', ')}.
            `),
        );
    }

    const isSupportedVisibility = CREATE_AGENT_VISIBILITY_VALUES.includes(rawValue as CreateAgentVisibility);
    if (!isSupportedVisibility) {
        throw new ParseError(
            spaceTrim(`
                Invalid create-agent payload.

                Field \`visibility\` must be one of: ${CREATE_AGENT_VISIBILITY_VALUES.join(', ')}.
            `),
        );
    }

    return rawValue as CreateAgentVisibility;
}

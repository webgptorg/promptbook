/**
 * Branded type for agent source strings
 *
 * This ensures type safety when working with agent source data throughout the application.
 * Agent source strings contain structured data in a specific format:
 * - First line: Agent name
 * - PERSONA line: Agent persona/description (optional)
 * - META IMAGE line: Profile image URL (optional)
 * - Remaining content: System message (after removing META IMAGE line)
 */
export type string_agent_source = string & { readonly __brand: 'agent_source' };

/**
 * Type guard to check if a string is a valid agent source
 *
 * @public exported from `@promptbook/core`
 */
export function isAgentSource(value: string): value is string_agent_source {
    // Basic validation - agent source should have at least a name (first line)
    return typeof value === 'string' /* && value.trim().length > 0 */;
}

/**
 * Creates a branded agent source string from a regular string
 * Performs basic validation to ensure the string is suitable as agent source
 *
 * @private
 * @deprecated Use `validateAgentSource` instead - these functions are now equivalent
 */
export function createAgentSource(source: string): string_agent_source {
    if (!isAgentSource(source)) {
        throw new Error('Invalid agent source: must be a non-empty string');
    }
    return source as string_agent_source;
}

/**
 * Safely converts a string to agent source with fallback
 *
 * @private
 * @deprecated Use `validateAgentSource` instead - these functions are now equivalent
 */
export function toAgentSource(source: string, fallback: string = 'Your Avatar'): string_agent_source {
    if (isAgentSource(source)) {
        return source as string_agent_source;
    }
    return createAgentSource(fallback);
}

/**
 * Validates and converts a string to agent source branded type
 * This function should be used when you have a string that you know represents agent source
 * but need to convert it to the branded type for type safety
 *
 * @public exported from `@promptbook/core`
 */
export function validateAgentSource(source: string): string_agent_source {
    if (!isAgentSource(source)) {
        throw new Error('Invalid agent source: must be a non-empty string');
    }
    return source as string_agent_source;
}

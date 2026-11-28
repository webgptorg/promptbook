/**
 * Supported Enter-key behaviors exposed by the Agents Server UI.
 */
export type AgentsServerChatEnterBehavior = 'SEND' | 'NEWLINE';

/**
 * Returns true when the supplied value is one of the supported Enter behaviors.
 */
export function isAgentsServerChatEnterBehavior(value: unknown): value is AgentsServerChatEnterBehavior {
    return value === 'SEND' || value === 'NEWLINE';
}

/**
 * Resolves the inverse action performed by `Ctrl+Enter`.
 */
export function invertAgentsServerChatEnterBehavior(
    enterBehavior: AgentsServerChatEnterBehavior,
): AgentsServerChatEnterBehavior {
    return enterBehavior === 'SEND' ? 'NEWLINE' : 'SEND';
}

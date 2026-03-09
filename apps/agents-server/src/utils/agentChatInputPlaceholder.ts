/**
 * Default placeholder text used when no custom commitment is provided.
 */
export const DEFAULT_AGENT_CHAT_INPUT_PLACEHOLDER = 'Write a message...';

/**
 * Resolves effective chat-input placeholder from optional META commitment value.
 *
 * @param inputPlaceholder - Optional `META INPUT PLACEHOLDER` value.
 * @returns Trimmed custom placeholder or the shared default text.
 */
export function resolveAgentChatInputPlaceholder(inputPlaceholder: string | undefined): string {
    const trimmedInputPlaceholder = inputPlaceholder?.trim();

    if (!trimmedInputPlaceholder) {
        return DEFAULT_AGENT_CHAT_INPUT_PLACEHOLDER;
    }

    return trimmedInputPlaceholder;
}

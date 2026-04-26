/**
 * Default Claude model used when the source Book does not already target Claude.
 *
 * @private shared between Claude transpilers
 */
const DEFAULT_CLAUDE_MODEL_NAME = 'claude-sonnet-4-20250514';

/**
 * Resolves a Claude model name compatible with generated Claude-based harnesses.
 *
 * The Promptbook Book can still specify a non-Claude model, but Claude-based transpilers
 * need a Claude-compatible default so the generated harness remains runnable.
 *
 * @param modelName - Model requested by the Book source.
 * @returns Claude-compatible model name for the generated export.
 *
 * @private shared between Claude transpilers
 */
export function resolveClaudeModelName(modelName?: string): string {
    if (typeof modelName === 'string' && modelName.trim().startsWith('claude')) {
        return modelName.trim();
    }

    return DEFAULT_CLAUDE_MODEL_NAME;
}


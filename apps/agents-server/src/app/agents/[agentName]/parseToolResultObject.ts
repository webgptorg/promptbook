/**
 * Parses a tool result payload into an object when possible.
 *
 * @private function of AgentChatWrapper
 */
export function parseToolResultObject(result: unknown): Record<string, unknown> | null {
    if (!result) {
        return null;
    }

    if (typeof result === 'object') {
        return result as Record<string, unknown>;
    }

    if (typeof result !== 'string') {
        return null;
    }

    try {
        const parsed = JSON.parse(result);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        return parsed as Record<string, unknown>;
    } catch {
        return null;
    }
}

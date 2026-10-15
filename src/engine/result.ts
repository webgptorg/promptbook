/**
 * Marker the agent writes at the end of its final message.
 *
 * @private completion protocol
 */
export const RESULT_MARKER = 'PTBK_RESULT';

/**
 * Completion report of one agent turn.
 *
 * @private completion protocol
 */
export type AgentReport = {
    /** Reported state. */
    readonly status: 'done' | 'blocked' | 'waiting-for-user';
    /** One-sentence summary. */
    readonly summary: string;
    /** How the requested outcome was verified. */
    readonly evidence?: string;
    /** Reason for `blocked`. */
    readonly reason?: string;
    /** Additional structured fields (e.g. Manager routing). */
    readonly data: Readonly<Record<string, unknown>>;
};

/**
 * Extracts the last valid completion report from agent messages.
 *
 * Returns `undefined` when no valid report exists (unmet acceptance evidence).
 *
 * @private completion protocol
 */
export function parseAgentReport(messages: readonly string[]): AgentReport | undefined {
    for (let index = messages.length - 1; index >= 0; index--) {
        const text = messages[index]!;
        const positions: number[] = [];
        let position = text.indexOf(RESULT_MARKER);
        while (position >= 0) {
            positions.push(position);
            position = text.indexOf(RESULT_MARKER, position + 1);
        }
        for (const start of positions.reverse()) {
            const json = extractJsonObject(text.slice(start + RESULT_MARKER.length));
            if (!json) continue;
            const status = json.status;
            if (status !== 'done' && status !== 'blocked' && status !== 'waiting-for-user') continue;
            return {
                status,
                summary: typeof json.summary === 'string' ? json.summary : '',
                evidence: typeof json.evidence === 'string' ? json.evidence : undefined,
                reason: typeof json.reason === 'string' ? json.reason : undefined,
                data: json,
            };
        }
    }
    return undefined;
}

/**
 * Extracts the first balanced JSON object from text.
 */
function extractJsonObject(text: string): Record<string, unknown> | undefined {
    const start = text.indexOf('{');
    if (start < 0 || text.slice(0, start).trim().replace(/[`:]/g, '') !== '') return undefined;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index++) {
        const character = text[index]!;
        if (inString) {
            if (escaped) escaped = false;
            else if (character === '\\') escaped = true;
            else if (character === '"') inString = false;
            continue;
        }
        if (character === '"') inString = true;
        else if (character === '{') depth++;
        else if (character === '}') {
            depth--;
            if (depth === 0) {
                try {
                    const value = JSON.parse(text.slice(start, index + 1)) as unknown;
                    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
                } catch {
                    return undefined;
                }
            }
        }
    }
    return undefined;
}

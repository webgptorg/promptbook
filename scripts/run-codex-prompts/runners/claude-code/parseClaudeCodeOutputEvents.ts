/**
 * One parsed JSON event emitted by the Claude Code `--output-format stream-json` mode.
 */
export type ClaudeCodeOutputEvent = {
    readonly type?: string;
    readonly subtype?: string;
    readonly is_error?: boolean;
    readonly api_error_status?: number;
    readonly result?: string;
    readonly session_id?: string;
    readonly error?: string;
    readonly rate_limit_info?: {
        readonly status?: string;
        readonly resetsAt?: number;
        readonly rateLimitType?: string;
    };
    readonly usage?: {
        readonly input_tokens?: number;
        readonly cache_creation_input_tokens?: number;
        readonly cache_read_input_tokens?: number;
        readonly output_tokens?: number;
        readonly server_tool_use?: {
            readonly web_search_requests?: number;
            readonly web_fetch_requests?: number;
        };
        readonly service_tier?: string;
        readonly cache_creation?: {
            readonly ephemeral_1h_input_tokens?: number;
            readonly ephemeral_5m_input_tokens?: number;
        };
    };
    readonly total_cost_usd?: number;
    readonly message?: {
        readonly content?: ReadonlyArray<{
            readonly type?: string;
            readonly text?: string;
        }>;
    };
};

/**
 * Parses all JSON lines from Claude Code output while ignoring shell prefixes and stack traces.
 */
export function parseClaudeCodeOutputEvents(output: string): readonly ClaudeCodeOutputEvent[] {
    return output
        .split(/\r?\n/u)
        .map(parseClaudeCodeOutputLine)
        .filter((event): event is ClaudeCodeOutputEvent => event !== undefined);
}

/**
 * Finds the final Claude Code result event in a stream-json output blob.
 */
export function findClaudeCodeResultEvent(output: string): ClaudeCodeOutputEvent | undefined {
    return parseClaudeCodeOutputEvents(output).find((event) => event.type === 'result');
}

/**
 * Parses one output line when it contains a JSON object.
 */
function parseClaudeCodeOutputLine(line: string): ClaudeCodeOutputEvent | undefined {
    const jsonStartIndex = line.indexOf('{');

    if (jsonStartIndex === -1) {
        return undefined;
    }

    const possibleJson = line.slice(jsonStartIndex).trim();

    try {
        const parsed = JSON.parse(possibleJson) as unknown;

        if (isClaudeCodeOutputEvent(parsed)) {
            return parsed;
        }
    } catch {
        return undefined;
    }

    return undefined;
}

/**
 * Checks whether an unknown parsed JSON value has the object shape expected from Claude Code events.
 */
function isClaudeCodeOutputEvent(value: unknown): value is ClaudeCodeOutputEvent {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

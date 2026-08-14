/**
 * One string-keyed payload of a coding-harness tool invocation.
 *
 * @private internal type of agent-message runtime logs
 */
type RuntimeLogToolInput = Record<string, unknown>;

/**
 * One content block of a Claude Code `stream-json` assistant event.
 *
 * @private internal type of agent-message runtime logs
 */
export type AgentMessageRuntimeLogContentBlock = {
    readonly type?: string;
    readonly text?: string;
    readonly name?: string;
    readonly input?: RuntimeLogToolInput;
};

/**
 * One file path touched by a Codex `file_change` item.
 *
 * @private internal type of agent-message runtime logs
 */
export type AgentMessageRuntimeLogFileChange = {
    readonly path?: string;
};

/**
 * Minimal shape of one coding-harness runtime log event.
 *
 * The runtime log mixes two harness formats — Claude Code `stream-json` (`type`/`message`) and
 * Codex JSONL (`type`/`item`) — so both are described by one permissive structure and every
 * consumer reads only the fields it understands.
 *
 * @private internal type of agent-message runtime logs
 */
export type AgentMessageRuntimeLogEvent = {
    readonly type?: string;
    readonly message?: {
        readonly content?: ReadonlyArray<AgentMessageRuntimeLogContentBlock>;
    };
    readonly item?: {
        readonly type?: string;
        readonly command?: string;
        readonly exit_code?: number | null;
        readonly changes?: ReadonlyArray<AgentMessageRuntimeLogFileChange>;
    };
};

/**
 * Parses every structured event out of one coding-harness runtime log.
 *
 * The local agent runner streams the answering harness output into a live runtime log file, one
 * JSON event per line, optionally prefixed by shell noise. Lines without a usable JSON object are
 * skipped so a partially written or interleaved log never breaks its consumers.
 *
 * @param logText - Raw runtime log content.
 * @returns Structured events in the order they were streamed.
 * @private internal utility of the agent-message runtime
 */
export function parseAgentMessageRuntimeLogEvents(
    logText: string | null | undefined,
): ReadonlyArray<AgentMessageRuntimeLogEvent> {
    if (!logText) {
        return [];
    }

    const events: Array<AgentMessageRuntimeLogEvent> = [];

    for (const line of logText.split(/\r?\n/u)) {
        const event = parseAgentMessageRuntimeLogEvent(line);

        if (event) {
            events.push(event);
        }
    }

    return events;
}

/**
 * Parses one runtime log line into a structured event when it embeds JSON.
 *
 * @param line - One raw runtime log line.
 * @returns Structured event, or `null` when the line carries no JSON object.
 * @private internal helper of `parseAgentMessageRuntimeLogEvents`
 */
function parseAgentMessageRuntimeLogEvent(line: string): AgentMessageRuntimeLogEvent | null {
    const jsonStartIndex = line.indexOf('{');
    if (jsonStartIndex === -1) {
        return null;
    }

    try {
        const parsedEvent = JSON.parse(line.slice(jsonStartIndex).trim()) as unknown;
        if (typeof parsedEvent !== 'object' || parsedEvent === null || Array.isArray(parsedEvent)) {
            return null;
        }

        return parsedEvent as AgentMessageRuntimeLogEvent;
    } catch {
        return null;
    }
}

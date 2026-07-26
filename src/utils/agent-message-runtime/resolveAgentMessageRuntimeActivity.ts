/**
 * Maximum length of one user-facing progress activity snippet.
 *
 * @private internal constant of agent-message runtime activity
 */
const MAX_RUNTIME_ACTIVITY_LENGTH = 160;

/**
 * Minimal shape of one coding-harness `stream-json` event relevant to progress extraction.
 *
 * Only the natural-language assistant narration is read; every other field is ignored so raw
 * tool payloads and technical envelopes never reach the user-facing progress card.
 *
 * @private internal type of agent-message runtime activity
 */
type RuntimeLogEvent = {
    readonly type?: string;
    readonly message?: {
        readonly content?: ReadonlyArray<{
            readonly type?: string;
            readonly text?: string;
        }>;
    };
};

/**
 * Resolves the latest user-friendly activity snippet from a coding-harness runtime log.
 *
 * The Agents Server local agent runner streams the answering harness output (for example
 * Claude Code `--output-format stream-json`) into a live runtime log file next to the queued
 * message. This helper extracts the most recent natural-language assistant narration so the
 * durable chat can show what the agent is doing right now instead of a generic thinking
 * placeholder. Only plain assistant text is surfaced; raw tool payloads, JSON envelopes and
 * other technical details are intentionally ignored, and harnesses that do not stream
 * structured text simply resolve to `null` so the caller keeps its existing behavior.
 *
 * @param logText - Raw runtime log content.
 * @returns Latest human-readable activity snippet, or `null` when none can be resolved.
 * @private internal utility of the agent-message runtime
 */
export function resolveAgentMessageRuntimeActivity(logText: string | null | undefined): string | null {
    if (!logText) {
        return null;
    }

    let latestActivity: string | null = null;

    for (const line of logText.split(/\r?\n/u)) {
        const event = parseRuntimeLogEvent(line);
        if (!event) {
            continue;
        }

        const activity = resolveRuntimeLogEventActivity(event);
        if (activity) {
            latestActivity = activity;
        }
    }

    return latestActivity === null ? null : truncateRuntimeActivity(latestActivity);
}

/**
 * Parses one runtime log line into a structured event when it embeds JSON.
 *
 * @private internal helper of `resolveAgentMessageRuntimeActivity`
 */
function parseRuntimeLogEvent(line: string): RuntimeLogEvent | null {
    const jsonStartIndex = line.indexOf('{');
    if (jsonStartIndex === -1) {
        return null;
    }

    try {
        const parsed = JSON.parse(line.slice(jsonStartIndex).trim()) as unknown;
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return null;
        }

        return parsed as RuntimeLogEvent;
    } catch {
        return null;
    }
}

/**
 * Resolves the natural-language assistant narration from one complete assistant event.
 *
 * @private internal helper of `resolveAgentMessageRuntimeActivity`
 */
function resolveRuntimeLogEventActivity(event: RuntimeLogEvent): string | null {
    if (event.type !== 'assistant' || !Array.isArray(event.message?.content)) {
        return null;
    }

    const assistantText = event
        .message!.content!.filter((contentItem) => contentItem.type === 'text' && typeof contentItem.text === 'string')
        .map((contentItem) => contentItem.text!.trim())
        .filter((text) => text.length > 0)
        .join(' ')
        .trim();

    return assistantText.length > 0 ? assistantText : null;
}

/**
 * Collapses one activity string to a single trimmed line, truncated for the progress card.
 *
 * @private internal helper of `resolveAgentMessageRuntimeActivity`
 */
function truncateRuntimeActivity(activity: string): string {
    const singleLineActivity = activity.replace(/\s+/gu, ' ').trim();

    if (singleLineActivity.length <= MAX_RUNTIME_ACTIVITY_LENGTH) {
        return singleLineActivity;
    }

    return `${singleLineActivity.slice(0, MAX_RUNTIME_ACTIVITY_LENGTH).trimEnd()}…`;
}

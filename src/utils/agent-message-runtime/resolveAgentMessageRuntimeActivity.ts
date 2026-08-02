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
    readonly item?: {
        readonly type?: string;
        readonly command?: string;
        readonly exit_code?: number | null;
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
    const codexActivity = resolveCodexRuntimeLogEventActivity(event);
    if (codexActivity) {
        return codexActivity;
    }

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
 * Resolves one short user-facing status from a structured Codex JSONL event.
 *
 * Codex reasoning and raw command text deliberately remain private. The event type tells us
 * enough to report a useful action without exposing the internal trace or a command payload.
 *
 * @private internal helper of `resolveAgentMessageRuntimeActivity`
 */
function resolveCodexRuntimeLogEventActivity(event: RuntimeLogEvent): string | null {
    if (!event.item || !isCodexItemEvent(event.type)) {
        return null;
    }

    const isCompleted = event.type === 'item.completed';

    switch (event.item.type) {
        case 'reasoning':
            return isCompleted ? 'Considered the request.' : 'Considering the request.';
        case 'command_execution':
            return resolveCodexCommandActivity(event.item.command, isCompleted, event.item.exit_code);
        case 'file_change':
            return isCompleted ? 'Updated relevant files.' : 'Updating relevant files.';
        case 'web_search':
            return isCompleted ? 'Finished searching the web.' : 'Searching the web.';
        case 'mcp_tool_call':
            return isCompleted ? 'Finished using an integration.' : 'Using an integration.';
        case 'plan_update':
            return isCompleted ? 'Updated the plan.' : 'Planning the work.';
        default:
            return null;
    }
}

/**
 * Returns whether one runtime event is a Codex item lifecycle event.
 *
 * @private internal helper of `resolveAgentMessageRuntimeActivity`
 */
function isCodexItemEvent(eventType: string | undefined): boolean {
    return eventType === 'item.started' || eventType === 'item.updated' || eventType === 'item.completed';
}

/**
 * Maps one Codex command event to a concise action without revealing the command itself.
 *
 * @private internal helper of `resolveAgentMessageRuntimeActivity`
 */
function resolveCodexCommandActivity(
    command: string | undefined,
    isCompleted: boolean,
    exitCode: number | null | undefined,
): string {
    if (isCompleted && exitCode !== undefined && exitCode !== null && exitCode !== 0) {
        return 'A command needs attention.';
    }

    const activity = resolveCodexCommandActivityLabel(command);
    return isCompleted ? activity.completed : activity.running;
}

/**
 * Resolves the short running/completed labels for one safe command category.
 *
 * @private internal helper of `resolveAgentMessageRuntimeActivity`
 */
function resolveCodexCommandActivityLabel(command: string | undefined): { running: string; completed: string } {
    const normalizedCommand = command?.toLowerCase() || '';

    if (/(^|\s)(npm\s+(?:run\s+)?test|pnpm\s+(?:run\s+)?test|yarn\s+test|jest|vitest|pytest)\b/u.test(normalizedCommand)) {
        return { running: 'Running tests.', completed: 'Finished running tests.' };
    }

    if (/(^|\s)(npm\s+run\s+build|pnpm\s+(?:run\s+)?build|yarn\s+build|next\s+build)\b/u.test(normalizedCommand)) {
        return { running: 'Building the project.', completed: 'Finished building the project.' };
    }

    if (/(^|\s)(npm|pnpm|yarn)\s+(?:install|add)\b/u.test(normalizedCommand)) {
        return { running: 'Installing dependencies.', completed: 'Finished installing dependencies.' };
    }

    if (/(^|\s)git\s+(?:status|diff|log|show)\b/u.test(normalizedCommand)) {
        return { running: 'Reviewing changes.', completed: 'Finished reviewing changes.' };
    }

    if (/(^|\s)(ls|find|rg|grep|sed|cat|head|tail)\b/u.test(normalizedCommand)) {
        return { running: 'Inspecting relevant files.', completed: 'Finished inspecting relevant files.' };
    }

    return { running: 'Running a task.', completed: 'Finished a task.' };
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

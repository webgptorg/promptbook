import type { AgentMessageRuntimeLogEvent } from './parseAgentMessageRuntimeLogEvents';
import { parseAgentMessageRuntimeLogEvents } from './parseAgentMessageRuntimeLogEvents';

/**
 * Maximum length of one user-facing progress activity snippet.
 *
 * @private internal constant of agent-message runtime activity
 */
const MAX_RUNTIME_ACTIVITY_LENGTH = 160;

/**
 * One safe, concrete category of a command emitted by the Codex runtime.
 *
 * @private internal type of agent-message runtime activity
 */
type CodexCommandActivity = {
    readonly pattern: RegExp;
    readonly running: string;
    readonly completed: string;
};

/**
 * Ordered command categories that can be described truthfully without showing raw commands,
 * arguments, file names, or other private runtime details.
 *
 * The local runner can execute on either Unix or Windows. Keeping the variants together here
 * ensures that equivalent shell commands yield the same concise status in the chat.
 *
 * @private internal constant of agent-message runtime activity
 */
const CODEX_COMMAND_ACTIVITIES: ReadonlyArray<CodexCommandActivity> = [
    {
        pattern:
            /(^|\s)(npm\s+(?:run\s+)?test|pnpm\s+(?:run\s+)?test|yarn\s+test|jest|vitest|pytest)\b/u,
        running: 'Running tests.',
        completed: 'Finished running tests.',
    },
    {
        pattern: /(^|\s)(npm\s+run\s+build|pnpm\s+(?:run\s+)?build|yarn\s+build|next\s+build)\b/u,
        running: 'Building the project.',
        completed: 'Finished building the project.',
    },
    {
        pattern: /(^|\s)(npm|pnpm|yarn)\s+(?:install|add)\b/u,
        running: 'Installing dependencies.',
        completed: 'Finished installing dependencies.',
    },
    {
        pattern: /(^|\s)(npm\s+(?:run\s+)?lint|pnpm\s+(?:run\s+)?lint|yarn\s+lint|eslint|prettier)\b/u,
        running: 'Checking the implementation.',
        completed: 'Finished checking the implementation.',
    },
    {
        pattern: /(^|\s)git\s+(?:status|diff|log|show)\b/u,
        running: 'Reviewing changes.',
        completed: 'Finished reviewing changes.',
    },
    {
        pattern:
            /(^|\s)(apply_patch|set-content|add-content|out-file|new-item|copy-item|move-item|set-item)\b/u,
        running: 'Updating relevant files.',
        completed: 'Finished updating relevant files.',
    },
    {
        pattern:
            /(^|\s)(ls|find|rg|grep|sed|cat|head|tail|get-content|get-childitem|get-item|select-string|findstr|type)\b/u,
        running: 'Inspecting relevant files.',
        completed: 'Finished inspecting relevant files.',
    },
    {
        pattern: /(^|\s)(curl|wget|invoke-webrequest)\b/u,
        running: 'Looking up information.',
        completed: 'Finished looking up information.',
    },
];

/**
 * Resolves the latest user-friendly activity snippet from a coding-harness runtime log.
 *
 * The Agents Server local agent runner streams the answering harness output (for example
 * Claude Code `--output-format stream-json`) into a live runtime log file next to the queued
 * message. This helper extracts the most recent natural-language assistant narration so the
 * durable chat can show what the agent is doing right now instead of a generic thinking
 * placeholder. Only concrete, safe activity is surfaced; raw tool payloads, JSON envelopes,
 * and private reasoning are intentionally ignored. When no concrete activity is known, this
 * resolves to `null` so the caller keeps the browser's rotating generic thinking state.
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

    for (const event of parseAgentMessageRuntimeLogEvents(logText)) {
        const activity = resolveRuntimeLogEventActivity(event);
        if (activity) {
            latestActivity = activity;
        }
    }

    return latestActivity === null ? null : truncateRuntimeActivity(latestActivity);
}

/**
 * Resolves the natural-language assistant narration from one complete assistant event.
 *
 * @private internal helper of `resolveAgentMessageRuntimeActivity`
 */
function resolveRuntimeLogEventActivity(event: AgentMessageRuntimeLogEvent): string | null {
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
 * Reasoning events are intentionally not a progress update: while they are the only signal,
 * the chat retains its configured generic thinking rotation. Once a concrete action arrives,
 * it becomes the latest user-facing status instead.
 *
 * @private internal helper of `resolveAgentMessageRuntimeActivity`
 */
function resolveCodexRuntimeLogEventActivity(event: AgentMessageRuntimeLogEvent): string | null {
    if (!event.item || !isCodexItemEvent(event.type)) {
        return null;
    }

    const isCompleted = event.type === 'item.completed';

    switch (event.item.type) {
        case 'reasoning':
            return null;
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
): string | null {
    if (isCompleted && exitCode !== undefined && exitCode !== null && exitCode !== 0) {
        return 'A command needs attention.';
    }

    const activity = resolveCodexCommandActivityLabel(command);
    if (!activity) {
        return null;
    }

    return isCompleted ? activity.completed : activity.running;
}

/**
 * Resolves the short running/completed labels for one safe command category.
 *
 * @private internal helper of `resolveAgentMessageRuntimeActivity`
 */
function resolveCodexCommandActivityLabel(command: string | undefined): CodexCommandActivity | null {
    const normalizedCommand = command?.toLowerCase() || '';

    return CODEX_COMMAND_ACTIVITIES.find((activity) => activity.pattern.test(normalizedCommand)) ?? null;
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

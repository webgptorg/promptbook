import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../../../../src/types/ToolCall';

/**
 * Prefix used by automatic durable chat progress items so we can recognize and refresh them later.
 *
 * @private internal helper for Agents Server durable chat progress
 */
const AUTOMATIC_PROGRESS_ITEM_ID_PREFIX = 'user-chat-job-progress-';

/**
 * Shared title for progress cards owned by the durable chat runner.
 *
 * @private internal helper for Agents Server durable chat progress
 */
const AUTOMATIC_PROGRESS_TITLE = 'Agent Progress';

/**
 * Tool names that are never surfaced in the automatic progress card.
 *
 * `agent_progress` is the model's own progress channel; we never want to advertise this
 * internal tool to the user as if it were doing visible work.
 *
 * @private internal helper for Agents Server durable chat progress
 */
const HIDDEN_PROGRESS_TOOL_NAMES = new Set(['agent_progress']);

/**
 * Maximum number of characters surfaced from a tool log message to keep progress copy compact.
 *
 * @private internal helper for Agents Server durable chat progress
 */
const MAX_TOOL_LOG_PREVIEW_LENGTH = 140;

/**
 * Known technical tool names mapped to a user-friendly action verb phrase.
 *
 * Used so users see "Searching the web" instead of "Web search" or "search_web" in
 * the progress card. Unknown tools fall back to a sentence-cased version of their raw name.
 *
 * @private internal helper for Agents Server durable chat progress
 */
const FRIENDLY_TOOL_NAME_OVERRIDES: ReadonlyMap<string, string> = new Map([
    [ASSISTANT_PREPARATION_TOOL_CALL_NAME, 'Preparing the agent'],
    ['web_search', 'Searching the web'],
    ['search_web', 'Searching the web'],
    ['search_engine_search', 'Searching the web'],
    ['browser', 'Browsing the web'],
    ['browser_open_url', 'Opening a web page'],
    ['browser_read', 'Reading a web page'],
    ['get_url_content', 'Reading a web page'],
    ['read_url', 'Reading a web page'],
    ['scrape', 'Reading a web page'],
    ['file_read', 'Reading a file'],
    ['project_read_file', 'Reading a project file'],
    ['file_write', 'Writing a file'],
    ['email_send', 'Sending an email'],
    ['send_email', 'Sending an email'],
]);

/**
 * Options for building an automatic running progress card snapshot.
 *
 * @private internal helper for Agents Server durable chat progress
 */
type CreateRunningUserChatProgressCardOptions = {
    readonly currentProgressCard?: ChatMessage['progressCard'];
    readonly content: string;
    readonly toolCalls?: ReadonlyArray<ToolCall>;
    readonly updatedAt: NonNullable<ChatMessage['progressCard']>['updatedAt'];
};

/**
 * Creates the initial real-progress payload shown before the agent starts working.
 *
 * @param updatedAt Timestamp used for the progress-card update marker.
 * @returns Structured progress card for a queued assistant placeholder.
 *
 * @private internal helper for Agents Server durable chat progress
 */
export function createQueuedUserChatProgressCard(
    updatedAt: NonNullable<ChatMessage['progressCard']>['updatedAt'],
): NonNullable<ChatMessage['progressCard']> {
    return {
        title: AUTOMATIC_PROGRESS_TITLE,
        now: 'Your message is in the queue.',
        next: 'The agent will pick it up and start working on your reply.',
        items: [
            {
                id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}queued`,
                text: 'Message added to the chat queue',
                status: 'completed',
            },
            {
                id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}waiting-for-runner`,
                text: 'Waiting for the agent to start',
                status: 'pending',
            },
        ],
        updatedAt,
        isVisible: true,
    };
}

/**
 * Creates or refreshes the automatic progress card for a running durable chat job.
 *
 * A model-authored `agent_progress` card always wins: if one is already present,
 * the durable runner returns it unchanged so the model can drive its own narrative.
 *
 * @param options Current message state and the latest streamed runtime details.
 * @returns Progress card that should be stored on the assistant message.
 *
 * @private internal helper for Agents Server durable chat progress
 */
export function createRunningUserChatProgressCard(
    options: CreateRunningUserChatProgressCardOptions,
): NonNullable<ChatMessage['progressCard']> {
    if (shouldPreserveModelProgressCard(options.currentProgressCard)) {
        return options.currentProgressCard;
    }

    const visibleToolCalls = (options.toolCalls || []).filter(
        (toolCall) => !HIDDEN_PROGRESS_TOOL_NAMES.has(toolCall.name),
    );
    const activeToolCalls = visibleToolCalls.filter((toolCall) => !isToolCallComplete(toolCall));
    const hasStartedWriting = options.content.trim().length > 0;

    return {
        title: AUTOMATIC_PROGRESS_TITLE,
        now: resolveRunningProgressNowText({
            hasStartedWriting,
            visibleToolCalls,
            activeToolCalls,
        }),
        next: resolveRunningProgressNextText({
            hasStartedWriting,
            activeToolCalls,
        }),
        items: [
            {
                id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}queued`,
                text: 'Message added to the chat queue',
                status: 'completed',
            },
            {
                id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}runtime-prepared`,
                text: 'Agent is ready',
                status: 'completed',
            },
            {
                id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}generating-response`,
                text: hasStartedWriting ? 'Writing the answer for you' : 'Thinking through your request',
                status: hasStartedWriting ? 'completed' : 'pending',
            },
            ...visibleToolCalls.map(createToolCallProgressItem),
        ],
        updatedAt: options.updatedAt,
        isVisible: true,
    };
}

/**
 * Returns true when an existing progress card was authored by the model and should not be overwritten.
 *
 * @param progressCard Existing progress-card payload on the assistant message.
 * @returns Whether automatic runner progress should leave the card untouched.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function shouldPreserveModelProgressCard(
    progressCard: ChatMessage['progressCard'],
): progressCard is NonNullable<ChatMessage['progressCard']> {
    if (!progressCard || progressCard.isVisible === false) {
        return false;
    }

    if (progressCard.title !== AUTOMATIC_PROGRESS_TITLE) {
        return true;
    }

    return (progressCard.items || []).some((item) => !item.id.startsWith(AUTOMATIC_PROGRESS_ITEM_ID_PREFIX));
}

/**
 * Resolves the current-work copy for a running progress card.
 *
 * Prefers a friendly preview of the latest tool log so the user can see what is
 * actually happening, then falls back to higher-level phase descriptions.
 *
 * @param options Running output and tool-call snapshot summary.
 * @returns Concise user-facing progress-card "now" text.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function resolveRunningProgressNowText(options: {
    readonly hasStartedWriting: boolean;
    readonly visibleToolCalls: ReadonlyArray<ToolCall>;
    readonly activeToolCalls: ReadonlyArray<ToolCall>;
}): string {
    const latestActiveLogText = resolveLatestToolLogPhrase(options.activeToolCalls);
    if (latestActiveLogText) {
        return latestActiveLogText;
    }

    if (options.activeToolCalls.length > 0) {
        return `${formatToolCallActionList(options.activeToolCalls)}.`;
    }

    if (options.hasStartedWriting) {
        return 'Writing the answer for you.';
    }

    if (options.visibleToolCalls.length > 0) {
        return 'Reviewing what the tools returned.';
    }

    return 'Thinking through your request.';
}

/**
 * Resolves the upcoming-work copy for a running progress card.
 *
 * @param options Running output and tool-call snapshot summary.
 * @returns Concise user-facing progress-card "next" text.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function resolveRunningProgressNextText(options: {
    readonly hasStartedWriting: boolean;
    readonly activeToolCalls: ReadonlyArray<ToolCall>;
}): string {
    if (options.hasStartedWriting) {
        return 'Finishing up the answer.';
    }

    if (options.activeToolCalls.length > 0) {
        return 'The results will be turned into your answer.';
    }

    return 'The answer will appear here once it is ready.';
}

/**
 * Creates one checklist item from an observed tool-call snapshot.
 *
 * @param toolCall Tool call observed while the model is running.
 * @param index Position of the tool call in the current snapshot.
 * @returns Progress item describing the tool action.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function createToolCallProgressItem(
    toolCall: ToolCall,
    index: number,
): NonNullable<ChatMessage['progressCard']>['items'][number] {
    return {
        id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}tool-${resolveToolCallProgressId(toolCall, index)}`,
        text: resolveToolCallProgressText(toolCall),
        status: isToolCallComplete(toolCall) ? 'completed' : 'pending',
    };
}

/**
 * Creates a stable progress item id from one tool-call snapshot so partial updates re-use the same row.
 *
 * @param toolCall Tool call observed while the model is running.
 * @param index Position of the tool call in the current snapshot.
 * @returns Stable id suffix for the rendered progress item.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function resolveToolCallProgressId(toolCall: ToolCall, index: number): string {
    const rawId = toolCall.idempotencyKey || `${toolCall.name}-${index}`;
    return rawId
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

/**
 * Resolves user-facing progress text for one tool-call snapshot.
 *
 * @param toolCall Tool call observed while the model is running.
 * @returns Concise description of the tool action or its result.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function resolveToolCallProgressText(toolCall: ToolCall): string {
    const toolAction = resolveFriendlyToolAction(toolCall.name);

    if (Array.isArray(toolCall.errors) && toolCall.errors.length > 0) {
        return `${toolAction} ran into a problem`;
    }

    const latestLogText = resolveToolCallLatestLogText(toolCall);
    if (isToolCallComplete(toolCall)) {
        return latestLogText ? `${toolAction} – ${latestLogText}` : `${toolAction} done`;
    }

    if (latestLogText) {
        return `${toolAction}: ${latestLogText}`;
    }

    return `${toolAction}…`;
}

/**
 * Returns a friendly phrase for the latest log line observed across the given tool calls.
 *
 * @param toolCalls Tool calls to inspect.
 * @returns Compact phrase suitable for the progress-card "now" field, or null when no log is informative.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function resolveLatestToolLogPhrase(toolCalls: ReadonlyArray<ToolCall>): string | null {
    for (let index = toolCalls.length - 1; index >= 0; index--) {
        const toolCall = toolCalls[index]!;
        const latestLogText = resolveToolCallLatestLogText(toolCall);
        if (!latestLogText) {
            continue;
        }

        return `${resolveFriendlyToolAction(toolCall.name)}: ${latestLogText}`;
    }

    return null;
}

/**
 * Returns the most recent informative log line for one tool call, truncated for compact display.
 *
 * @param toolCall Tool call to inspect.
 * @returns Compact log preview or null when no informative log was observed.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function resolveToolCallLatestLogText(toolCall: ToolCall): string | null {
    if (!toolCall.logs || toolCall.logs.length === 0) {
        return null;
    }

    for (let index = toolCall.logs.length - 1; index >= 0; index--) {
        const logEntry = toolCall.logs[index];
        const logText = logEntry?.title?.trim() || logEntry?.message?.trim();
        if (!logText) {
            continue;
        }

        if (logText.length <= MAX_TOOL_LOG_PREVIEW_LENGTH) {
            return logText;
        }

        return `${logText.slice(0, MAX_TOOL_LOG_PREVIEW_LENGTH - 1).trimEnd()}…`;
    }

    return null;
}

/**
 * Formats a short comma-separated description of active tool actions.
 *
 * @param toolCalls Visible tool calls that are still in progress.
 * @returns Human-readable tool action list.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function formatToolCallActionList(toolCalls: ReadonlyArray<ToolCall>): string {
    const uniqueToolActions = [...new Set(toolCalls.map((toolCall) => resolveFriendlyToolAction(toolCall.name)))];

    if (uniqueToolActions.length === 1) {
        return uniqueToolActions[0]!;
    }

    const finalToolAction = uniqueToolActions[uniqueToolActions.length - 1]!;
    return `${uniqueToolActions.slice(0, -1).join(', ')} and ${finalToolAction.toLowerCase()}`;
}

/**
 * Converts one technical tool name into compact user-facing copy.
 *
 * Falls back to a sentence-cased version of the raw name when no friendly mapping is known.
 *
 * @param toolName Tool function name reported by the model.
 * @returns Human-readable action phrase such as "Searching the web".
 *
 * @private internal helper for Agents Server durable chat progress
 */
function resolveFriendlyToolAction(toolName: string): string {
    const overriddenAction = FRIENDLY_TOOL_NAME_OVERRIDES.get(toolName);
    if (overriddenAction) {
        return overriddenAction;
    }

    const sentenceCasedName = toolName
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\w/, (character) => character.toUpperCase());

    return sentenceCasedName.length > 0 ? sentenceCasedName : 'Running a tool';
}

/**
 * Infers whether a tool-call snapshot has reached a terminal successful state.
 *
 * @param toolCall Tool call observed while the model is running.
 * @returns Whether the tool call has a completed result and should be rendered as such.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function isToolCallComplete(toolCall: ToolCall): boolean {
    if (toolCall.state === 'COMPLETE') {
        return true;
    }

    if (toolCall.state === 'ERROR' || toolCall.state === 'PARTIAL' || toolCall.state === 'PENDING') {
        return false;
    }

    return toolCall.result !== undefined && toolCall.result !== '';
}

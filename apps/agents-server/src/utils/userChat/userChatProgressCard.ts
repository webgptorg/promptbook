import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../../../../src/types/ToolCall';

/**
 * Prefix used by automatic durable chat progress items.
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
 * Tool names that are already represented by the progress card itself.
 *
 * @private internal helper for Agents Server durable chat progress
 */
const HIDDEN_PROGRESS_TOOL_NAMES = new Set(['agent_progress']);

/**
 * Options for building an automatic running progress card.
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
 * Creates the initial real progress payload shown before an agent runner starts.
 *
 * @param updatedAt - Timestamp used for the progress-card update marker.
 * @returns Structured progress card for a queued assistant placeholder.
 *
 * @private internal helper for Agents Server durable chat progress
 */
export function createQueuedUserChatProgressCard(
    updatedAt: NonNullable<ChatMessage['progressCard']>['updatedAt'],
): NonNullable<ChatMessage['progressCard']> {
    return {
        title: AUTOMATIC_PROGRESS_TITLE,
        now: 'Your message is queued for the agent runner.',
        next: 'The runner will prepare the agent context and start generating the response.',
        items: [
            {
                id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}queued`,
                text: 'Request added to the chat queue',
                status: 'completed',
            },
            {
                id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}waiting-for-runner`,
                text: 'Waiting for an available agent runner',
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
 * A model-authored `agent_progress` card is preserved once it takes over, so the
 * durable runner does not overwrite more specific progress supplied by the agent.
 *
 * @param options - Current message state and streamed runtime details.
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

    const visibleToolCalls = (options.toolCalls || []).filter((toolCall) => !HIDDEN_PROGRESS_TOOL_NAMES.has(toolCall.name));
    const hasVisibleToolCalls = visibleToolCalls.length > 0;
    const hasStartedWriting = options.content.trim().length > 0;

    return {
        title: AUTOMATIC_PROGRESS_TITLE,
        now: resolveRunningProgressNowText({
            hasStartedWriting,
            visibleToolCalls,
        }),
        next: hasVisibleToolCalls
            ? 'Tool results will be incorporated into the final response.'
            : 'The final answer will replace this progress view when generation finishes.',
        items: [
            {
                id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}queued`,
                text: 'Request added to the chat queue',
                status: 'completed',
            },
            {
                id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}runtime-prepared`,
                text: 'Agent context and runtime tools prepared',
                status: 'completed',
            },
            {
                id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}generating-response`,
                text: hasStartedWriting ? 'Response text has started streaming' : 'Generating the assistant response',
                status: hasStartedWriting ? 'completed' : 'pending',
            },
            ...visibleToolCalls.map(createToolCallProgressItem),
        ],
        updatedAt: options.updatedAt,
        isVisible: true,
    };
}

/**
 * Returns true when the existing progress card should be treated as model-authored.
 *
 * @param progressCard - Existing progress-card payload on the assistant message.
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
 * @param options - Running output and tool-call state.
 * @returns Concise progress-card text.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function resolveRunningProgressNowText(options: {
    readonly hasStartedWriting: boolean;
    readonly visibleToolCalls: ReadonlyArray<ToolCall>;
}): string {
    if (options.visibleToolCalls.length > 0) {
        return `Using ${formatToolCallList(options.visibleToolCalls)}.`;
    }

    if (options.hasStartedWriting) {
        return 'The agent has started writing the response.';
    }

    return 'The agent runtime is prepared and the model is generating the response.';
}

/**
 * Creates one checklist item from an observed tool-call snapshot.
 *
 * @param toolCall - Tool call observed while the model is running.
 * @param index - Position of the tool call in the current snapshot.
 * @returns Progress item for the tool action.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function createToolCallProgressItem(toolCall: ToolCall, index: number): NonNullable<ChatMessage['progressCard']>['items'][number] {
    return {
        id: `${AUTOMATIC_PROGRESS_ITEM_ID_PREFIX}tool-${resolveToolCallProgressId(toolCall, index)}`,
        text: resolveToolCallProgressText(toolCall),
        status: isToolCallComplete(toolCall) ? 'completed' : 'pending',
    };
}

/**
 * Creates a stable progress item id from one tool-call snapshot.
 *
 * @param toolCall - Tool call observed while the model is running.
 * @param index - Position of the tool call in the current snapshot.
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
 * @param toolCall - Tool call observed while the model is running.
 * @returns Concise description of the action or result.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function resolveToolCallProgressText(toolCall: ToolCall): string {
    const toolTitle = formatToolName(toolCall.name);
    const latestLog = [...(toolCall.logs || [])].reverse().find((log) => log.title || log.message);

    if (toolCall.name === ASSISTANT_PREPARATION_TOOL_CALL_NAME) {
        return 'Preparing assistant runtime';
    }

    if (Array.isArray(toolCall.errors) && toolCall.errors.length > 0) {
        return `${toolTitle} reported an error`;
    }

    if (isToolCallComplete(toolCall)) {
        return `${toolTitle} completed`;
    }

    if (latestLog) {
        const logText = latestLog.title || latestLog.message;
        return `${toolTitle}: ${logText}`;
    }

    return `${toolTitle} is running`;
}

/**
 * Formats a short comma-separated list of active tools.
 *
 * @param toolCalls - Visible tool calls in the current stream snapshot.
 * @returns Human-readable tool list.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function formatToolCallList(toolCalls: ReadonlyArray<ToolCall>): string {
    const uniqueToolNames = [...new Set(toolCalls.map((toolCall) => formatToolName(toolCall.name)))];

    if (uniqueToolNames.length === 1) {
        return uniqueToolNames[0]!;
    }

    const finalToolName = uniqueToolNames[uniqueToolNames.length - 1]!;
    return `${uniqueToolNames.slice(0, -1).join(', ')} and ${finalToolName}`;
}

/**
 * Converts one technical tool name into compact user-facing copy.
 *
 * @param toolName - Tool function name.
 * @returns Human-readable tool name.
 *
 * @private internal helper for Agents Server durable chat progress
 */
function formatToolName(toolName: string): string {
    return toolName
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\w/, (character) => character.toUpperCase());
}

/**
 * Infers whether a tool-call snapshot has reached a terminal successful state.
 *
 * @param toolCall - Tool call observed while the model is running.
 * @returns Whether the tool call has a completed result.
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

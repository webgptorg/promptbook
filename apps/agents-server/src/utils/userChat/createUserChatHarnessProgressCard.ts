import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import { spaceTrim } from '../../../../../src/_packages/utils.index';
import { TOOL_TITLES } from '../../../../../src/book-components/Chat/utils/getToolCallChipletInfo';
import { isVisibleChatToolCall } from '../../../../../src/book-components/Chat/utils/isVisibleChatToolCall';
import { resolveToolCallState } from '../../../../../src/book-components/Chat/utils/resolveToolCallState';

/**
 * Default title used while a running chat job reports harness action progress.
 */
const USER_CHAT_HARNESS_PROGRESS_TITLE = 'Working on your request';

/**
 * Creates a user-facing progress card from the latest visible harness/tool action.
 *
 * @param toolCalls - Latest aggregated tool-call snapshots emitted by the agent runtime.
 * @returns Progress card for the latest visible action, or null when there is no user-facing action yet.
 */
export function createUserChatHarnessProgressCard(
    toolCalls: ReadonlyArray<ToolCall> | undefined,
): NonNullable<ChatMessage['progressCard']> | null {
    const latestVisibleToolCall = resolveLatestVisibleToolCall(toolCalls);
    if (!latestVisibleToolCall) {
        return null;
    }

    return {
        title: USER_CHAT_HARNESS_PROGRESS_TITLE,
        now: createHarnessProgressNowText(latestVisibleToolCall),
        items: [],
        updatedAt: new Date().toISOString() as NonNullable<ChatMessage['progressCard']>['updatedAt'],
        isVisible: true,
    };
}

/**
 * Resolves the latest user-facing tool call from an aggregated runtime snapshot.
 *
 * @private internal helper of `createUserChatHarnessProgressCard`
 */
function resolveLatestVisibleToolCall(toolCalls: ReadonlyArray<ToolCall> | undefined): ToolCall | null {
    if (!toolCalls || toolCalls.length === 0) {
        return null;
    }

    for (let index = toolCalls.length - 1; index >= 0; index--) {
        const toolCall = toolCalls[index]!;
        if (isVisibleChatToolCall(toolCall)) {
            return toolCall;
        }
    }

    return null;
}

/**
 * Creates the current-action text shown in the progress card.
 *
 * @private internal helper of `createUserChatHarnessProgressCard`
 */
function createHarnessProgressNowText(toolCall: ToolCall): string {
    const actionLabel = resolveToolCallActionLabel(toolCall);
    const toolCallState = resolveToolCallState(toolCall);

    switch (toolCallState) {
        case 'COMPLETE':
            return spaceTrim(`
                Action completed: ${actionLabel}.
            `);
        case 'ERROR':
            return spaceTrim(`
                Action failed: ${actionLabel}.
            `);
        case 'PENDING':
        case 'PARTIAL':
        default:
            return spaceTrim(`
                Running action: ${actionLabel}.
            `);
    }
}

/**
 * Resolves a concise user-facing action label from one technical tool call name.
 *
 * @private internal helper of `createUserChatHarnessProgressCard`
 */
function resolveToolCallActionLabel(toolCall: ToolCall): string {
    const knownTitle = TOOL_TITLES[toolCall.name]?.title;
    if (knownTitle) {
        return knownTitle;
    }

    const normalizedName = toolCall.name
        .trim()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ');

    return normalizedName || 'agent action';
}

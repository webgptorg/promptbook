import type { TODO_any } from '../../../../src/_packages/types.index';
import { spaceTrim } from '../../../../src/_packages/utils.index';
import { readToolRuntimeContextFromToolArgs } from '../../../../src/commitments/_common/toolRuntimeContext';
import { LimitReachedError } from '../../../../src/errors/LimitReachedError';
import { ParseError } from '../../../../src/errors/ParseError';
import { assertsError } from '../../../../src/errors/assertsError';
import type { ChatMessage } from '@promptbook-local/types';
import type { ChatProgressCard, ChatProgressItem } from '../../../../src/book-components/Chat/types/ChatMessage';
import { updateUserChatAssistantMessage } from '../utils/userChat/updateUserChatAssistantMessage';

/**
 * Internal default title used when the progress card is initialized without explicit heading.
 */
const DEFAULT_PROGRESS_TITLE = 'Working on your request';

/**
 * Maximum markdown length accepted for one progress-card text field.
 */
const MAX_PROGRESS_TEXT_LENGTH = 1_200;

/**
 * Supported actions for the `agent_progress` tool.
 */
const AGENT_PROGRESS_ACTIONS = ['initialize', 'update', 'append_items', 'finalize'] as const;

/**
 * Supported item-status values for progress bullets.
 */
const AGENT_PROGRESS_ITEM_STATUSES = ['pending', 'completed'] as const;

/**
 * Raw arguments accepted by the `agent_progress` tool.
 */
type AgentProgressToolArgs = Record<string, unknown>;

/**
 * One supported action for the `agent_progress` tool.
 */
type AgentProgressAction = (typeof AGENT_PROGRESS_ACTIONS)[number];

/**
 * One supported progress-bullet status.
 */
type AgentProgressItemStatus = (typeof AGENT_PROGRESS_ITEM_STATUSES)[number];

/**
 * Normalized progress-bullet item used by mutation helpers.
 */
type NormalizedAgentProgressItem = {
    id: string;
    text: string;
    status: AgentProgressItemStatus;
};

/**
 * Normalized payload used to update one assistant progress card.
 */
type NormalizedAgentProgressPayload = {
    action: AgentProgressAction;
    title?: string;
    now?: string;
    next?: string;
    items?: Array<NormalizedAgentProgressItem>;
};

/**
 * Scoped runtime identity needed to mutate the active assistant message.
 */
type AgentProgressRuntimeScope = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    assistantMessageId: string;
};

/**
 * JSON payload returned by `agent_progress`.
 */
type AgentProgressToolResult =
    | {
          status: 'ok';
          action: AgentProgressAction;
          visible: boolean;
          itemsCount: number;
      }
    | {
          status: 'ignored';
          code: 'missing_runtime_context' | 'invalid_payload' | 'update_failed';
          message: string;
      };

/**
 * Updates one user-facing progress card attached to the current assistant message.
 *
 * The payload is validated strictly and never throws to the model for invalid inputs.
 * Instead, it returns a structured `ignored` result and logs the issue server-side.
 * When the payload includes `title`, the same value is also persisted as the chat title.
 */
export async function agent_progress(args: AgentProgressToolArgs): Promise<string> {
    const runtimeScope = resolveAgentProgressRuntimeScope(args);

    if (!runtimeScope) {
        return serializeAgentProgressToolResult({
            status: 'ignored',
            code: 'missing_runtime_context',
            message: 'Progress updates are unavailable outside scoped web chat runtime.',
        });
    }

    let payload: NormalizedAgentProgressPayload;

    try {
        payload = normalizeAgentProgressPayload(args);
    } catch (error) {
        assertsError(error);

        console.warn('[agent_progress] invalid_payload', {
            chatId: runtimeScope.chatId,
            assistantMessageId: runtimeScope.assistantMessageId,
            errorName: error.name,
            errorMessage: error.message,
        });

        return serializeAgentProgressToolResult({
            status: 'ignored',
            code: 'invalid_payload',
            message: error.message,
        });
    }

    try {
        await updateUserChatAssistantMessage({
            userId: runtimeScope.userId,
            agentPermanentId: runtimeScope.agentPermanentId,
            chatId: runtimeScope.chatId,
            assistantMessageId: runtimeScope.assistantMessageId,
            ...(payload.title !== undefined ? { chatTitle: payload.title } : {}),
            mutateMessage: (message) => {
                const updatedAt = new Date().toISOString() as ChatProgressCard['updatedAt'];
                return applyAgentProgressPayloadToMessage(message, payload, updatedAt);
            },
        });

        const isVisible = payload.action !== 'finalize';
        const itemsCount = payload.items?.length ?? 0;

        return serializeAgentProgressToolResult({
            status: 'ok',
            action: payload.action,
            visible: isVisible,
            itemsCount,
        });
    } catch (error) {
        assertsError(error);

        console.warn('[agent_progress] update_failed', {
            chatId: runtimeScope.chatId,
            assistantMessageId: runtimeScope.assistantMessageId,
            errorName: error.name,
            errorMessage: error.message,
        });

        return serializeAgentProgressToolResult({
            status: 'ignored',
            code: 'update_failed',
            message: error.message,
        });
    }
}

/**
 * Resolves scoped runtime identity from hidden tool runtime context.
 */
function resolveAgentProgressRuntimeScope(args: AgentProgressToolArgs): AgentProgressRuntimeScope | null {
    const runtimeContext = readToolRuntimeContextFromToolArgs(args as Record<string, TODO_any>);
    const rawChatContext = runtimeContext?.chat;

    const userId =
        typeof rawChatContext?.userId === 'number' && Number.isFinite(rawChatContext.userId)
            ? rawChatContext.userId
            : null;
    const agentPermanentId = normalizeOptionalText(rawChatContext?.agentId);
    const chatId = normalizeOptionalText(rawChatContext?.chatId);
    const assistantMessageId = normalizeOptionalText(
        (rawChatContext as { assistantMessageId?: unknown } | undefined)?.assistantMessageId,
    );

    if (userId === null || !agentPermanentId || !chatId || !assistantMessageId) {
        return null;
    }

    return {
        userId,
        agentPermanentId,
        chatId,
        assistantMessageId,
    };
}

/**
 * Applies one normalized progress payload to the stored assistant message.
 */
function applyAgentProgressPayloadToMessage(
    message: ChatMessage,
    payload: NormalizedAgentProgressPayload,
    updatedAt: ChatProgressCard['updatedAt'],
): ChatMessage {
    if (payload.action === 'finalize') {
        return {
            ...message,
            progressCard: undefined,
        };
    }

    const currentCard = normalizeStoredProgressCard(message.progressCard);
    const nextCard = applyAgentProgressPayloadToCard(currentCard, payload, updatedAt);

    return {
        ...message,
        progressCard: nextCard,
    };
}

/**
 * Normalizes previously stored progress card shape before merge updates.
 */
function normalizeStoredProgressCard(rawCard: ChatMessage['progressCard']): ChatProgressCard {
    if (!rawCard) {
        return {
            title: DEFAULT_PROGRESS_TITLE,
            items: [],
            isVisible: true,
        };
    }

    const normalizedItems: Array<ChatProgressItem> = Array.isArray(rawCard.items)
        ? rawCard.items
              .filter((item): item is ChatProgressItem => Boolean(item))
              .map((item, index): ChatProgressItem => ({
                  id: normalizeOptionalText(item.id) || `item-${index + 1}`,
                  text: normalizeOptionalText(item.text) || '',
                  status: item.status === 'completed' ? 'completed' : 'pending',
              }))
              .filter((item) => item.text.length > 0)
        : [];

    return {
        title: normalizeOptionalText(rawCard.title) || DEFAULT_PROGRESS_TITLE,
        now: normalizeOptionalText(rawCard.now) || undefined,
        next: normalizeOptionalText(rawCard.next) || undefined,
        items: normalizedItems,
        updatedAt: (normalizeOptionalText(rawCard.updatedAt) || undefined) as ChatProgressCard['updatedAt'],
        isVisible: rawCard.isVisible !== false,
    };
}

/**
 * Applies one progress payload to the current progress card state.
 */
function applyAgentProgressPayloadToCard(
    currentCard: ChatProgressCard,
    payload: NormalizedAgentProgressPayload,
    updatedAt: ChatProgressCard['updatedAt'],
): ChatProgressCard {
    if (payload.action === 'initialize') {
        return {
            title: payload.title || DEFAULT_PROGRESS_TITLE,
            ...(payload.now !== undefined ? { now: payload.now } : {}),
            ...(payload.next !== undefined ? { next: payload.next } : {}),
            items: payload.items || [],
            updatedAt,
            isVisible: true,
        };
    }

    if (payload.action === 'append_items') {
        const existingItems = [...(currentCard.items || [])];
        const incomingItems = payload.items || [];

        for (const item of incomingItems) {
            const existingIndex = existingItems.findIndex((candidate) => candidate.id === item.id);

            if (existingIndex === -1) {
                existingItems.push(item);
                continue;
            }

            existingItems[existingIndex] = item;
        }

        return {
            ...currentCard,
            title: currentCard.title || DEFAULT_PROGRESS_TITLE,
            items: existingItems,
            updatedAt,
            isVisible: true,
        };
    }

    return {
        ...currentCard,
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.now !== undefined ? { now: payload.now } : {}),
        ...(payload.next !== undefined ? { next: payload.next } : {}),
        ...(payload.items !== undefined ? { items: payload.items } : {}),
        title: payload.title || currentCard.title || DEFAULT_PROGRESS_TITLE,
        updatedAt,
        isVisible: true,
    };
}

/**
 * Validates and normalizes incoming `agent_progress` payload.
 */
function normalizeAgentProgressPayload(args: AgentProgressToolArgs): NormalizedAgentProgressPayload {
    const action = normalizeAgentProgressAction(args.action);
    const title = normalizeOptionalMarkdownField(args.title, 'title');
    const now = normalizeOptionalMarkdownField(args.now, 'now');
    const next = normalizeOptionalMarkdownField(args.next, 'next');
    const items = args.items === undefined ? undefined : normalizeAgentProgressItems(args.items);

    if (action === 'append_items' && (!items || items.length === 0)) {
        throw new ParseError(
            spaceTrim(`
                Invalid \`agent_progress\` payload.

                - Action \`append_items\` requires non-empty \`items\`.
            `),
        );
    }

    if (action === 'finalize') {
        return { action };
    }

    return {
        action,
        ...(title !== undefined ? { title } : {}),
        ...(now !== undefined ? { now } : {}),
        ...(next !== undefined ? { next } : {}),
        ...(items !== undefined ? { items } : {}),
    };
}

/**
 * Validates one raw progress action value.
 */
function normalizeAgentProgressAction(rawAction: unknown): AgentProgressAction {
    const normalizedAction = normalizeOptionalText(rawAction);
    if (!normalizedAction) {
        throw new ParseError(
            spaceTrim(`
                Missing \`agent_progress.action\`.

                Use one of: \`${AGENT_PROGRESS_ACTIONS.join('`, `')}\`.
            `),
        );
    }

    if (!AGENT_PROGRESS_ACTIONS.includes(normalizedAction as AgentProgressAction)) {
        throw new ParseError(
            spaceTrim(`
                Invalid \`agent_progress.action\` value \`${normalizedAction}\`.

                Use one of: \`${AGENT_PROGRESS_ACTIONS.join('`, `')}\`.
            `),
        );
    }

    return normalizedAction as AgentProgressAction;
}

/**
 * Validates one markdown field from progress payload.
 */
function normalizeOptionalMarkdownField(rawValue: unknown, fieldName: string): string | undefined {
    if (rawValue === undefined || rawValue === null) {
        return undefined;
    }

    if (typeof rawValue !== 'string') {
        throw new ParseError(
            spaceTrim(`
                Invalid \`agent_progress.${fieldName}\` payload.

                - Expected markdown string or omitted value.
            `),
        );
    }

    const normalizedValue = rawValue.trim();
    if (!normalizedValue) {
        return undefined;
    }

    if (normalizedValue.length > MAX_PROGRESS_TEXT_LENGTH) {
        throw new LimitReachedError(
            spaceTrim(`
                \`agent_progress.${fieldName}\` is too long.

                - Maximum length: \`${MAX_PROGRESS_TEXT_LENGTH}\`
                - Received: \`${normalizedValue.length}\`
            `),
        );
    }

    return normalizedValue;
}

/**
 * Validates one list of progress bullet items.
 */
function normalizeAgentProgressItems(rawItems: unknown): Array<NormalizedAgentProgressItem> {
    if (!Array.isArray(rawItems)) {
        throw new ParseError(
            spaceTrim(`
                Invalid \`agent_progress.items\` payload.

                - Expected an array of objects with \`text\` and \`status\`.
            `),
        );
    }

    const normalizedItems: Array<NormalizedAgentProgressItem> = [];

    for (let index = 0; index < rawItems.length; index++) {
        const rawItem = rawItems[index];
        if (!rawItem || typeof rawItem !== 'object') {
            throw new ParseError(
                spaceTrim(`
                    Invalid \`agent_progress.items[${index}]\` payload.

                    - Expected an object.
                `),
            );
        }

        const item = rawItem as { id?: unknown; text?: unknown; status?: unknown };
        const text = normalizeOptionalMarkdownField(item.text, `items[${index}].text`);
        const status = normalizeAgentProgressItemStatus(item.status, index);

        if (!text) {
            throw new ParseError(
                spaceTrim(`
                    Invalid \`agent_progress.items[${index}].text\` payload.

                    - Non-empty markdown text is required.
                `),
            );
        }

        const id = normalizeOptionalText(item.id) || createGeneratedProgressItemId(index, text);

        normalizedItems.push({
            id,
            text,
            status,
        });
    }

    return normalizedItems;
}

/**
 * Validates one progress-bullet status value.
 */
function normalizeAgentProgressItemStatus(rawStatus: unknown, index: number): AgentProgressItemStatus {
    const normalizedStatus = normalizeOptionalText(rawStatus);
    if (!normalizedStatus) {
        throw new ParseError(
            spaceTrim(`
                Missing \`agent_progress.items[${index}].status\`.

                Use one of: \`${AGENT_PROGRESS_ITEM_STATUSES.join('`, `')}\`.
            `),
        );
    }

    if (!AGENT_PROGRESS_ITEM_STATUSES.includes(normalizedStatus as AgentProgressItemStatus)) {
        throw new ParseError(
            spaceTrim(`
                Invalid \`agent_progress.items[${index}].status\` value \`${normalizedStatus}\`.

                Use one of: \`${AGENT_PROGRESS_ITEM_STATUSES.join('`, `')}\`.
            `),
        );
    }

    return normalizedStatus as AgentProgressItemStatus;
}

/**
 * Generates one deterministic fallback id for items that omit explicit identifiers.
 */
function createGeneratedProgressItemId(index: number, text: string): string {
    const textSlug = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);

    return `item-${index + 1}-${textSlug || 'progress'}`;
}

/**
 * Normalizes optional text values.
 */
function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue || null;
}

/**
 * Serializes tool result payload as stable JSON text.
 */
function serializeAgentProgressToolResult(result: AgentProgressToolResult): string {
    return JSON.stringify(result);
}

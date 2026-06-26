import type { ChatMessage } from '@promptbook-local/types';

/**
 * User-facing phases shown while one durable chat answer is being prepared.
 */
export type UserChatProgressPhase =
    | 'queued'
    | 'reading_context'
    | 'preparing_agent'
    | 'checking_capabilities'
    | 'starting_response';

/**
 * Default title used by durable chat progress cards.
 */
const USER_CHAT_PROGRESS_TITLE = 'Working on your request';

/**
 * Ordered progress item identifiers shared across all durable chat phases.
 */
const USER_CHAT_PROGRESS_ITEM_IDS = {
    RECEIVE_MESSAGE: 'receive-message',
    PREPARE_AGENT: 'prepare-agent',
    CHECK_CAPABILITIES: 'check-capabilities',
    CREATE_RESPONSE: 'create-response',
} as const;

/**
 * Static progress copy for one durable chat phase.
 */
type UserChatProgressPhasePresentation = {
    readonly now: string;
    readonly next: string;
    readonly completedItemIds: ReadonlySet<string>;
};

/**
 * User-facing progress copy for durable chat phases.
 */
const USER_CHAT_PROGRESS_PHASE_PRESENTATIONS: Record<UserChatProgressPhase, UserChatProgressPhasePresentation> = {
    queued: {
        now: 'Your message is queued and the agent will pick it up shortly.',
        next: 'The agent will read the conversation and prepare the answer.',
        completedItemIds: new Set([]),
    },
    reading_context: {
        now: 'Reading your message and the relevant conversation context.',
        next: 'Prepare the agent instructions and working context.',
        completedItemIds: new Set([USER_CHAT_PROGRESS_ITEM_IDS.RECEIVE_MESSAGE]),
    },
    preparing_agent: {
        now: 'Preparing the agent instructions and context needed for this request.',
        next: 'Check which tools and inputs are available.',
        completedItemIds: new Set([
            USER_CHAT_PROGRESS_ITEM_IDS.RECEIVE_MESSAGE,
            USER_CHAT_PROGRESS_ITEM_IDS.PREPARE_AGENT,
        ]),
    },
    checking_capabilities: {
        now: 'Checking available tools, attachments, and context before answering.',
        next: 'Start working through the response.',
        completedItemIds: new Set([
            USER_CHAT_PROGRESS_ITEM_IDS.RECEIVE_MESSAGE,
            USER_CHAT_PROGRESS_ITEM_IDS.PREPARE_AGENT,
            USER_CHAT_PROGRESS_ITEM_IDS.CHECK_CAPABILITIES,
        ]),
    },
    starting_response: {
        now: 'Working through the response. Progress updates will stay focused on visible actions and results.',
        next: 'Stream the final answer as soon as it is ready.',
        completedItemIds: new Set([
            USER_CHAT_PROGRESS_ITEM_IDS.RECEIVE_MESSAGE,
            USER_CHAT_PROGRESS_ITEM_IDS.PREPARE_AGENT,
            USER_CHAT_PROGRESS_ITEM_IDS.CHECK_CAPABILITIES,
        ]),
    },
};

/**
 * Base progress items shown for durable chat jobs before model-specific progress arrives.
 */
const USER_CHAT_PROGRESS_ITEMS: ReadonlyArray<{
    readonly id: string;
    readonly text: string;
}> = [
    {
        id: USER_CHAT_PROGRESS_ITEM_IDS.RECEIVE_MESSAGE,
        text: 'Read the user request',
    },
    {
        id: USER_CHAT_PROGRESS_ITEM_IDS.PREPARE_AGENT,
        text: 'Prepare the agent context',
    },
    {
        id: USER_CHAT_PROGRESS_ITEM_IDS.CHECK_CAPABILITIES,
        text: 'Check available tools and inputs',
    },
    {
        id: USER_CHAT_PROGRESS_ITEM_IDS.CREATE_RESPONSE,
        text: 'Create the response',
    },
];

/**
 * Creates one user-facing durable chat progress card for the current job phase.
 */
export function createUserChatProgressCard(phase: UserChatProgressPhase): NonNullable<ChatMessage['progressCard']> {
    const presentation = USER_CHAT_PROGRESS_PHASE_PRESENTATIONS[phase];

    return {
        title: USER_CHAT_PROGRESS_TITLE,
        now: presentation.now,
        next: presentation.next,
        items: USER_CHAT_PROGRESS_ITEMS.map((item) => ({
            ...item,
            status: presentation.completedItemIds.has(item.id) ? 'completed' : 'pending',
        })),
        updatedAt: new Date().toISOString() as NonNullable<ChatMessage['progressCard']>['updatedAt'],
        isVisible: true,
    };
}

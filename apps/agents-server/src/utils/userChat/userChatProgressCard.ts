import type { ChatMessage } from '@promptbook-local/types';
import { spaceTrim } from '../../../../../src/_packages/utils.index';

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
 * Real runtime details surfaced into the user-facing progress card text.
 *
 * Only signals that are already known at the corresponding phase are filled in,
 * so the produced markdown reflects what the worker is actually doing right now
 * instead of a generic scripted summary.
 */
export type UserChatProgressContext = {
    /**
     * Resolved human-readable agent name, when already loaded for this turn.
     */
    readonly agentName?: string;

    /**
     * Stable agent identifier shown when the human-readable name is not yet known.
     */
    readonly agentPermanentId?: string;

    /**
     * Resolved LLM provider title (e.g. `OpenAI`, `Anthropic`), when already known.
     */
    readonly provider?: string;

    /**
     * Number of attachments the user submitted with the current turn.
     */
    readonly attachmentCount?: number;

    /**
     * Number of agent-defined tools available to the model for this turn.
     */
    readonly toolCount?: number;

    /**
     * Concise user-facing tool labels (e.g. `web browser`, `calendar`) for the progress text.
     */
    readonly toolHighlights?: ReadonlyArray<string>;

    /**
     * Number of knowledge sources the agent will reference during the turn.
     */
    readonly knowledgeSourceCount?: number;

    /**
     * Whether the calendar integration is wired up for this turn.
     */
    readonly hasCalendarAccess?: boolean;

    /**
     * Whether the email-sending integration is wired up for this turn.
     */
    readonly hasEmailAccess?: boolean;

    /**
     * Whether one or more project repositories are linked to this turn.
     */
    readonly hasProjectAccess?: boolean;

    /**
     * Whether the AgentKit runtime for this agent came from the in-process cache.
     */
    readonly isAgentKitCached?: boolean;
};

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
 * Static checklist mapping for one durable chat phase.
 */
type UserChatProgressPhaseChecklist = {
    readonly completedItemIds: ReadonlySet<string>;
};

/**
 * Static checklist progression shared across all durable chat phases.
 */
const USER_CHAT_PROGRESS_PHASE_CHECKLISTS: Record<UserChatProgressPhase, UserChatProgressPhaseChecklist> = {
    queued: { completedItemIds: new Set([]) },
    reading_context: { completedItemIds: new Set([USER_CHAT_PROGRESS_ITEM_IDS.RECEIVE_MESSAGE]) },
    preparing_agent: {
        completedItemIds: new Set([
            USER_CHAT_PROGRESS_ITEM_IDS.RECEIVE_MESSAGE,
            USER_CHAT_PROGRESS_ITEM_IDS.PREPARE_AGENT,
        ]),
    },
    checking_capabilities: {
        completedItemIds: new Set([
            USER_CHAT_PROGRESS_ITEM_IDS.RECEIVE_MESSAGE,
            USER_CHAT_PROGRESS_ITEM_IDS.PREPARE_AGENT,
            USER_CHAT_PROGRESS_ITEM_IDS.CHECK_CAPABILITIES,
        ]),
    },
    starting_response: {
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
 *
 * The optional `context` carries already-resolved runtime details (agent name, provider,
 * tool count, attachment count, integrations) so the rendered `now`/`next` text reflects
 * what the worker is actually doing on this turn instead of a generic scripted summary.
 */
export function createUserChatProgressCard(
    phase: UserChatProgressPhase,
    context?: UserChatProgressContext,
): NonNullable<ChatMessage['progressCard']> {
    const checklist = USER_CHAT_PROGRESS_PHASE_CHECKLISTS[phase];
    const { now, next } = composeUserChatProgressPhaseText(phase, context);

    return {
        title: USER_CHAT_PROGRESS_TITLE,
        now,
        next,
        items: USER_CHAT_PROGRESS_ITEMS.map((item) => ({
            ...item,
            status: checklist.completedItemIds.has(item.id) ? 'completed' : 'pending',
        })),
        updatedAt: new Date().toISOString() as NonNullable<ChatMessage['progressCard']>['updatedAt'],
        isVisible: true,
    };
}

/**
 * Composes the dynamic `now`/`next` markdown shown for one durable chat phase.
 *
 * @private internal helper of `createUserChatProgressCard`
 */
function composeUserChatProgressPhaseText(
    phase: UserChatProgressPhase,
    context: UserChatProgressContext | undefined,
): { now: string; next: string } {
    const agentLabel = describeAgent(context);

    switch (phase) {
        case 'queued':
            return {
                now: spaceTrim(`
                    Your message is waiting in the queue for the next available worker to pick it up.
                `),
                next: spaceTrim(`
                    Read the conversation and load ${agentLabel}.
                `),
            };
        case 'reading_context': {
            const attachmentHint = describeAttachmentHint(context);
            return {
                now: spaceTrim(`
                    Reading your latest message${attachmentHint} together with the earlier conversation thread.
                `),
                next: spaceTrim(`
                    Resolve ${agentLabel} and load its instructions, persona, and rules.
                `),
            };
        }
        case 'preparing_agent': {
            const knowledgeHint = describeKnowledgeHint(context);
            return {
                now: spaceTrim(`
                    Loading the instructions and configured commitments for ${agentLabel}${knowledgeHint}.
                `),
                next: spaceTrim(`
                    Check which tools, integrations, and attachments are usable for this turn.
                `),
            };
        }
        case 'checking_capabilities': {
            const capabilitiesText = describeCapabilities(context);
            return {
                now: spaceTrim(`
                    Verifying that ${agentLabel} can use ${capabilitiesText} for this answer.
                `),
                next: spaceTrim(`
                    Connect to the language model and start streaming the response.
                `),
            };
        }
        case 'starting_response': {
            const providerHint = describeProviderHint(context);
            const cacheHint = context?.isAgentKitCached === false
                ? ' Fresh runtime is being prepared because no cached agent was available.'
                : '';
            return {
                now: spaceTrim(`
                    Calling the language model${providerHint} and waiting for the first tokens.${cacheHint}
                `),
                next: spaceTrim(`
                    Stream the response and update this panel with each user-relevant decision, action, or result.
                `),
            };
        }
    }
}

/**
 * Returns the user-facing label for the active agent based on available context.
 *
 * @private internal helper of `composeUserChatProgressPhaseText`
 */
function describeAgent(context: UserChatProgressContext | undefined): string {
    if (context?.agentName) {
        return `agent **${context.agentName}**`;
    }

    if (context?.agentPermanentId) {
        return `agent \`${context.agentPermanentId}\``;
    }

    return 'the agent';
}

/**
 * Returns a fragment describing attachment count when one or more attachments are present.
 *
 * @private internal helper of `composeUserChatProgressPhaseText`
 */
function describeAttachmentHint(context: UserChatProgressContext | undefined): string {
    const count = context?.attachmentCount ?? 0;
    if (count <= 0) {
        return '';
    }

    return count === 1 ? ' and 1 attachment' : ` and ${count} attachments`;
}

/**
 * Returns a fragment describing knowledge sources when one or more are configured.
 *
 * @private internal helper of `composeUserChatProgressPhaseText`
 */
function describeKnowledgeHint(context: UserChatProgressContext | undefined): string {
    const count = context?.knowledgeSourceCount ?? 0;
    if (count <= 0) {
        return '';
    }

    return count === 1 ? ' (1 knowledge source)' : ` (${count} knowledge sources)`;
}

/**
 * Returns a fragment describing the LLM provider when already known.
 *
 * @private internal helper of `composeUserChatProgressPhaseText`
 */
function describeProviderHint(context: UserChatProgressContext | undefined): string {
    if (!context?.provider) {
        return '';
    }

    return ` via ${context.provider}`;
}

/**
 * Builds the markdown fragment describing tools, knowledge, attachments, and integrations.
 *
 * @private internal helper of `composeUserChatProgressPhaseText`
 */
function describeCapabilities(context: UserChatProgressContext | undefined): string {
    if (!context) {
        return 'its configured tools and inputs';
    }

    const fragments: Array<string> = [];

    const toolCount = context.toolCount ?? 0;
    if (toolCount > 0) {
        const highlights = (context.toolHighlights ?? []).filter((entry) => entry.trim().length > 0);
        if (highlights.length > 0) {
            fragments.push(`${toolCount === 1 ? '1 tool' : `${toolCount} tools`} (${highlights.join(', ')})`);
        } else {
            fragments.push(toolCount === 1 ? '1 tool' : `${toolCount} tools`);
        }
    }

    const knowledgeCount = context.knowledgeSourceCount ?? 0;
    if (knowledgeCount > 0) {
        fragments.push(knowledgeCount === 1 ? '1 knowledge source' : `${knowledgeCount} knowledge sources`);
    }

    const attachmentCount = context.attachmentCount ?? 0;
    if (attachmentCount > 0) {
        fragments.push(attachmentCount === 1 ? '1 attachment' : `${attachmentCount} attachments`);
    }

    const integrations: Array<string> = [];
    if (context.hasCalendarAccess) {
        integrations.push('calendar');
    }
    if (context.hasEmailAccess) {
        integrations.push('email');
    }
    if (context.hasProjectAccess) {
        integrations.push('project repository');
    }
    if (integrations.length > 0) {
        fragments.push(`${integrations.join(' / ')} access`);
    }

    if (fragments.length === 0) {
        return 'its configured instructions and inputs';
    }

    if (fragments.length === 1) {
        return fragments[0]!;
    }

    const head = fragments.slice(0, -1).join(', ');
    const tail = fragments[fragments.length - 1]!;
    return `${head}, and ${tail}`;
}

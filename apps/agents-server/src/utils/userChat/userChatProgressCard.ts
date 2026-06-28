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
 * Creates one user-facing durable chat progress card for the current job phase.
 *
 * The card carries one short, real-time status line for the lifecycle phase the worker is
 * actually in right now. The optional `context` is used to enrich that single line with
 * the agent name, provider, attachment count, or active integrations as soon as each piece
 * is resolved by the worker, so the user sees what the harness is doing at this moment
 * instead of a verbose scripted checklist of upcoming steps.
 */
export function createUserChatProgressCard(
    phase: UserChatProgressPhase,
    context?: UserChatProgressContext,
): NonNullable<ChatMessage['progressCard']> {
    return {
        now: composeUserChatProgressPhaseNow(phase, context),
        items: [],
        updatedAt: new Date().toISOString() as NonNullable<ChatMessage['progressCard']>['updatedAt'],
        isVisible: true,
    };
}

/**
 * Composes the short live status line shown for one durable chat phase.
 *
 * @private internal helper of `createUserChatProgressCard`
 */
function composeUserChatProgressPhaseNow(
    phase: UserChatProgressPhase,
    context: UserChatProgressContext | undefined,
): string {
    const agentLabel = describeAgent(context);

    switch (phase) {
        case 'queued':
            return spaceTrim(`
                Waiting for a worker to pick up your message...
            `);
        case 'reading_context': {
            const attachmentHint = describeAttachmentHint(context);
            return spaceTrim(`
                Reading your message${attachmentHint}...
            `);
        }
        case 'preparing_agent':
            return spaceTrim(`
                Loading ${agentLabel}...
            `);
        case 'checking_capabilities': {
            const capabilitiesText = describeCapabilities(context);
            return spaceTrim(`
                Checking ${capabilitiesText}...
            `);
        }
        case 'starting_response': {
            const providerHint = describeProviderHint(context);
            const cacheHint =
                context?.isAgentKitCached === false ? ' (preparing a fresh runtime)' : '';
            return spaceTrim(`
                Calling the language model${providerHint}${cacheHint}...
            `);
        }
    }
}

/**
 * Returns the user-facing label for the active agent based on available context.
 *
 * @private internal helper of `composeUserChatProgressPhaseNow`
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
 * @private internal helper of `composeUserChatProgressPhaseNow`
 */
function describeAttachmentHint(context: UserChatProgressContext | undefined): string {
    const count = context?.attachmentCount ?? 0;
    if (count <= 0) {
        return '';
    }

    return count === 1 ? ' and 1 attachment' : ` and ${count} attachments`;
}

/**
 * Returns a fragment describing the LLM provider when already known.
 *
 * @private internal helper of `composeUserChatProgressPhaseNow`
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
 * @private internal helper of `composeUserChatProgressPhaseNow`
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

'use client';

import type { TeamMemberUserChatContext } from '../../../../utils/userChat/teamMemberUserChatContext';

/**
 * Link shown in a frozen teammate chat back to the primary agent chat that requested the consultation.
 */
export function TeamMemberFrozenChatPrimaryAgentLink({ context }: { readonly context: TeamMemberUserChatContext }) {
    const primaryChatHref = buildPrimaryChatHref(context);

    return (
        <span className="ml-2 inline-flex items-center align-middle">
            <a
                href={primaryChatHref}
                className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-white dark:border-amber-500/40 dark:bg-transparent dark:text-amber-100"
                title={`Open the chat with ${context.primaryAgentName} that requested this consultation`}
            >
                Open {context.primaryAgentName} chat
            </a>
        </span>
    );
}

/**
 * Builds a canonical primary-agent chat route from a persisted teammate-chat relation.
 */
function buildPrimaryChatHref(context: TeamMemberUserChatContext): string {
    return `/agents/${encodeURIComponent(context.primaryAgentPermanentId)}/chat?chat=${encodeURIComponent(
        context.primaryChatId,
    )}`;
}

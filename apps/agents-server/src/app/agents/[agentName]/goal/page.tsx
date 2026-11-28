'use server';

import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { buildAgentGoalChatId, canAccessAgentGoalChat, ensureAgentGoalChat } from '@/src/utils/agentGoalChat';
import { resolveAgentAccess } from '@/src/utils/agentAccess';
import { buildExistingAgentChatHref } from '@/src/utils/agentRouting/agentRouteHrefs';
import { redirect } from 'next/navigation';
import { enforceCanonicalLocalAgentId, getAgentName } from '../_utils';

/**
 * Builds canonical goal-chat entry path for one local agent id.
 */
function buildCanonicalAgentGoalPath(canonicalAgentId: string): string {
    return `/agents/${encodeURIComponent(canonicalAgentId)}/goal`;
}

/**
 * Opens the singleton goal chat of one agent inside the regular chat surface.
 *
 * The goal chat is one of the agent's chats, so this route only resolves its deterministic id and
 * hands over to the shared chat page instead of duplicating the chat UI.
 */
export default async function AgentGoalChatPage({ params }: { params: Promise<{ agentName: string }> }) {
    const agentName = await getAgentName(params);
    const canonicalAgentId = await enforceCanonicalLocalAgentId(agentName, buildCanonicalAgentGoalPath);

    const access = await resolveAgentAccess(canonicalAgentId);
    if (!access.isAllowed || !(await canAccessAgentGoalChat())) {
        return <ForbiddenPage />;
    }

    await ensureAgentGoalChat(canonicalAgentId);

    redirect(buildExistingAgentChatHref(canonicalAgentId, buildAgentGoalChatId(canonicalAgentId)));
}

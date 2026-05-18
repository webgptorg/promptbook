'use server';

import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { resolveAgentAccess } from '@/src/utils/agentAccess';
import { enforceCanonicalLocalAgentId, getAgentName } from '../_utils';
import { AgentTimeoutsClient } from './AgentTimeoutsClient';

/**
 * Builds canonical timeout-manager path for one local agent id.
 */
function buildCanonicalAgentTimeoutsPath(canonicalAgentId: string): string {
    return `/agents/${encodeURIComponent(canonicalAgentId)}/timeouts`;
}

/**
 * Renders agent-scoped timeout manager across all chats.
 */
export default async function AgentTimeoutsPage({ params }: { params: Promise<{ agentName: string }> }) {
    const agentName = await getAgentName(params);
    const canonicalAgentId = await enforceCanonicalLocalAgentId(agentName, buildCanonicalAgentTimeoutsPath);

    const access = await resolveAgentAccess(canonicalAgentId);
    if (!access.isAllowed) {
        return <ForbiddenPage />;
    }

    return <AgentTimeoutsClient agentName={canonicalAgentId} />;
}

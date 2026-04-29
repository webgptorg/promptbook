'use server';

import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { resolveAgentAccess } from '@/src/utils/agentAccess';
import { notFound, redirect } from 'next/navigation';
import { resolveAgentRouteTarget } from '@/src/utils/agentRouting/resolveAgentRouteTarget';
import { getAgentName } from '../_utils';
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
    const routeTarget = await resolveAgentRouteTarget(agentName);

    if (routeTarget === null) {
        notFound();
    }

    if (routeTarget.kind === 'remote') {
        redirect(routeTarget.url);
    }

    if (routeTarget.kind === 'pseudo') {
        redirect(routeTarget.canonicalUrl);
    }

    const canonicalAgentId = routeTarget.canonicalAgentId;
    if (agentName !== canonicalAgentId) {
        redirect(buildCanonicalAgentTimeoutsPath(canonicalAgentId));
    }

    const access = await resolveAgentAccess(canonicalAgentId);
    if (!access.isAllowed) {
        return <ForbiddenPage />;
    }

    return <AgentTimeoutsClient agentName={canonicalAgentId} />;
}

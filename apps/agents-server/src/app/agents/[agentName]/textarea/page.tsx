'use server';

import { notFound, redirect } from 'next/navigation';
import { resolveAgentRouteTarget } from '../../../../utils/agentRouting/resolveAgentRouteTarget';
import { getAgentName } from '../_utils';
import { AgentTextareaClient } from './AgentTextareaClient';

/**
 * Builds canonical textarea route path for one agent.
 *
 * @param canonicalAgentId - Canonical permanent identifier of the local agent.
 * @returns Canonical textarea route path.
 */
function buildCanonicalAgentTextareaPath(canonicalAgentId: string): string {
    return `/agents/${encodeURIComponent(canonicalAgentId)}/textarea`;
}

/**
 * Renders the minimal textarea-first entry page for an agent chat.
 *
 * @param params - Route params containing the agent identifier.
 * @returns Centered textarea page that forwards messages into the existing chat pipeline.
 */
export default async function AgentTextareaPage({ params }: { params: Promise<{ agentName: string }> }) {
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
        redirect(buildCanonicalAgentTextareaPath(canonicalAgentId));
    }

    return <AgentTextareaClient agentName={canonicalAgentId} />;
}

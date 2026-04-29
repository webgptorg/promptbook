'use server';

import { notFound, redirect } from 'next/navigation';
import { $provideServer } from '@/src/tools/$provideServer';
import { resolveAgentAvatarImageUrl } from '../../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { formatAgentNamingText } from '../../../../utils/agentNaming';
import { resolveAgentChatInputPlaceholder } from '../../../../utils/agentChatInputPlaceholder';
import { resolveAgentRouteTarget } from '../../../../utils/agentRouting/resolveAgentRouteTarget';
import { getAgentNaming } from '../../../../utils/getAgentNaming';
import { getAgentName, getAgentProfile } from '../_utils';
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

    const [{ publicUrl }, agentProfile, agentNaming] = await Promise.all([
        $provideServer(),
        getAgentProfile(canonicalAgentId),
        getAgentNaming(),
    ]);
    const fallbackAgentName = formatAgentNamingText('Agent', agentNaming);
    const agentDisplayName = (agentProfile.meta.fullname || agentProfile.agentName || fallbackAgentName) as string;
    const inputPlaceholder = resolveAgentChatInputPlaceholder(agentProfile.meta.inputPlaceholder);
    const fallbackAvatarPath = `/agents/${encodeURIComponent(agentProfile.permanentId || canonicalAgentId)}/images/default-avatar.png`;
    const agentAvatarSrc =
        resolveAgentAvatarImageUrl({ agent: agentProfile, baseUrl: publicUrl.href }) || fallbackAvatarPath;

    return (
        <AgentTextareaClient
            agentName={canonicalAgentId}
            agentDisplayName={agentDisplayName}
            agentAvatarSrc={agentAvatarSrc}
            agentBrandColor={agentProfile.meta.color}
            inputPlaceholder={inputPlaceholder}
        />
    );
}

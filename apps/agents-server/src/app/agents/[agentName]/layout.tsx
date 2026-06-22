'use server';

import type { Metadata } from 'next';
import { resolveAgentRouteTarget } from '../../../utils/agentRouting/resolveAgentRouteTarget';
import { ActiveAgentBreadcrumbBinder } from './ActiveAgentBreadcrumbBinder';
import { getAgentName, getAgentProfile } from './_utils';
import { generateAgentMetadata } from './generateAgentMetadata';
import type { ActiveAgentBreadcrumbInfo } from '../../../components/Header/ActiveAgentBreadcrumbContext';

/**
 * Generates shared branded metadata for all pages under `/agents/[agentName]`.
 *
 * @param params - Dynamic route parameters with `agentName`.
 * @returns Metadata used by Next.js head rendering.
 */
export async function generateMetadata({ params }: { params: Promise<{ agentName: string }> }): Promise<Metadata> {
    return generateAgentMetadata({ params });
}

/**
 * Resolves the breadcrumb info for the route's active agent so the Header can show its name
 * instead of falling back to the URL identifier. Failures are swallowed because the layout
 * must keep rendering even when the agent cannot be resolved (the page will handle the error).
 *
 * @param rawAgentIdentifier - Decoded route parameter for the active agent.
 * @returns Breadcrumb info for the active agent or `null` when unavailable.
 *
 * @private function of agent routes
 */
async function tryResolveActiveAgentBreadcrumbInfo(
    rawAgentIdentifier: string,
): Promise<ActiveAgentBreadcrumbInfo | null> {
    try {
        const routeTarget = await resolveAgentRouteTarget(rawAgentIdentifier);
        if (!routeTarget || routeTarget.kind !== 'local') {
            return null;
        }

        const agentProfile = await getAgentProfile(routeTarget.canonicalAgentId);

        return {
            agentName: agentProfile.agentName,
            agentHash: agentProfile.agentHash,
            permanentId: agentProfile.permanentId,
            meta: agentProfile.meta,
        };
    } catch {
        return null;
    }
}

/**
 * Shared route layout for all pages under `/agents/[agentName]`.
 */
export default async function AgentLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ agentName: string }>;
}>) {
    const rawAgentIdentifier = await getAgentName(params);
    const activeAgentBreadcrumbInfo = await tryResolveActiveAgentBreadcrumbInfo(rawAgentIdentifier);

    return (
        <>
            {activeAgentBreadcrumbInfo && <ActiveAgentBreadcrumbBinder agent={activeAgentBreadcrumbInfo} />}
            {children}
        </>
    );
}

'use server';

import { redirect } from 'next/navigation';
import { getAgentName } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';

export const generateMetadata = generateAgentMetadata;

/**
 * Builds legacy `/iframe` redirect target and preserves supported query parameters.
 *
 * @param agentName - Agent route token from params.
 * @param search - Supported query parameters from the iframe route.
 * @returns Redirect target path that points to canonical embed route.
 */
function buildLegacyIframeRedirectPath(
    agentName: string,
    search: { message?: string; chat?: string; newChat?: string },
): string {
    const params = new URLSearchParams();
    params.set('headless', '');
    if (search.chat !== undefined) {
        params.set('chat', search.chat);
    }
    if (search.message !== undefined) {
        params.set('message', search.message);
    }
    if (search.newChat !== undefined) {
        params.set('newChat', search.newChat);
    }

    return `/agents/${encodeURIComponent(agentName)}/chat?${params.toString()}`;
}

/**
 * Redirects deprecated iframe route to canonical headless chat route.
 */
export default async function AgentIframePage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ message?: string; chat?: string; newChat?: string }>;
}) {
    const agentName = await getAgentName(params);
    const currentSearchParams = await searchParams;
    redirect(buildLegacyIframeRedirectPath(agentName, currentSearchParams));
}

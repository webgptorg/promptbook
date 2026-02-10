'use server';

import { generateAgentMetadata } from './generateAgentMetadata';
import { AgentProfileScene } from './AgentProfileScene';

export const generateMetadata = generateAgentMetadata;

/**
 * Loads and renders the full agent profile experience located at `/agents/[agentName]`.
 *
 * @param params - Route parameters provided by Next.js.
 * @param searchParams - Query string values that may include headless mode.
 * @returns The agent profile scene.
 * @private @@@
 */
export default async function AgentPage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ headless?: string }>;
}) {
    const { headless: headlessParam } = await searchParams;
    const isHeadless = headlessParam !== undefined;

    return <AgentProfileScene params={params} isHeadless={isHeadless} />;
}

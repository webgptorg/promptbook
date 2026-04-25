'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { AgentCodePageClient } from './AgentCodePageClient';

/**
 * Handles agent code page.
 */
export default async function AgentCodePage({ params }: { params: Promise<{ agentName: string }> }) {
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const { publicUrl } = await $provideServer();
    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(agentName);

    return <AgentCodePageClient agentName={agentName} publicUrl={publicUrl.href} agentSource={agentSource} />;
}

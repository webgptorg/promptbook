'use server';

import { $provideServer } from '@/src/tools/$provideServer';
import { AgentCodePageClient } from './AgentCodePageClient';

/**
 * Handles agent code page.
 */
export default async function AgentCodePage({ params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;
    const { publicUrl } = await $provideServer();

    return <AgentCodePageClient agentName={agentName} publicUrl={publicUrl.href} />;
}

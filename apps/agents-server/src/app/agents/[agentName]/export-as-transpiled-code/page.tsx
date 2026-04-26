'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { $provideServer } from '@/src/tools/$provideServer';
import { resolveServerAgentContext } from '@/src/utils/resolveServerAgentContext';
import { createTranspiledAgentExportWarnings } from '../../../../utils/transpilers/createTranspiledAgentExportWarnings';
import { AgentCodePageClient } from './AgentCodePageClient';

/**
 * Handles agent code page.
 */
export default async function AgentCodePage({ params }: { params: Promise<{ agentName: string }> }) {
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const { publicUrl } = await $provideServer();
    const collection = await $provideAgentCollectionForServer();
    const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
    const resolvedAgentContext = await resolveServerAgentContext({
        collection,
        agentIdentifier: agentName,
        localServerUrl: publicUrl.href,
        fallbackResolver: baseAgentReferenceResolver,
    });

    return (
        <AgentCodePageClient
            agentName={agentName}
            publicUrl={publicUrl.href}
            agentSource={resolvedAgentContext.unresolvedAgentSource}
            transpilationWarnings={createTranspiledAgentExportWarnings(resolvedAgentContext.resolvedAgentSource)}
        />
    );
}

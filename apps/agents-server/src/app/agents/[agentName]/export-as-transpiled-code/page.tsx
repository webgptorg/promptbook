'use server';

import type { string_book } from '@promptbook-local/types';
import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { $provideServer } from '@/src/tools/$provideServer';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { resolveServerAgentContext } from '@/src/utils/resolveServerAgentContext';
import {
    getTranspiledAgentExportWarnings,
    type TranspiledAgentExportWarning,
} from '../../../../utils/transpilers/getTranspiledAgentExportWarnings';
import { enforceCanonicalLocalAgentId, getAgentName } from '../_utils';
import { AgentCodePageClient } from './AgentCodePageClient';

/**
 * Builds canonical transpiled-code export path for one local agent id.
 */
function buildCanonicalAgentCodeExportPath(canonicalAgentId: string): string {
    return `/agents/${encodeURIComponent(canonicalAgentId)}/export-as-transpiled-code`;
}

/**
 * Handles agent code page.
 */
export default async function AgentCodePage({ params }: { params: Promise<{ agentName: string }> }) {
    if (!(await getCurrentUser())) {
        return <ForbiddenPage />;
    }

    const agentIdentifier = await getAgentName(params);
    const agentName = await enforceCanonicalLocalAgentId(agentIdentifier, buildCanonicalAgentCodeExportPath);
    const { publicUrl } = await $provideServer();
    const collection = await $provideAgentCollectionForServer();
    let agentSource = '' as string_book;
    let exportWarnings: Array<TranspiledAgentExportWarning> = [];

    try {
        // Prefer the resolved export source so inherited commitments are included in the warning.
        const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
        const resolvedAgentContext = await resolveServerAgentContext({
            collection,
            agentIdentifier: agentName,
            localServerUrl: publicUrl.href,
            fallbackResolver: baseAgentReferenceResolver,
        });

        agentSource = resolvedAgentContext.unresolvedAgentSource;
        exportWarnings = getTranspiledAgentExportWarnings(resolvedAgentContext.resolvedAgentSource);
    } catch (error) {
        console.warn('Error resolving export warnings for transpiled code page:', error);

        // Keep the export page functional even if the resolved-source warning path fails.
        agentSource = await collection.getAgentSource(agentName);
        exportWarnings = getTranspiledAgentExportWarnings(agentSource);
    }

    return (
        <AgentCodePageClient
            agentName={agentName}
            publicUrl={publicUrl.href}
            agentSource={agentSource}
            exportWarnings={exportWarnings}
        />
    );
}

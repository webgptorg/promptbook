import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { consumeAgentReferenceResolutionIssues } from '@/src/utils/agentReferenceResolver/AgentReferenceResolutionIssue';
import { createInlineKnowledgeSourceUploader } from '@/src/utils/knowledge/createInlineKnowledgeSourceUploader';
import { createAgentModelRequirements } from '@promptbook-local/core';
import type { AgentModelRequirements, string_book } from '@promptbook-local/types';
import type { AgentReferenceResolver } from '../../../../../../src/book-2.0/agent-source/AgentReferenceResolver';

/**
 * Resolves AgentKit model requirements, reusing a caller-provided result when available.
 *
 * @private function of AgentKitCacheManager
 */
export async function resolveAgentKitModelRequirements(options: {
    readonly baseAgentSource: string_book;
    readonly agentReferenceResolver?: AgentReferenceResolver;
    readonly modelRequirements?: AgentModelRequirements;
}): Promise<AgentModelRequirements> {
    if (options.modelRequirements) {
        return options.modelRequirements;
    }

    const effectiveAgentReferenceResolver = options.agentReferenceResolver || (await $provideAgentReferenceResolver());
    const resolvedModelRequirements = await createAgentModelRequirements(
        options.baseAgentSource,
        undefined,
        undefined,
        undefined,
        {
            agentReferenceResolver: effectiveAgentReferenceResolver,
            inlineKnowledgeSourceUploader: createInlineKnowledgeSourceUploader(),
        },
    );
    const unresolvedAgentReferences = consumeAgentReferenceResolutionIssues(effectiveAgentReferenceResolver);

    if (unresolvedAgentReferences.length > 0) {
        console.warn('[AgentKitCacheManager] Unresolved agent references detected:', unresolvedAgentReferences);
    }

    return resolvedModelRequirements;
}

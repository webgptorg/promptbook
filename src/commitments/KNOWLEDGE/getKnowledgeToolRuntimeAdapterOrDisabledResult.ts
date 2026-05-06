import type {
    KnowledgeToolRuntimeAdapter,
    KnowledgeToolRuntimeContext,
    SearchKnowledgeToolResult,
} from './KnowledgeToolRuntimeAdapter';
import { getKnowledgeToolRuntimeAdapter } from './setKnowledgeToolRuntimeAdapter';

/**
 * Return type of KNOWLEDGE adapter resolution helper.
 *
 * @private type of KnowledgeCommitmentDefinition
 */
type KnowledgeToolRuntimeAdapterResolution = {
    adapter: KnowledgeToolRuntimeAdapter | null;
    disabledResult: SearchKnowledgeToolResult | null;
};

/**
 * Gets the runtime adapter and returns a disabled result when unavailable.
 *
 * @private function of KnowledgeCommitmentDefinition
 */
export function getKnowledgeToolRuntimeAdapterOrDisabledResult(
    runtimeContext: KnowledgeToolRuntimeContext,
): KnowledgeToolRuntimeAdapterResolution {
    if (!runtimeContext.enabled || !runtimeContext.agentId) {
        return {
            adapter: null,
            disabledResult: {
                action: 'search',
                status: 'disabled',
                query: '',
                sources: [],
                message: 'Knowledge search is unavailable because agent context is missing.',
            },
        };
    }

    const knowledgeToolRuntimeAdapter = getKnowledgeToolRuntimeAdapter();
    if (!knowledgeToolRuntimeAdapter) {
        return {
            adapter: null,
            disabledResult: {
                action: 'search',
                status: 'disabled',
                query: '',
                sources: [],
                message: 'Knowledge runtime is not available in this environment.',
            },
        };
    }

    return {
        adapter: knowledgeToolRuntimeAdapter,
        disabledResult: null,
    };
}

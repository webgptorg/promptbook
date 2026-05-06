import type { KnowledgeToolRuntimeAdapter } from './KnowledgeToolRuntimeAdapter';

/**
 * Runtime adapter used by KNOWLEDGE tool functions.
 *
 * @private function of KnowledgeCommitmentDefinition
 */
let knowledgeToolRuntimeAdapter: KnowledgeToolRuntimeAdapter | null = null;

/**
 * Sets runtime adapter used by KNOWLEDGE commitment tools.
 *
 * @private function of KnowledgeCommitmentDefinition
 */
export function setKnowledgeToolRuntimeAdapter(adapter: KnowledgeToolRuntimeAdapter | null): void {
    knowledgeToolRuntimeAdapter = adapter;
}

/**
 * Gets runtime adapter used by KNOWLEDGE commitment tools.
 *
 * @private function of KnowledgeCommitmentDefinition
 */
export function getKnowledgeToolRuntimeAdapter(): KnowledgeToolRuntimeAdapter | null {
    return knowledgeToolRuntimeAdapter;
}

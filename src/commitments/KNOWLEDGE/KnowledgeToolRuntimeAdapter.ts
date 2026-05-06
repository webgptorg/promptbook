import type { TODO_any } from '../../_packages/types.index';

/**
 * One retrieved knowledge source returned by runtime adapters.
 *
 * @private type of KnowledgeCommitmentDefinition
 */
export type KnowledgeToolSource = {
    id?: string;
    name: string;
    url?: string;
    excerpt?: string;
    score?: number;
};

/**
 * Tool arguments for knowledge search.
 *
 * @private type of KnowledgeCommitmentDefinition
 */
export type SearchKnowledgeToolArgs = {
    query?: string;
    limit?: number;
    [key: string]: TODO_any;
};

/**
 * Runtime context for KNOWLEDGE tools resolved from hidden tool arguments.
 *
 * @private type of KnowledgeCommitmentDefinition
 */
export type KnowledgeToolRuntimeContext = {
    readonly enabled: boolean;
    readonly agentId?: string;
    readonly agentName?: string;
};

/**
 * Result payload returned by the knowledge-search tool.
 *
 * @private type of KnowledgeCommitmentDefinition
 */
export type SearchKnowledgeToolResult = {
    action: 'search';
    status: 'ok' | 'disabled' | 'error';
    query: string;
    sources: KnowledgeToolSource[];
    message?: string;
};

/**
 * Runtime adapter interface used by KNOWLEDGE tools.
 *
 * @private type of KnowledgeCommitmentDefinition
 */
export type KnowledgeToolRuntimeAdapter = {
    searchKnowledge(
        args: {
            query: string;
            limit?: number;
        },
        runtimeContext: KnowledgeToolRuntimeContext,
    ): Promise<KnowledgeToolSource[]>;
};

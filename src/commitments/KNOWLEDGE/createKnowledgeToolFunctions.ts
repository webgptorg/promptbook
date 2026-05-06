import { createToolExecutionEnvelope } from '../_common/toolExecutionEnvelope';
import type { string_javascript_name } from '../../_packages/types.index';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { KnowledgeToolNames } from './KnowledgeToolNames';
import { getKnowledgeToolRuntimeAdapterOrDisabledResult } from './getKnowledgeToolRuntimeAdapterOrDisabledResult';
import { resolveKnowledgeRuntimeContext } from './resolveKnowledgeRuntimeContext';
import type { SearchKnowledgeToolArgs, SearchKnowledgeToolResult } from './KnowledgeToolRuntimeAdapter';

/**
 * Gets KNOWLEDGE tool function implementations.
 *
 * @private function of KnowledgeCommitmentDefinition
 */
export function createKnowledgeToolFunctions(): Record<string_javascript_name, ToolFunction> {
    return {
        async [KnowledgeToolNames.search](args: SearchKnowledgeToolArgs): Promise<string> {
            const runtimeContext = resolveKnowledgeRuntimeContext(args);
            const { adapter, disabledResult } = getKnowledgeToolRuntimeAdapterOrDisabledResult(runtimeContext);
            const query = typeof args.query === 'string' ? args.query.trim() : '';
            const limit = normalizeKnowledgeToolLimit(args.limit);

            if (!adapter || disabledResult) {
                const result: SearchKnowledgeToolResult = {
                    ...(disabledResult || {
                        action: 'search',
                        status: 'disabled',
                        query,
                        sources: [],
                    }),
                    query,
                };

                return createToolExecutionEnvelope({
                    assistantMessage: JSON.stringify(result),
                    toolResult: result,
                });
            }

            if (!query) {
                const result: SearchKnowledgeToolResult = {
                    action: 'search',
                    status: 'error',
                    query,
                    sources: [],
                    message: 'Knowledge search query is required.',
                };

                return createToolExecutionEnvelope({
                    assistantMessage: JSON.stringify(result),
                    toolResult: result,
                });
            }

            try {
                const sources = await adapter.searchKnowledge({ query, limit }, runtimeContext);
                const result: SearchKnowledgeToolResult = {
                    action: 'search',
                    status: 'ok',
                    query,
                    sources,
                };

                return createToolExecutionEnvelope({
                    assistantMessage: JSON.stringify(result),
                    toolResult: result,
                });
            } catch (error) {
                const result: SearchKnowledgeToolResult = {
                    action: 'search',
                    status: 'error',
                    query,
                    sources: [],
                    message: error instanceof Error ? error.message : String(error),
                };

                return createToolExecutionEnvelope({
                    assistantMessage: JSON.stringify(result),
                    toolResult: result,
                });
            }
        },
    };
}

/**
 * Normalizes the optional `limit` argument for knowledge search.
 *
 * @private function of KnowledgeCommitmentDefinition
 */
function normalizeKnowledgeToolLimit(limit: unknown): number | undefined {
    if (typeof limit !== 'number' || !Number.isFinite(limit)) {
        return undefined;
    }

    return Math.max(1, Math.min(8, Math.trunc(limit)));
}

import { KNOWLEDGE_SEARCH_TOOL_NAME } from '../../../../src/commitments/KNOWLEDGE/KNOWLEDGE';
import { createToolExecutionEnvelope } from '../../../../src/commitments/_common/toolExecutionEnvelope';
import {
    emitToolCallProgressFromToolArgs,
    readToolRuntimeContextFromToolArgs,
} from '../../../../src/commitments/_common/toolRuntimeContext';
import type { ToolFunction } from '../../../../src/scripting/javascript/JavascriptExecutionToolsOptions';
import type { TODO_any } from '../../../../src/utils/organization/TODO_any';
import { KnowledgeIndexCacheManager } from '../utils/knowledgeIndex/KnowledgeIndexCacheManager';
import type { KnowledgeSearchToolResult } from '../utils/knowledgeIndex/KnowledgeSearchResult';

/**
 * Maximum accepted `knowledge_search.limit` value.
 */
const MAX_KNOWLEDGE_SEARCH_TOOL_LIMIT = 10;

/**
 * Arguments accepted by the `knowledge_search` tool.
 */
type KnowledgeSearchToolArgs = {
    readonly query?: unknown;
    readonly limit?: unknown;
};

/**
 * Server implementation of the `knowledge_search` tool.
 */
export const knowledge_search: ToolFunction = async (args: KnowledgeSearchToolArgs): Promise<string> => {
    const runtimeContext = readToolRuntimeContextFromToolArgs(args as Record<string, TODO_any>);
    const knowledgeSources = normalizeKnowledgeSources(runtimeContext?.knowledge?.sources);
    const query = normalizeSearchQuery(args.query);
    const limit = normalizeSearchLimit(args.limit);
    const agentName =
        normalizeOptionalText(runtimeContext?.chat?.agentName) ||
        normalizeOptionalText(runtimeContext?.memory?.agentName) ||
        'Agent';

    emitToolCallProgressFromToolArgs(args as Record<string, TODO_any>, {
        state: 'PARTIAL',
        log: {
            kind: 'knowledge-search',
            title: 'Searching knowledge',
            message: query ? `Searching ${knowledgeSources.length} configured knowledge source(s).` : 'Preparing search.',
        },
    });

    const result = await new KnowledgeIndexCacheManager({ isVerbose: true }).searchKnowledgeIndex({
        agentName,
        knowledgeSources,
        query,
        limit,
    });

    return createToolExecutionEnvelope({
        assistantMessage: createKnowledgeSearchAssistantMessage(result),
        toolResult: result,
    });
};

/**
 * Tool function map registered by the Agents Server runtime.
 */
export const KNOWLEDGE_SEARCH_TOOL_FUNCTIONS: Record<string, ToolFunction> = {
    [KNOWLEDGE_SEARCH_TOOL_NAME]: knowledge_search,
};

/**
 * Creates a concise assistant-visible tool response.
 */
function createKnowledgeSearchAssistantMessage(result: KnowledgeSearchToolResult): string {
    if (result.status !== 'ready') {
        return result.message;
    }

    if (result.results.length === 0) {
        return 'No relevant knowledge excerpts were found.';
    }

    const lines = [`Found ${result.results.length} relevant knowledge excerpt(s):`];

    for (const item of result.results) {
        lines.push(`${item.citation} ${item.source}`);
        lines.push(item.excerpt);
    }

    return lines.join('\n\n');
}

/**
 * Normalizes configured runtime knowledge sources.
 */
function normalizeKnowledgeSources(rawSources: unknown): string[] {
    if (!Array.isArray(rawSources)) {
        return [];
    }

    const sources: string[] = [];
    const seenSources = new Set<string>();

    for (const rawSource of rawSources) {
        const source = normalizeOptionalText(rawSource);

        if (!source || seenSources.has(source)) {
            continue;
        }

        sources.push(source);
        seenSources.add(source);
    }

    return sources;
}

/**
 * Normalizes the required query argument.
 */
function normalizeSearchQuery(value: unknown): string {
    return normalizeOptionalText(value) || '';
}

/**
 * Normalizes the optional result limit argument.
 */
function normalizeSearchLimit(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
        return undefined;
    }

    return Math.min(Math.max(parsed, 1), MAX_KNOWLEDGE_SEARCH_TOOL_LIMIT);
}

/**
 * Normalizes optional text.
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed || undefined;
}

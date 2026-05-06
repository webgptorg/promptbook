import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import { KnowledgeToolNames } from '../../../../../src/commitments/KNOWLEDGE/KnowledgeToolNames';
import type {
    KnowledgeToolSource,
    SearchKnowledgeToolResult,
} from '../../../../../src/commitments/KNOWLEDGE/KnowledgeToolRuntimeAdapter';

/**
 * Extracts structured used sources from completed knowledge-search tool calls.
 */
export function extractUsedKnowledgeSourcesFromToolCalls(
    toolCalls: ReadonlyArray<ToolCall> | undefined,
): ChatMessage['usedSources'] {
    if (!toolCalls || toolCalls.length === 0) {
        return undefined;
    }

    const usedSources = new Map<string, NonNullable<ChatMessage['usedSources']>[number]>();

    for (const toolCall of toolCalls) {
        if (toolCall.name !== KnowledgeToolNames.search) {
            continue;
        }

        const parsedResult = parseKnowledgeSearchToolResult(toolCall.result);
        if (!parsedResult || parsedResult.status !== 'ok') {
            continue;
        }

        for (const source of parsedResult.sources) {
            const deduplicationKey = `${source.url || ''}|${source.name}|${source.excerpt || ''}`;

            if (!usedSources.has(deduplicationKey)) {
                usedSources.set(deduplicationKey, {
                    id: source.id,
                    name: source.name,
                    url: source.url,
                    excerpt: source.excerpt,
                    score: source.score,
                    toolName: toolCall.name,
                });
            }
        }
    }

    return usedSources.size > 0 ? [...usedSources.values()] : undefined;
}

/**
 * Parses one tool result into a normalized knowledge-search payload.
 *
 * @private function of `extractUsedKnowledgeSourcesFromToolCalls`
 */
function parseKnowledgeSearchToolResult(rawValue: unknown): SearchKnowledgeToolResult | null {
    const parsedValue =
        typeof rawValue === 'string'
            ? safelyParseJson(rawValue)
            : rawValue && typeof rawValue === 'object'
            ? rawValue
            : null;

    if (!parsedValue || typeof parsedValue !== 'object') {
        return null;
    }

    const action = (parsedValue as Partial<SearchKnowledgeToolResult>).action;
    const sources = (parsedValue as Partial<SearchKnowledgeToolResult>).sources;

    if (action !== 'search' || !Array.isArray(sources)) {
        return null;
    }

    return {
        action,
        status:
            (parsedValue as Partial<SearchKnowledgeToolResult>).status === 'ok'
                ? 'ok'
                : (parsedValue as Partial<SearchKnowledgeToolResult>).status || 'error',
        query: typeof (parsedValue as Partial<SearchKnowledgeToolResult>).query === 'string'
            ? (parsedValue as Partial<SearchKnowledgeToolResult>).query || ''
            : '',
        sources: sources.filter(isKnowledgeToolSource),
        message:
            typeof (parsedValue as Partial<SearchKnowledgeToolResult>).message === 'string'
                ? (parsedValue as Partial<SearchKnowledgeToolResult>).message
                : undefined,
    };
}

/**
 * Type guard for one retrieved knowledge source.
 *
 * @private function of `extractUsedKnowledgeSourcesFromToolCalls`
 */
function isKnowledgeToolSource(source: unknown): source is KnowledgeToolSource {
    return Boolean(source && typeof source === 'object' && typeof (source as KnowledgeToolSource).name === 'string');
}

/**
 * Safely parses optional JSON payloads.
 *
 * @private function of `extractUsedKnowledgeSourcesFromToolCalls`
 */
function safelyParseJson(rawValue: string): unknown {
    try {
        return JSON.parse(rawValue);
    } catch {
        return null;
    }
}

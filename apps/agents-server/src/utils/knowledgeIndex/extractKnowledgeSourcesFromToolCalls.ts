import { KNOWLEDGE_SEARCH_TOOL_NAME } from '../../../../../src/commitments/KNOWLEDGE/KNOWLEDGE';
import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import type { KnowledgeSearchToolResult } from './KnowledgeSearchResult';

/**
 * Extracts structured message sources from completed `knowledge_search` tool calls.
 */
export function extractKnowledgeSourcesFromToolCalls(
    toolCalls: ReadonlyArray<ToolCall> | undefined,
): ReadonlyArray<NonNullable<ChatMessage['sources']>[number]> | undefined {
    if (!toolCalls || toolCalls.length === 0) {
        return undefined;
    }

    const sources: Array<NonNullable<ChatMessage['sources']>[number]> = [];
    const seenSourceKeys = new Set<string>();

    for (const toolCall of toolCalls) {
        if (toolCall.name !== KNOWLEDGE_SEARCH_TOOL_NAME) {
            continue;
        }

        const result = parseKnowledgeSearchToolResult(toolCall.result);
        if (!result || result.status !== 'ready') {
            continue;
        }

        for (const item of result.results) {
            const sourceKey = JSON.stringify({
                id: item.id,
                source: item.source,
                url: item.url,
            });

            if (seenSourceKeys.has(sourceKey)) {
                continue;
            }

            seenSourceKeys.add(sourceKey);
            sources.push({
                id: item.id,
                source: item.source,
                ...(item.url ? { url: item.url } : {}),
                ...(item.excerpt ? { excerpt: item.excerpt } : {}),
                ...(typeof item.score === 'number' ? { score: item.score } : {}),
            });
        }
    }

    return sources.length > 0 ? sources : undefined;
}

/**
 * Converts knowledge-search sources into the legacy citation field used by source chips.
 */
export function extractKnowledgeCitationsFromToolCalls(
    toolCalls: ReadonlyArray<ToolCall> | undefined,
): ChatMessage['citations'] | undefined {
    const sources = extractKnowledgeSourcesFromToolCalls(toolCalls);

    return sources?.map((source) => ({
        id: source.id,
        source: source.source,
        ...(source.url ? { url: source.url } : {}),
        ...(source.excerpt ? { excerpt: source.excerpt } : {}),
    }));
}

/**
 * Applies knowledge-search sources and citations to a chat message.
 */
export function applyKnowledgeSourcesToChatMessage(
    message: ChatMessage,
    toolCalls: ReadonlyArray<ToolCall> | undefined,
): ChatMessage {
    const sources = extractKnowledgeSourcesFromToolCalls(toolCalls);

    if (!sources || sources.length === 0) {
        return message;
    }

    return {
        ...message,
        sources: mergeMessageSources(message.sources, sources),
        citations: mergeMessageCitations(message.citations, sources),
    };
}

/**
 * Parses the structured result stored on a `knowledge_search` tool call.
 */
function parseKnowledgeSearchToolResult(value: unknown): KnowledgeSearchToolResult | null {
    if (!value) {
        return null;
    }

    if (typeof value === 'string') {
        try {
            return parseKnowledgeSearchToolResult(JSON.parse(value));
        } catch {
            return null;
        }
    }

    if (typeof value !== 'object') {
        return null;
    }

    const candidate = value as Partial<KnowledgeSearchToolResult>;
    if (candidate.status !== 'ready' || !Array.isArray(candidate.results)) {
        return null;
    }

    return candidate as KnowledgeSearchToolResult;
}

/**
 * Merges existing message sources with incoming knowledge-search sources.
 */
function mergeMessageSources(
    existingSources: ChatMessage['sources'],
    incomingSources: ReadonlyArray<NonNullable<ChatMessage['sources']>[number]>,
): NonNullable<ChatMessage['sources']> {
    const mergedSources = [...(existingSources || [])];
    const seenKeys = new Set(mergedSources.map(createMessageSourceKey));

    for (const source of incomingSources) {
        const key = createMessageSourceKey(source);
        if (seenKeys.has(key)) {
            continue;
        }

        seenKeys.add(key);
        mergedSources.push(source);
    }

    return mergedSources;
}

/**
 * Merges existing citations with knowledge-search sources for legacy source-chip consumers.
 */
function mergeMessageCitations(
    existingCitations: ChatMessage['citations'],
    incomingSources: ReadonlyArray<NonNullable<ChatMessage['sources']>[number]>,
): NonNullable<ChatMessage['citations']> {
    const mergedCitations = [...(existingCitations || [])];
    const seenKeys = new Set(mergedCitations.map(createMessageSourceKey));

    for (const source of incomingSources) {
        const key = createMessageSourceKey(source);
        if (seenKeys.has(key)) {
            continue;
        }

        seenKeys.add(key);
        mergedCitations.push({
            id: source.id,
            source: source.source,
            ...(source.url ? { url: source.url } : {}),
            ...(source.excerpt ? { excerpt: source.excerpt } : {}),
        });
    }

    return mergedCitations;
}

/**
 * Creates a stable identity for one message source or citation.
 */
function createMessageSourceKey(source: { readonly id: string; readonly source: string; readonly url?: string }): string {
    return JSON.stringify({
        id: source.id,
        source: source.source,
        url: source.url,
    });
}

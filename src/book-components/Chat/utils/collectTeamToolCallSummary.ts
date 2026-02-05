import { isAssistantPreparationToolCall, type ToolCall } from '../../../types/ToolCall';
import { isTeamToolName } from './createTeamToolNameFromUrl';
import type { ParsedCitation } from './parseCitationsFromContent';
import { parseCitationsFromContent } from './parseCitationsFromContent';
import { parseTeamToolResult, parseToolCallResult, type TeamToolResult } from './toolCallParsing';

/**
 * Origin metadata for a tool call or citation executed by a teammate.
 *
 * @private utility of `<Chat/>`
 */
export type ToolCallOrigin = {
    /**
     * Human-readable label for the teammate.
     */
    label: string;
    /**
     * Optional teammate URL.
     */
    url?: string;
    /**
     * Optional tool name for the teammate.
     */
    toolName?: string;
};

/**
 * Tool call data enriched with its teammate origin.
 *
 * @private utility of `<Chat/>`
 */
export type TransitiveToolCall = {
    /**
     * Tool call executed by the teammate.
     */
    toolCall: ToolCall;
    /**
     * Teammate origin metadata for the tool call.
     */
    origin: ToolCallOrigin;
};

/**
 * Citation data enriched with its teammate origin.
 *
 * @private utility of `<Chat/>`
 */
export type TransitiveCitation = ParsedCitation & {
    /**
     * Teammate origin metadata for the citation.
     */
    origin: ToolCallOrigin;
};

/**
 * Aggregated teammate tool calls and citations derived from TEAM tool results.
 *
 * @private utility of `<Chat/>`
 */
export type TeamToolCallSummary = {
    /**
     * Tool calls executed by teammates, flattened transitively.
     */
    toolCalls: TransitiveToolCall[];
    /**
     * Citations referenced by teammates, flattened transitively.
     */
    citations: TransitiveCitation[];
};

/**
 * Collects tool calls and citations from TEAM tool call results, resolving nested teammate chains.
 *
 * @param toolCalls - Tool calls from the top-level agent message.
 * @private utility of `<Chat/>`
 */
export function collectTeamToolCallSummary(toolCalls: ReadonlyArray<ToolCall> | undefined): TeamToolCallSummary {
    const summary: TeamToolCallSummary = { toolCalls: [], citations: [] };

    if (!toolCalls || toolCalls.length === 0) {
        return summary;
    }

    const seenTeamToolCalls = new Set<string>();
    const seenToolCalls = new Set<string>();
    const seenCitations = new Set<string>();

    for (const toolCall of toolCalls) {
        collectFromTeamToolCall(toolCall, summary, seenTeamToolCalls, seenToolCalls, seenCitations);
    }

    return summary;
}

/**
 * Recursively collects transitive tool calls and citations from a TEAM tool call.
 *
 * @param toolCall - TEAM tool call to inspect.
 * @param summary - Aggregated output to populate.
 * @param seenTeamToolCalls - De-duplication set for TEAM tool calls.
 * @param seenToolCalls - De-duplication set for tool call outputs.
 * @param seenCitations - De-duplication set for citations.
 *
 * @private utility of `<Chat/>`
 */
function collectFromTeamToolCall(
    toolCall: ToolCall,
    summary: TeamToolCallSummary,
    seenTeamToolCalls: Set<string>,
    seenToolCalls: Set<string>,
    seenCitations: Set<string>,
): void {
    const teamResult = parseTeamToolResult(parseToolCallResult(toolCall.result));
    if (!teamResult?.teammate) {
        return;
    }

    const teamToolCallKey = buildToolCallKey(toolCall);
    if (seenTeamToolCalls.has(teamToolCallKey)) {
        return;
    }
    seenTeamToolCalls.add(teamToolCallKey);

    const origin = buildOrigin(teamResult);
    collectTeamCitations(teamResult, origin, summary, seenCitations);

    const nestedToolCalls = Array.isArray(teamResult.toolCalls) ? teamResult.toolCalls : [];
    for (const nestedToolCall of nestedToolCalls) {
        if (isAssistantPreparationToolCall(nestedToolCall)) {
            continue;
        }

        if (isTeamToolName(nestedToolCall.name)) {
            collectFromTeamToolCall(nestedToolCall, summary, seenTeamToolCalls, seenToolCalls, seenCitations);
            continue;
        }

        const nestedKey = buildToolCallKey(nestedToolCall, origin);
        if (seenToolCalls.has(nestedKey)) {
            continue;
        }
        seenToolCalls.add(nestedKey);
        summary.toolCalls.push({ toolCall: nestedToolCall, origin });
    }
}

/**
 * Builds a display-ready origin object for a teammate tool call.
 *
 * @param teamResult - Parsed TEAM tool result.
 *
 * @private utility of `<Chat/>`
 */
function buildOrigin(teamResult: TeamToolResult): ToolCallOrigin {
    const label = teamResult.teammate?.label || teamResult.teammate?.url || teamResult.teammate?.toolName || 'Teammate';

    return {
        label,
        url: teamResult.teammate?.url,
        toolName: teamResult.teammate?.toolName,
    };
}

/**
 * Collects citations referenced in a teammate response or conversation.
 *
 * @param teamResult - Parsed TEAM tool result.
 * @param origin - Origin metadata for the teammate.
 * @param summary - Aggregated output to populate.
 * @param seenCitations - De-duplication set for citations.
 */
function collectTeamCitations(
    teamResult: TeamToolResult,
    origin: ToolCallOrigin,
    summary: TeamToolCallSummary,
    seenCitations: Set<string>,
): void {
    const texts: string[] = [];

    if (typeof teamResult.response === 'string' && teamResult.response.trim()) {
        texts.push(teamResult.response);
    }

    if (Array.isArray(teamResult.conversation)) {
        for (const entry of teamResult.conversation) {
            const sender = entry?.sender || entry?.role;
            if (sender === 'TEAMMATE' && typeof entry.content === 'string' && entry.content.trim()) {
                texts.push(entry.content);
            }
        }
    }

    for (const text of texts) {
        const citations = parseCitationsFromContent(text);
        for (const citation of citations) {
            const key = buildCitationKey(citation, origin);
            if (seenCitations.has(key)) {
                continue;
            }
            seenCitations.add(key);
            summary.citations.push({ ...citation, origin });
        }
    }
}

/**
 * Builds a stable key for a tool call to avoid duplicate entries.
 *
 * @param toolCall - Tool call to key.
 * @param origin - Optional origin metadata for the tool call.
 *
 * @private utility of `<Chat/>`
 */
function buildToolCallKey(toolCall: ToolCall, origin?: ToolCallOrigin): string {
    const rawId = (toolCall.rawToolCall as { id?: string } | undefined)?.id;
    if (rawId) {
        return `${origin?.label || 'origin'}:id:${rawId}`;
    }

    const argsKey = (() => {
        if (typeof toolCall.arguments === 'string') {
            return toolCall.arguments;
        }
        if (!toolCall.arguments) {
            return '';
        }
        try {
            return JSON.stringify(toolCall.arguments);
        } catch {
            return '';
        }
    })();

    return `${origin?.label || 'origin'}:${toolCall.name}:${toolCall.createdAt || ''}:${argsKey}`;
}

/**
 * Builds a stable key for a citation to avoid duplicate entries.
 *
 * @param citation - Citation to key.
 * @param origin - Origin metadata for the citation.
 *
 * @private utility of `<Chat/>`
 */
function buildCitationKey(citation: ParsedCitation, origin: ToolCallOrigin): string {
    return `${origin.label}:${citation.id}:${citation.source}`;
}

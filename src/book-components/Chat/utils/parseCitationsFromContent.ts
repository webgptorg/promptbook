import type { ChatMessage } from '../types/ChatMessage';

/**
 * Type representing a parsed citation from RAG sources
 */
export type ParsedCitation = {
    /**
     * The unique identifier for the citation (e.g., "5:13")
     */
    id: string;

    /**
     * The source document name (e.g., "document.pdf")
     */
    source: string;

    /**
     * Optional URL to the source document
     */
    url?: string;

    /**
     * Optional preview/excerpt from the source
     */
    excerpt?: string;
};

/**
 * Parses OpenAI Assistant-style citations from message content
 * Matches patterns like: 【5:13†document.pdf】
 *
 * @param content - The markdown content that may contain citations
 * @returns Array of parsed citations
 *
 * @private utility for internal use
 */
export function parseCitationsFromContent(content: string): ParsedCitation[] {
    const citations: ParsedCitation[] = [];
    const citationRegex = /【(.*?)†(.*?)】/g;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
        const id = match[1]!; // e.g., "5:13"
        const source = match[2]!; // e.g., "document.pdf"

        // Check if we already have this citation
        const existing = citations.find((c) => c.id === id && c.source === source);
        if (!existing) {
            citations.push({
                id,
                source,
            });
        }
    }

    return citations;
}

/**
 * Removes citation markers from content and returns clean text
 *
 * @param content - The markdown content with citations
 * @returns Content with citation markers removed
 *
 * @private utility for internal use
 */
export function stripCitationsFromContent(content: string): string {
    return content.replace(/【.*?†.*?】/g, '');
}

/**
 * Deduplicates citations by source while preserving the first-seen order.
 *
 * @param citations - Parsed citations to deduplicate.
 * @returns Deduplicated citations in original order.
 *
 * @private utility for internal use
 */
export function dedupeCitationsBySource(citations: ReadonlyArray<ParsedCitation>): ParsedCitation[] {
    const deduped: ParsedCitation[] = [];
    const indexBySource = new Map<string, number>();

    for (const citation of citations) {
        const key = citation.source.trim().toLowerCase();
        const existingIndex = indexBySource.get(key);

        if (existingIndex === undefined) {
            indexBySource.set(key, deduped.length);
            deduped.push(citation);
            continue;
        }

        const existing = deduped[existingIndex];
        if (!existing) {
            continue;
        }

        deduped[existingIndex] = {
            id: existing.id,
            source: existing.source,
            url: existing.url || citation.url,
            excerpt: existing.excerpt || citation.excerpt,
        };
    }

    return deduped;
}

/**
 * Extracts citations from a chat message if not already present
 *
 * @param message - The chat message to extract citations from
 * @returns The message with citations array populated
 *
 * @private utility for internal use
 */
export function extractCitationsFromMessage(message: ChatMessage): ChatMessage {
    // If citations are already provided, use them
    if (message.citations && message.citations.length > 0) {
        return message;
    }

    // Otherwise, parse from content
    const citations = parseCitationsFromContent(message.content);

    if (citations.length === 0) {
        return message;
    }

    return {
        ...message,
        citations,
    };
}

/**
 * TODO: Maybe spread into multiple files
 */

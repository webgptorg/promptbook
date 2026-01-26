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
 * Matches patterns like: 【5:13†document.pdf】 or 【5:13†https://example.com/document.pdf】
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
        const sourceRaw = match[2]!; // e.g., "document.pdf" or "https://example.com/document.pdf"

        let source = sourceRaw;
        let url: string | undefined = undefined;

        if (sourceRaw.startsWith('http://') || sourceRaw.startsWith('https://')) {
            url = sourceRaw;
            // Extract filename from URL
            try {
                const urlObj = new URL(sourceRaw);
                source = urlObj.pathname.split('/').pop() || sourceRaw;
            } catch (error) {
                // Fallback to raw value if URL is invalid
                console.error('Failed to parse citation URL:', error);
            }
        }

        // Check if we already have this citation
        const existing = citations.find((c) => c.id === id && c.source === source);
        if (!existing) {
            citations.push({
                id,
                source,
                url,
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

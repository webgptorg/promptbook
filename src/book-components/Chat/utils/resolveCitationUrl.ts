import { ChatParticipant } from '../types/ChatParticipant';

/**
 * Resolves the URL for a citation source by looking up KNOWLEDGE commitments in the agent's source code.
 *
 * @param source - The source filename (e.g. "document.pdf")
 * @param participants - List of chat participants to search in
 * @returns The resolved URL if found, or null
 *
 * @private utility of <Chat/> component
 */
export function resolveCitationUrl(source: string, participants: ReadonlyArray<ChatParticipant>): string | null {
    // Find the AGENT participant
    // TODO: [🧠] If there are multiple agents/teammates, we might need to search all of them or know which one generated the message
    const agent = participants.find((p) => p.name === 'AGENT');

    if (!agent || !agent.agentSource) {
        return null;
    }

    const lines = agent.agentSource.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        // Note: Check for KNOWLEDGE command (case-sensitive as per commitment definitions)
        if (trimmed.startsWith('KNOWLEDGE ')) {
            const content = trimmed.substring('KNOWLEDGE '.length).trim();

            // Check if it is a URL
            if (content.match(/^https?:\/\//)) {
                // Check if it matches the source
                // source: "document.pdf"
                // content: "https://example.com/files/document.pdf"

                try {
                    const url = new URL(content);
                    const pathname = decodeURIComponent(url.pathname);

                    if (pathname.endsWith('/' + source) || pathname === '/' + source || pathname === source) {
                        return content;
                    }
                } catch (error) {
                    // Invalid URL, ignore
                }

                // Fallback: Simple check ignoring query params by splitting ?
                const contentWithoutQuery = content.split('?')[0]!;
                let decodedContent = contentWithoutQuery;
                try {
                    decodedContent = decodeURIComponent(contentWithoutQuery);
                } catch {
                    // Ignore decoding errors
                }

                // Simple check: does the URL end with the source filename?
                if (
                    decodedContent.endsWith('/' + source) ||
                    decodedContent === source ||
                    contentWithoutQuery.endsWith('/' + source) ||
                    contentWithoutQuery === source
                ) {
                    return content;
                }
            }
        }
    }

    return null;
}

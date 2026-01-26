import { ChatParticipant } from '../types/ChatParticipant';

/**
 * Resolves the URL for a citation source by looking up KNOWLEDGE commitments in the agent's source code.
 *
 * @param source - The source filename (e.g. "document.pdf")
 * @param participants - List of chat participants to search in
 * @returns The resolved URL if found, or null
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

                // Decode URL to handle %20 etc
                let decodedContent = content;
                try {
                    decodedContent = decodeURIComponent(content);
                } catch {
                    // Ignore decoding errors
                }

                // Simple check: does the URL end with the source filename?
                if (
                    decodedContent.endsWith('/' + source) ||
                    decodedContent === source ||
                    content.endsWith('/' + source) ||
                    content === source
                ) {
                    return content;
                }
            }
        }
    }

    return null;
}

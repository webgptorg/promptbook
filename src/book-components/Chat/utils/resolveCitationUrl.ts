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

            try {
                // Ignore query params for matching
                // Note: handling both URL query params (?) and maybe other things
                const contentPath = content.split('?')[0]!;

                // Check if it matches the source
                // source: "document.pdf"
                // content: "https://example.com/files/document.pdf" OR "./files/document.pdf"

                if (contentPath.endsWith('/' + source) || contentPath === source) {
                    return content;
                }
            } catch (error) {
                // Ignore errors
            }
        }
    }

    return null;
}

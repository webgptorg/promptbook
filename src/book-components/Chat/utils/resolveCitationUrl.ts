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

    if (!agent) {
        return null;
    }

    // First, try to resolve from knowledgeSources array (more reliable for remote agents)
    if (agent.knowledgeSources && agent.knowledgeSources.length > 0) {
        for (const knowledgeSource of agent.knowledgeSources) {
            if (isCitationMatch(source, knowledgeSource.url, knowledgeSource.filename)) {
                return knowledgeSource.url;
            }
        }
    }

    // Fallback: Try to resolve from agent source (for local agents or backward compatibility)
    if (agent.agentSource) {
        const lines = agent.agentSource.split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            // Note: Check for KNOWLEDGE command (case-sensitive as per commitment definitions)
            if (trimmed.startsWith('KNOWLEDGE ')) {
                const content = trimmed.substring('KNOWLEDGE '.length).trim();

                if (isCitationMatch(source, content)) {
                    return content;
                }
            }
        }
    }

    return null;
}

/**
 * Helper to tokenize string into alphanumeric parts
 */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter((t) => t.length > 0);
}

/**
 * Helper to check if citation source matches the candidate filename/url
 */
function isCitationMatch(citationSource: string, candidateUrl: string, explicitFilename?: string): boolean {
    try {
        const urlPath = candidateUrl.split('?')[0]!;
        const decodedPath = decodeURIComponent(urlPath);
        const filenameFromUrl = decodedPath.split('/').pop() || '';
        const filename = explicitFilename || filenameFromUrl;

        // 1. Strict match
        if (filename === citationSource) {
            return true;
        }

        // 2. Check against URL path end (for when filename extraction might be tricky or citation includes path)
        if (decodedPath.endsWith('/' + citationSource) || decodedPath === citationSource) {
            return true;
        }

        // 3. Token-based heuristic
        const sourceTokens = tokenize(citationSource);
        const filenameTokens = tokenize(filename);

        if (sourceTokens.length > 0 && sourceTokens.every((token) => filenameTokens.includes(token))) {
            return true;
        }
    } catch (error) {
        return false;
    }
    return false;
}

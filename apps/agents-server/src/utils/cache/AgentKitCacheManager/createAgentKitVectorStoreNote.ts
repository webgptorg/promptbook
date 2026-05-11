/**
 * Builds a human-friendly note for a cached vector store.
 *
 * @private function of AgentKitCacheManager
 */
export function createAgentKitVectorStoreNote(options: {
    readonly agentName: string;
    readonly knowledgeSources: ReadonlyArray<string>;
}): string {
    const { agentName, knowledgeSources } = options;
    const lines = [`Agent: ${agentName}`, 'Files:'];

    for (const source of knowledgeSources) {
        lines.push(`- ${formatKnowledgeSourceLabel(source)}`);
    }

    return lines.join('\n');
}

/**
 * Formats a knowledge source label for vector store notes.
 *
 * @private function of AgentKitCacheManager
 */
function formatKnowledgeSourceLabel(source: string): string {
    const fileName = getKnowledgeSourceFileName(source);

    if (!fileName || fileName === source) {
        return source;
    }

    return `${fileName} (${source})`;
}

/**
 * Extracts a file name from a knowledge source URL when possible.
 *
 * @private function of AgentKitCacheManager
 */
function getKnowledgeSourceFileName(source: string): string | null {
    try {
        const url = new URL(source);
        const segments = url.pathname.split('/').filter(Boolean);
        return segments.length > 0 ? segments[segments.length - 1] : null;
    } catch {
        return null;
    }
}

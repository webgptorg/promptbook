import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { FileImporter } from '../FileImporter';

/**
 * Agent source book importer
 * 
 * This importer handles other agent source books.
 * It strips the agent name and brings only the agent corpus.
 */
export const AgentImporter: FileImporter = {
    name: 'AgentImporter',

    canImport(url: string, mimeType?: string): boolean {
        return (
            url.endsWith('.book') ||
            mimeType === 'text/x-promptbook' ||
            // Generic check for agent URLs
            url.includes('ptbk.io')
        );
    },

    async import(
        content: string,
        url: string,
        mimeType: string,
        requirements: AgentModelRequirements,
    ): Promise<AgentModelRequirements> {
        // Strip the agent name (the first line)
        const lines = content.split('\n');
        const strippedContent = lines
            .slice(1) // Remove first line (agent name)
            .join('\n')
            .trim();

        return {
            ...requirements,
            systemMessage: requirements.systemMessage + '\n\n' + strippedContent,
            importedAgentUrls: [...(requirements.importedAgentUrls || []), url],
        };
    },
};

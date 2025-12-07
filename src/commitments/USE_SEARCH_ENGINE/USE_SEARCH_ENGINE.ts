import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * USE SEARCH ENGINE commitment definition
 *
 * The `USE SEARCH ENGINE` commitment indicates that the agent should utilize a search engine tool
 * to access and retrieve up-to-date information from the internet when necessary.
 *
 * The content following `USE SEARCH ENGINE` is ignored (similar to NOTE).
 *
 * Example usage in agent source:
 *
 * ```book
 * USE SEARCH ENGINE
 * USE SEARCH ENGINE This will be ignored
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseSearchEngineCommitmentDefinition extends BaseCommitmentDefinition<'USE SEARCH ENGINE'> {
    constructor() {
        super('USE SEARCH ENGINE', ['SEARCH ENGINE', 'SEARCH']);
    }

    /**
     * Short one-line description of USE SEARCH ENGINE.
     */
    get description(): string {
        return 'Enable the agent to use a search engine tool for accessing internet information.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🔍';
    }

    /**
     * Markdown documentation for USE SEARCH ENGINE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE SEARCH ENGINE

            Enables the agent to use a search engine tool to access and retrieve up-to-date information from the internet.

            ## Key aspects

            - The content following \`USE SEARCH ENGINE\` is ignored (similar to NOTE)
            - The actual search engine tool usage is handled by the agent runtime
            - Allows the agent to search for current information from the web
            - Useful for research tasks, finding facts, and accessing dynamic content

            ## Examples

            \`\`\`book
            Research Assistant

            PERSONA You are a helpful research assistant specialized in finding current information
            USE SEARCH ENGINE
            RULE Always cite your sources when providing information from the web
            \`\`\`

            \`\`\`book
            Fact Checker

            PERSONA You are a fact checker
            USE SEARCH ENGINE
            ACTION Search for claims and verify them against reliable sources
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        // The content after USE SEARCH ENGINE is ignored (similar to NOTE)
        TODO_USE(content);

        // We simply mark that search engine capability is enabled in metadata

        // Get existing metadata
        const existingMetadata = requirements.metadata || {};

        // Get existing tools array or create new one
        const existingTools = (existingMetadata.tools as string[] | undefined) || [];

        // Add 'search-engine' to tools if not already present
        const updatedTools = existingTools.includes('search-engine') ? existingTools : [...existingTools, 'search-engine'];

        // Return requirements with updated metadata
        return {
            ...requirements,
            metadata: {
                ...existingMetadata,
                tools: updatedTools,
                useSearchEngine: true,
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * USE commitment definition
 *
 * The USE commitment indicates that the agent should utilize specific tools or capabilities
 * to access and interact with external systems when necessary.
 *
 * Supported USE types:
 * - USE BROWSER: Enables the agent to use a web browser tool
 * - USE SEARCH ENGINE (future): Enables search engine access
 * - USE FILE SYSTEM (future): Enables file system operations
 * - USE MCP (future): Enables MCP server connections
 *
 * The content following the USE commitment is ignored (similar to NOTE).
 *
 * Example usage in agent source:
 *
 * ```book
 * USE BROWSER
 * USE SEARCH ENGINE
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseCommitmentDefinition extends BaseCommitmentDefinition<`USE${string}`> {
    public constructor() {
        super('USE');
    }

    /**
     * Short one-line description of USE commitments.
     */
    get description(): string {
        return 'Enable the agent to use specific tools or capabilities (BROWSER, SEARCH ENGINE, etc.).';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🔧';
    }

    /**
     * Markdown documentation for USE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE

            Enables the agent to use specific tools or capabilities for interacting with external systems.

            ## Supported USE types

            - **USE BROWSER** - Enables the agent to use a web browser tool to access and retrieve information from the internet
            - **USE SEARCH ENGINE** (future) - Enables search engine access
            - **USE FILE SYSTEM** (future) - Enables file system operations
            - **USE MCP** (future) - Enables MCP server connections

            ## Key aspects

            - The content following the USE commitment is ignored (similar to NOTE)
            - Multiple USE commitments can be specified to enable multiple capabilities
            - The actual tool usage is handled by the agent runtime

            ## Examples

            ### Basic browser usage

            \`\`\`book
            Research Assistant

            PERSONA You are a helpful research assistant
            USE BROWSER
            KNOWLEDGE Can search the web for up-to-date information
            \`\`\`

            ### Multiple tools

            \`\`\`book
            Data Analyst

            PERSONA You are a data analyst assistant
            USE BROWSER
            USE FILE SYSTEM
            ACTION Can analyze data from various sources
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // USE commitments don't modify the system message or model requirements directly
        // They are handled separately in the parsing logic for capability extraction
        // This method exists for consistency with the CommitmentDefinition interface
        return requirements;
    }

    /**
     * Extracts the tool type from the USE commitment
     * This is used by the parsing logic
     */
    extractToolType(content: string): string | null {
        const trimmedContent = content.trim();
        // The tool type is the first word after USE (already stripped)
        const match = trimmedContent.match(/^(\w+)/);
        return match?.[1]?.toUpperCase() ?? null;
    }

    /**
     * Checks if this is a known USE type
     */
    isKnownUseType(useType: string): boolean {
        const knownTypes = ['BROWSER', 'SEARCH ENGINE', 'FILE SYSTEM', 'MCP'];
        return knownTypes.includes(useType.toUpperCase());
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

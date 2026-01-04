import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * USE MCP commitment definition
 *
 * The `USE MCP` commitment allows to specify an MCP server URL which the agent will connect to
 * for retrieving additional instructions and actions.
 *
 * The content following `USE MCP` is the URL of the MCP server.
 *
 * Example usage in agent source:
 *
 * ```book
 * USE MCP http://mcp-server-url.com
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseMcpCommitmentDefinition extends BaseCommitmentDefinition<'USE MCP'> {
    constructor() {
        super('USE MCP', ['MCP']);
    }

    /**
     * Short one-line description of USE MCP.
     */
    get description(): string {
        return 'Connects the agent to an external MCP server for additional capabilities.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🔌';
    }

    /**
     * Markdown documentation for USE MCP commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE MCP

            Connects the agent to an external Model Context Protocol (MCP) server.

            ## Key aspects

            - The content following \`USE MCP\` must be a valid URL
            - Multiple MCP servers can be connected by using multiple \`USE MCP\` commitments
            - The agent will have access to tools and resources provided by the MCP server

            ## Example

            \`\`\`book
            Company Lawyer

            PERSONA You are a company lawyer.
            USE MCP http://legal-db.example.com
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const mcpServerUrl = content.trim();

        if (!mcpServerUrl) {
            return requirements;
        }

        const existingMcpServers = requirements.mcpServers || [];

        // Avoid duplicates
        if (existingMcpServers.includes(mcpServerUrl)) {
            return requirements;
        }

        return {
            ...requirements,
            mcpServers: [...existingMcpServers, mcpServerUrl],
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * USE BROWSER commitment definition
 *
 * The `USE BROWSER` commitment indicates that the agent should utilize a web browser tool
 * to access and retrieve up-to-date information from the internet when necessary.
 *
 * The content following `USE BROWSER` is ignored (similar to NOTE).
 *
 * Example usage in agent source:
 *
 * ```book
 * USE BROWSER
 * USE BROWSER This will be ignored
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseBrowserCommitmentDefinition extends BaseCommitmentDefinition<'USE BROWSER'> {
    constructor() {
        super('USE BROWSER', ['BROWSER']);
    }

    /**
     * The `USE BROWSER` commitment is standalone.
     */
    override get requiresContent(): boolean {
        return false;
    }

    /**
     * Short one-line description of USE BROWSER.
     */
    get description(): string {
        return 'Enable the agent to use a web browser tool for accessing internet information.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🌐';
    }

    /**
     * Markdown documentation for USE BROWSER commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE BROWSER

            Enables the agent to use a web browser tool to access and retrieve up-to-date information from the internet.

            ## Key aspects

            - The content following \`USE BROWSER\` is ignored (similar to NOTE)
            - The actual browser tool usage is handled by the agent runtime
            - Allows the agent to fetch current information from websites
            - Useful for research tasks, fact-checking, and accessing dynamic content

            ## Examples

            \`\`\`book
            Research Assistant

            PERSONA You are a helpful research assistant specialized in finding current information
            USE BROWSER
            RULE Always cite your sources when providing information from the web
            \`\`\`

            \`\`\`book
            News Analyst

            PERSONA You are a news analyst who stays up-to-date with current events
            USE BROWSER
            STYLE Present news in a balanced and objective manner
            ACTION Can search for and summarize news articles
            \`\`\`

            \`\`\`book
            Company Lawyer

            PERSONA You are a company lawyer providing legal advice
            USE BROWSER
            KNOWLEDGE Corporate law and legal procedures
            RULE Always recommend consulting with a licensed attorney for specific legal matters
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        // The content after USE BROWSER is ignored (similar to NOTE)
        TODO_USE(content);

        // We simply mark that browser capability is enabled in metadata

        // Get existing metadata
        const existingMetadata = requirements.metadata || {};

        // Get existing tools array or create new one
        const existingTools = (existingMetadata.tools as string[] | undefined) || [];

        // Add 'browser' to tools if not already present
        const updatedTools = existingTools.includes('browser') ? existingTools : [...existingTools, 'browser'];

        // Return requirements with updated metadata
        return {
            ...requirements,
            metadata: {
                ...existingMetadata,
                tools: updatedTools,
                useBrowser: true,
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * USE SEARCH ENGINE commitment definition
 *
 * The `USE SEARCH ENGINE` commitment indicates that the agent should utilize a search engine tool
 * to access and retrieve up-to-date information from the internet when necessary.
 *
 * The content following `USE SEARCH ENGINE` is an arbitrary text that the agent should know (e.g. search scope or instructions).
 *
 * Example usage in agent source:
 *
 * ```book
 * USE SEARCH ENGINE
 * USE SEARCH ENGINE Hledej informace o Přemyslovcích
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

            - The content following \`USE SEARCH ENGINE\` is an arbitrary text that the agent should know (e.g. search scope or instructions).
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
        // Get existing tools array or create new one
        const existingTools = requirements.tools || [];

        // Add 'web_search' to tools if not already present
        const updatedTools = existingTools.some((tool) => tool.name === 'web_search')
            ? existingTools
            : [
                  ...existingTools,
                  { type: 'web_search' },
                  // <- Note: [🔰] This is just using simple native search tool by OpenAI @see https://platform.openai.com/docs/guides/tools-web-search
                  //          In future we will use proper MCP search tool:
                  /*
   
                  {
                      name: 'web_search',
                      description: spaceTrim(`
                        Search the internet for information.
                        Use this tool when you need to find up-to-date information or facts that you don't know.
                        ${!content ? '' : `Search scope / instructions: ${content}`}
                    `),
                      parameters: {
                          type: 'object',
                          properties: {
                              query: {
                                  type: 'string',
                                  description: 'The search query',
                              },
                          },
                          required: ['query'],
                      },
                  },
                  */
              ];

        // Return requirements with updated tools and metadata
        return {
            ...requirements,
            tools: updatedTools,
            metadata: {
                ...requirements.metadata,
                useSearchEngine: content || true,
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

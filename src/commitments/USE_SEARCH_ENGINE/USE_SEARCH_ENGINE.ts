import { spaceTrim } from 'spacetrim';
import { string_javascript_name, TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { SerpSearchEngine } from '../../search-engines/serp/SerpSearchEngine';
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
    public constructor() {
        super('USE SEARCH ENGINE', ['USE SEARCH']);
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
                              location: {
                                  type: 'string',
                                  description:
                                      'The location for the search (e.g., "Austin, Texas, United States" or "Prague, Czechia")',
                              },
                              gl: {
                                  type: 'string',
                                  description: 'The country code (e.g., "us" for United States, "cz" for Czechia)',
                              },
                              hl: {
                                  type: 'string',
                                  description: 'The language code (e.g., "en" for English, "cs" for Czech)',
                              },
                              num: {
                                  type: 'integer',
                                  description: 'Number of results to return',
                              },
                              engine: {
                                  type: 'string',
                                  description: 'The search engine to use (e.g., "google", "bing", "yahoo", "baidu")',
                              },
                              google_domain: {
                                  type: 'string',
                                  description: 'The Google domain to use (e.g., "google.com", "google.cz")',
                              },
                          },
                          required: ['query'],
                      },
                  } as TODO_any,
              ];

        // Return requirements with updated tools and metadata
        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: updatedTools,
                metadata: {
                    ...requirements.metadata,
                    useSearchEngine: content || true,
                },
            },
            spaceTrim(`
                You have access to the web search engine. Use it to find up-to-date information or facts that you don't know.
                When you need to know some information from the internet, use the tool provided to you.
            `),
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            web_search: 'Web search',
        };
    }

    /**
     * Gets the `web_search` tool function implementation.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async web_search(args: { query: string } & Record<string, unknown>): Promise<string> {
                console.log('!!!! [Tool] web_search called', { args });

                const { query, ...options } = args;

                if (!query) {
                    throw new Error('Search query is required');
                }

                const searchEngine = new SerpSearchEngine();
                const results = await searchEngine.search(query, options);

                return spaceTrim(
                    (block) => `
                        Search results for "${query}"${
                        Object.keys(options).length === 0
                            ? ''
                            : ` with options ${JSON.stringify(options)}`
                    }:

                        ${block(
                            results
                                .map((result) =>
                                    spaceTrim(`
                                            - **${result.title}**
                                              ${result.url}
                                              ${result.snippet}
                                        `),
                                )
                                .join('\n\n'),
                        )}
                    `,
                );
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

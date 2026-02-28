import { spaceTrim } from 'spacetrim';
import { string_javascript_name, TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { fetchUrlContentViaBrowser } from './fetchUrlContentViaBrowser';

/**
 * USE BROWSER commitment definition
 *
 * The `USE BROWSER` commitment indicates that the agent should utilize browser tools
 * to access and retrieve up-to-date information from the internet when necessary.
 *
 * This commitment provides two levels of browser access:
 * 1. One-shot URL fetching: Simple function to fetch and scrape URL content
 * 2. Running browser: For complex tasks like scrolling, clicking, form filling, etc.
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
    public constructor() {
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
        return 'Enable the agent to use browser tools for accessing internet information.';
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

            Enables the agent to use browser tools to access and retrieve up-to-date information from the internet.

            ## Key aspects

            - The content following \`USE BROWSER\` is ignored (similar to NOTE)
            - Provides two levels of browser access:
              1. **One-shot URL fetching**: Simple function to fetch and scrape URL content (active)
              2. **Running browser**: For complex tasks like scrolling, clicking, form filling, etc. (runtime-dependent)
            - The actual browser tool usage is handled by the agent runtime
            - Allows the agent to fetch current information from websites and documents
            - Useful for research tasks, fact-checking, and accessing dynamic content
            - Supports various content types including HTML pages and PDF documents

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

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            fetch_url_content: 'Fetch URL content',
            run_browser: 'Run browser',
        };
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        // The content after USE BROWSER is ignored (similar to NOTE)
        TODO_USE(content);

        // Get existing tools array or create new one
        const existingTools = requirements.tools || [];

        // Add browser tools if not already present
        const toolsToAdd: Array<LlmToolDefinition> = [];

        // Tool 1: One-shot URL content fetching
        if (!existingTools.some((tool) => tool.name === 'fetch_url_content')) {
            toolsToAdd.push({
                name: 'fetch_url_content',
                description: spaceTrim(`
                    Fetches and scrapes the content from a URL (webpage or document).
                    This tool retrieves the content of the specified URL and converts it to markdown format.
                    Use this when you need to access information from a specific website or document.
                    Supports various content types including HTML pages and PDF documents.
                `),
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description:
                                'The URL to fetch and scrape (e.g., "https://example.com" or "https://example.com/document.pdf")',
                        },
                    },
                    required: ['url'],
                },
            } as TODO_any);
        }

        // Tool 2: Running browser for complex page interactions
        if (!existingTools.some((tool) => tool.name === 'run_browser')) {
            toolsToAdd.push({
                name: 'run_browser',
                description: spaceTrim(`
                    Launches a browser session for complex interactions.
                    This tool is for advanced browser automation tasks like scrolling, clicking, form filling, etc.
                    Use this when simple one-shot URL fetching is not enough.
                `),
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The initial URL to navigate to',
                        },
                        actions: {
                            type: 'array',
                            description: 'Array of actions to perform in the browser',
                            items: {
                                type: 'object',
                                properties: {
                                    type: {
                                        type: 'string',
                                        enum: ['navigate', 'click', 'scroll', 'type', 'wait'],
                                    },
                                    selector: {
                                        type: 'string',
                                        description: 'CSS selector for the element (for click, type actions)',
                                    },
                                    value: {
                                        type: 'string',
                                        description: 'Value to type or navigate to',
                                    },
                                },
                            },
                        },
                    },
                    required: ['url'],
                },
            } as TODO_any);
        }

        const updatedTools = [...existingTools, ...toolsToAdd];

        // Return requirements with updated tools and metadata
        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: updatedTools,
                _metadata: {
                    ...requirements._metadata,
                    useBrowser: true,
                },
            },
            spaceTrim(`
                You have access to browser tools to fetch and access content from the internet.
                - Use "fetch_url_content" to retrieve content from specific URLs (webpages or documents) using scrapers.
                - Use "run_browser" for real interactive browser automation (navigation, clicks, typing, waiting, scrolling).
                When you need to know information from a specific website or document, use the fetch_url_content tool.
            `),
        );
    }

    /**
     * Gets the browser tool function implementations.
     *
     * This method automatically detects the environment and uses:
     * - Server-side: Direct scraping via fetchUrlContent (Node.js)
     * - Browser: Proxy through Agents Server API via fetchUrlContentViaBrowser
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            /**
             * @@@
             *
             * Note: [🛺] This function has implementation both for browser and node, this is the proxied one for browser
             */
            async fetch_url_content(args: { url: string }): Promise<string> {
                console.log('!!!! [Tool] fetch_url_content called', { args });

                const { url } = args;

                return await fetchUrlContentViaBrowser(url);
            },

            /**
             * @@@
             */
            async run_browser(args: { url: string; actions?: Array<TODO_any> }): Promise<string> {
                console.log('!!!! [Tool] run_browser called', { args });

                const { url } = args;

                return spaceTrim(`
                    # Running browser

                    The running browser tool is not available in this runtime.

                    This environment does not provide the server-side browser automation backend.
                    In Agents Server Node runtime, this tool is resolved to a Playwright CLI implementation.

                    Requested URL: ${url}
                `);
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

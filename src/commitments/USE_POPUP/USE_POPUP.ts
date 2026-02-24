import { spaceTrim } from 'spacetrim';
import { string_javascript_name, TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';

/**
 * USE POPUP commitment definition
 *
 * The `USE POPUP` commitment indicates that the agent can open a popup window with a specific website.
 * This is useful, for example, when the agent writes a post on Facebook but wants the user to post it on Facebook.
 *
 * Example usage in agent source:
 *
 * ```book
 * USE POPUP Allow to open Facebook and Linkedin
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UsePopupCommitmentDefinition extends BaseCommitmentDefinition<'USE POPUP'> {
    public constructor() {
        super('USE POPUP', ['POPUP']);
    }

    /**
     * The `USE POPUP` commitment is standalone or with instructions.
     */
    override get requiresContent(): boolean {
        return false;
    }

    /**
     * Short one-line description of USE POPUP.
     */
    get description(): string {
        return 'Enable the agent to open a popup window with a specific website.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🪟';
    }

    /**
     * Markdown documentation for USE POPUP commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE POPUP

            Enables the agent to open a popup window with a specific website.

            ## Key aspects

            - The content following \`USE POPUP\` is an arbitrary text that the agent should know (e.g. constraints or instructions).
            - The actual popup opening is handled by the agent runtime (usually in the browser)
            - Allows the agent to open websites for the user to interact with (e.g. social media posts)

            ## Examples

            \`\`\`book
            John the Copywriter

            PERSONA You are a professional copywriter writing about CNC machines.
            USE POPUP Allow to open Facebook and Linkedin
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('Popup instructions', content);

        // Get existing tools array or create new one
        const existingTools = requirements.tools || [];

        // Add 'open_popup' to tools if not already present
        const updatedTools = existingTools.some((tool) => tool.name === 'open_popup')
            ? existingTools
            : [
                  ...existingTools,
                  {
                      name: 'open_popup',
                      description: spaceTrim(`
                        Opens a popup window with a specific URL.
                        Use this when you want to show a specific website to the user in a new window.
                        ${!content ? '' : `Constraints / instructions: ${content}`}
                    `),
                      parameters: {
                          type: 'object',
                          properties: {
                              url: {
                                  type: 'string',
                                  description: 'The URL to open in the popup window',
                              },
                          },
                          required: ['url'],
                      },
                  } as TODO_any,
              ];

        // Return requirements with updated tools and metadata
        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: updatedTools,
                _metadata: {
                    ...requirements._metadata,
                    usePopup: content || true,
                },
            },
            spaceTrim(
                (block) => `
                    Tool:
                    - You can open a popup window with a specific URL using the tool "open_popup".
                    - Use this when you want the user to see or interact with a specific website.
                    ${block(extraInstructions)}
            `,
            ),
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            open_popup: 'Open popup',
        };
    }

    /**
     * Gets the `open_popup` tool function implementation.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async open_popup(args: { url: string }): Promise<string> {
                console.log('!!!! [Tool] open_popup called', { args });

                const { url } = args;

                if (typeof window !== 'undefined') {
                    window.open(url, '_blank');
                    return `Popup window with URL "${url}" was opened.`;
                }

                return spaceTrim(`
                    Popup window with URL "${url}" was requested.
                    
                    Note: The agent is currently running on the server, so the popup cannot be opened automatically.
                    The user can open it manually from the tool call details in the chat.
                `);
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

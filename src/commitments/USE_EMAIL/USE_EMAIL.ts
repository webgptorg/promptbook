import { spaceTrim } from 'spacetrim';
import { string_javascript_name, TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';

/**
 * USE EMAIL commitment definition
 *
 * The `USE EMAIL` commitment enables the agent to send emails.
 *
 * Example usage in agent source:
 *
 * ```book
 * USE EMAIL
 * USE EMAIL Write always formal and polite emails, always greet.
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseEmailCommitmentDefinition extends BaseCommitmentDefinition<'USE EMAIL'> {
    public constructor() {
        super('USE EMAIL', ['EMAIL', 'MAIL']);
    }

    override get requiresContent(): boolean {
        return false;
    }

    /**
     * Short one-line description of USE EMAIL.
     */
    public get description(): string {
        return 'Enable the agent to send emails.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '📧';
    }

    /**
     * Markdown documentation for USE EMAIL commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE EMAIL

            Enables the agent to send emails through the email service.

            ## Key aspects

            - The agent can send emails to specified recipients.
            - Supports multiple recipients, CC, subject, and markdown content.
            - Emails are queued and sent through configured email providers.
            - The content following \`USE EMAIL\` can provide additional instructions for email composition (e.g., style, tone, formatting preferences).

            ## Examples

            \`\`\`book
            Email Assistant

            PERSONA You are a helpful assistant who can send emails.
            USE EMAIL
            \`\`\`

            \`\`\`book
            Formal Email Assistant

            PERSONA You help with professional communication.
            USE EMAIL Write always formal and polite emails, always greet.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('Email instructions', content);

        // Get existing tools array or create new one
        const existingTools = requirements.tools || [];

        // Add 'send_email' to tools if not already present
        const updatedTools = existingTools.some((tool) => tool.name === 'send_email')
            ? existingTools
            : [
                  ...existingTools,
                  {
                      name: 'send_email',
                      description: `Send an email to one or more recipients. ${!content ? '' : `Style instructions: ${content}`}`,
                      parameters: {
                          type: 'object',
                          properties: {
                              to: {
                                  type: 'array',
                                  items: { type: 'string' },
                                  description: 'Array of recipient email addresses (e.g., ["user@example.com", "Jane Doe <jane@example.com>"])',
                              },
                              cc: {
                                  type: 'array',
                                  items: { type: 'string' },
                                  description: 'Optional array of CC email addresses',
                              },
                              subject: {
                                  type: 'string',
                                  description: 'Email subject line',
                              },
                              body: {
                                  type: 'string',
                                  description: 'Email body content in markdown format',
                              },
                          },
                          required: ['to', 'subject', 'body'],
                      },
                  } as TODO_any, // <- TODO: !!!! Remove any
                  // <- TODO: !!!! define the function in LLM tools
              ];

        // Return requirements with updated tools and metadata
        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: updatedTools,
                metadata: {
                    ...requirements.metadata,
                    useEmail: content || true,
                },
            },
            spaceTrim(
                (block) => `
                    Email tool:
                    - You have access to send emails via the tool "send_email".
                    - Use it when you need to send emails to users or other recipients.
                    - The email body should be written in markdown format.
                    - Always ensure the email content is clear, professional, and appropriate.
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
            send_email: 'Send email',
        };
    }

    /**
     * Gets the `send_email` tool function implementation.
     * Note: This is a placeholder - the actual implementation is provided by the agent server.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async send_email(args: {
                to: string[];
                cc?: string[];
                subject: string;
                body: string;
            }): Promise<string> {
                console.log('!!!! [Tool] send_email called', { args });

                // This is a placeholder implementation
                // The actual implementation should be provided by the agent server
                throw new Error(
                    'send_email tool not implemented. This commitment requires integration with an email service.',
                );
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

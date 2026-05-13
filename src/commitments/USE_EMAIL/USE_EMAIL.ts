import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import type { string_javascript_name } from '../../types/string_person_fullname';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { parseUseEmailCommitmentContent } from './parseUseEmailCommitmentContent';
import { sendEmailViaBrowser } from './sendEmailViaBrowser';

/**
 * Tool name used by USE EMAIL.
 *
 * @private internal USE EMAIL constant
 */
const SEND_EMAIL_TOOL_NAME = 'send_email' as string_javascript_name;

/**
 * USE EMAIL commitment definition.
 *
 * The `USE EMAIL` commitment enables outbound email sending through the `send_email` tool.
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
    get description(): string {
        return 'Enable outbound email sending through a wallet-backed SMTP configuration.';
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

            Enables the agent to send outbound emails through SMTP.

            ## Key aspects

            - The agent sends email via the \`send_email\` tool.
            - SMTP credentials are expected from wallet records (\`ACCESS_TOKEN\`, service \`smtp\`, key \`use-email-smtp-credentials\`).
            - Commitment content can optionally begin with a default sender email address:
              - \`USE EMAIL agent@example.com\`
            - Remaining commitment content is treated as optional email-writing instructions.

            ## Examples

            \`\`\`book
            Writing Agent
            USE EMAIL agent@example.com
            RULE Write emails to customers according to the instructions from user.
            \`\`\`

            \`\`\`book
            Formal Email Assistant
            USE EMAIL agent@example.com Keep emails concise and formal.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const parsedCommitment = parseUseEmailCommitmentContent(content);
        const updatedTools = addUseEmailTools(requirements.tools || []);

        // Collect all configured sender emails across multiple USE EMAIL commitments
        const existingSenders: string[] = Array.isArray(requirements._metadata?.useEmailSenders)
            ? [...(requirements._metadata!.useEmailSenders as string[])]
            : [];
        if (parsedCommitment.senderEmail && !existingSenders.includes(parsedCommitment.senderEmail)) {
            existingSenders.push(parsedCommitment.senderEmail);
        }

        const senderBullets =
            existingSenders.length > 0
                ? existingSenders
                      .map((email, index) =>
                          index === 0
                              ? `-   Default sender address: "${email}".`
                              : `-   Additional sender address: "${email}".`,
                      )
                      .join('\n')
                : '';

        const extraInstructions = formatOptionalInstructionBlock('Email instructions', parsedCommitment.instructions);

        const emailSectionContent = spaceTrim(
            (block) => `
                ## Emails

                -   Use \`${SEND_EMAIL_TOOL_NAME}\` to send outbound emails.
                ${block(senderBullets)}
                ${block(extraInstructions)}
            `,
        );

        return this.replaceOrCreateSection(
            {
                ...requirements,
                tools: updatedTools,
                _metadata: {
                    ...requirements._metadata,
                    useEmail: true,
                    ...(parsedCommitment.senderEmail ? { useEmailSender: parsedCommitment.senderEmail } : {}),
                    useEmailSenders: existingSenders,
                },
            },
            'Emails',
            emailSectionContent,
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            [SEND_EMAIL_TOOL_NAME]: 'Send email',
        };
    }

    /**
     * Gets the browser-safe `send_email` implementation.
     *
     * Node.js runtime overrides this via `getAllCommitmentsToolFunctionsForNode`.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async [SEND_EMAIL_TOOL_NAME](args: unknown): Promise<string> {
                return sendEmailViaBrowser(args as Record<string, unknown>);
            },
        };
    }
}

/**
 * Adds USE EMAIL tool definition while keeping already registered tools untouched.
 *
 * @private utility of USE EMAIL commitment
 */
function addUseEmailTools(existingTools: ReadonlyArray<LlmToolDefinition>): Array<LlmToolDefinition> {
    if (existingTools.some((tool) => tool.name === SEND_EMAIL_TOOL_NAME)) {
        return [...existingTools];
    }

    return [
        ...existingTools,
        {
            name: SEND_EMAIL_TOOL_NAME,
            description: 'Send an outbound email.',
            parameters: {
                type: 'object',
                properties: {
                    message: {
                        type: 'object',
                        description: 'Email payload. Use metadata.subject for the subject line.',
                    },
                    to: {
                        type: 'string',
                        description:
                            'Legacy alias for recipients (use comma-separated emails or JSON array encoded as string).',
                    },
                    cc: {
                        type: 'string',
                        description:
                            'Optional CC recipients (use comma-separated emails or JSON array encoded as string).',
                    },
                    subject: {
                        type: 'string',
                        description: 'Legacy alias for subject.',
                    },
                    body: {
                        type: 'string',
                        description: 'Legacy alias for markdown body content.',
                    },
                },
                required: [],
            },
        },
    ];
}

// Note: [💞] Ignore a discrepancy between file name and entity name

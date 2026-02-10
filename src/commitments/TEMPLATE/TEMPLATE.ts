import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * TEMPLATE commitment definition
 *
 * The TEMPLATE commitment enforces a specific response structure or template
 * that the agent must follow when generating responses. This helps ensure
 * consistent message formatting across all agent interactions.
 *
 * Example usage in agent source:
 *
 * ```book
 * TEMPLATE Always structure your response with: 1) Summary, 2) Details, 3) Next steps
 * TEMPLATE Use the following format: **Question:** [user question] | **Answer:** [your answer]
 * ```
 *
 * When used without content, it enables template mode which instructs the agent
 * to follow any template patterns defined in other commitments or context.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class TemplateCommitmentDefinition extends BaseCommitmentDefinition<'TEMPLATE' | 'TEMPLATES'> {
    public constructor(type: 'TEMPLATE' | 'TEMPLATES' = 'TEMPLATE') {
        super(type);
    }

    /**
     * Short one-line description of TEMPLATE.
     */
    get description(): string {
        return 'Enforce a specific message structure or response template.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '📋';
    }

    /**
     * Markdown documentation for TEMPLATE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Enforces a specific response structure or template that the agent must follow when generating responses.

            ## Key aspects

            - Both terms work identically and can be used interchangeably.
            - Can be used with or without content.
            - When used without content, enables template mode for structured responses.
            - When used with content, defines the specific template structure to follow.
            - Multiple templates can be combined, with later ones taking precedence.

            ## Examples

            \`\`\`book
            Customer Support Agent

            PERSONA You are a helpful customer support representative
            TEMPLATE Always structure your response with: 1) Acknowledgment, 2) Solution, 3) Follow-up question
            STYLE Be professional and empathetic
            \`\`\`

            \`\`\`book
            Technical Documentation Assistant

            PERSONA You are a technical writing expert
            TEMPLATE Use the following format: **Topic:** [topic] | **Explanation:** [details] | **Example:** [code]
            FORMAT Use markdown with clear headings
            \`\`\`

            \`\`\`book
            Simple Agent

            PERSONA You are a virtual assistant
            TEMPLATE
            \`\`\`
        `);
    }

    /**
     * TEMPLATE can be used with or without content.
     */
    override get requiresContent(): boolean {
        return false;
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        // If no content is provided, enable template mode
        if (!trimmedContent) {
            // Store template mode flag in metadata
            const updatedMetadata = {
                ...requirements._metadata,
                templateMode: true,
            };

            // Add a general instruction about using structured templates
            const templateModeInstruction = spaceTrim(`
                Use a clear, structured template format for your responses.
                Maintain consistency in how you organize and present information.
            `);

            return {
                ...this.appendToSystemMessage(requirements, templateModeInstruction, '\n\n'),
                _metadata: updatedMetadata,
            };
        }

        // If content is provided, add the specific template instructions
        const templateSection = `Response Template: ${trimmedContent}`;

        // Store the template in metadata for potential programmatic access
        const existingTemplates = requirements._metadata?.templates || [];
        const updatedMetadata = {
            ...requirements._metadata,
            templates: [...existingTemplates, trimmedContent],
            templateMode: true,
        };

        return {
            ...this.appendToSystemMessage(requirements, templateSection, '\n\n'),
            _metadata: updatedMetadata,
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

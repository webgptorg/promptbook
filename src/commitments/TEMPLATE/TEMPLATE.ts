import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * TEMPLATE commitment definition
 *
 * Deprecated legacy commitment for response templates and output structure.
 * New books should prefer `WRITING SAMPLE` and `WRITING RULES`.
 *
 * Legacy example usage in agent source:
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
        return 'Deprecated legacy template commitment. Prefer `WRITING SAMPLE` and `WRITING RULES` for new books.';
    }

    /**
     * Optional UI/docs-only deprecation metadata.
     */
    public override get deprecation() {
        return {
            message: 'Use `WRITING SAMPLE` and `WRITING RULES` instead.',
            replacedBy: ['WRITING SAMPLE', 'WRITING RULES'],
        } as const;
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

            Deprecated legacy commitment for response structure and templates.

            ## Migration

            - Existing \`${this.type}\` and \`TEMPLATES\` books still parse and compile.
            - New books should use \`WRITING SAMPLE\` for concrete response exemplars and \`WRITING RULES\` for structure or formatting constraints.
            - Runtime behavior is intentionally unchanged for backward compatibility.

            ## Preferred replacement

            \`\`\`book
            Customer Support Agent

            GOAL Help the user with support questions.
            WRITING SAMPLE
            Thanks for reaching out. Here is the summary, details, and next step.
            WRITING RULES Keep the response structured as: summary, details, next step.
            \`\`\`

            ## Legacy compatibility example

            \`\`\`book
            Customer Support Agent

            GOAL Help the user with support questions.
            TEMPLATE Always structure your response with: 1) Acknowledgment, 2) Solution, 3) Follow-up question
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

// Note: [💞] Ignore a discrepancy between file name and entity name

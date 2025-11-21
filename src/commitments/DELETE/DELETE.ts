import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * DELETE commitment definition
 *
 * The DELETE commitment (and its aliases CANCEL, DISCARD, REMOVE) is used to
 * remove or disregard certain information or context. This can be useful for
 * overriding previous commitments or removing unwanted behaviors.
 *
 * Example usage in agent source:
 *
 * ```book
 * DELETE Previous formatting requirements
 * CANCEL All emotional responses
 * DISCARD Technical jargon explanations
 * REMOVE Casual conversational style
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class DeleteCommitmentDefinition extends BaseCommitmentDefinition<'DELETE' | 'CANCEL' | 'DISCARD' | 'REMOVE'> {
    constructor(type: 'DELETE' | 'CANCEL' | 'DISCARD' | 'REMOVE') {
        super(type);
    }

    /**
     * Short one-line description of DELETE/CANCEL/DISCARD/REMOVE.
     */
    get description(): string {
        return 'Remove or **disregard** certain information, context, or previous commitments.';
    }

    /**
     * Markdown documentation for DELETE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # DELETE (CANCEL, DISCARD, REMOVE)

            A commitment to remove or disregard certain information or context. This can be useful for overriding previous commitments or removing unwanted behaviors.

            ## Aliases

            - \`DELETE\` - Remove or eliminate something
            - \`CANCEL\` - Cancel or nullify something
            - \`DISCARD\` - Discard or ignore something
            - \`REMOVE\` - Remove or take away something

            ## Key aspects

            - Multiple delete commitments can be used to remove different aspects.
            - Useful for overriding previous commitments in the same agent definition.
            - Can be used to remove inherited behaviors from base personas.
            - Helps fine-tune agent behavior by explicitly removing unwanted elements.

            ## Use cases

            - Overriding inherited persona characteristics
            - Removing conflicting or outdated instructions
            - Disabling specific response patterns
            - Canceling previous formatting or style requirements

            ## Examples

            \`\`\`book
            Serious Business Assistant

            PERSONA You are a friendly and casual assistant who uses emojis
            DELETE Casual conversational style
            REMOVE All emoji usage
            GOAL Provide professional business communications
            STYLE Use formal language and proper business etiquette
            \`\`\`

            \`\`\`book
            Simplified Technical Support

            PERSONA You are a technical support specialist with deep expertise
            KNOWLEDGE Extensive database of technical specifications
            DISCARD Technical jargon explanations
            CANCEL Advanced troubleshooting procedures
            GOAL Help users with simple, easy-to-follow solutions
            STYLE Use plain language that anyone can understand
            \`\`\`

            \`\`\`book
            Focused Customer Service

            PERSONA You are a customer service agent with broad knowledge
            ACTION Can help with billing, technical issues, and product information
            DELETE Billing assistance capabilities
            REMOVE Technical troubleshooting functions
            GOAL Focus exclusively on product information and general inquiries
            \`\`\`

            \`\`\`book
            Concise Information Provider

            PERSONA You are a helpful assistant who provides detailed explanations
            STYLE Include examples, analogies, and comprehensive context
            CANCEL Detailed explanation style
            DISCARD Examples and analogies
            GOAL Provide brief, direct answers without unnecessary elaboration
            STYLE Be concise and to the point
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Create deletion instruction for system message
        const deleteSection = `${this.type}: ${trimmedContent}`;

        // Delete instructions provide important context about what should be removed or ignored
        return this.appendToSystemMessage(requirements, deleteSection, '\n\n');
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../agent-source/AgentModelRequirements';
import { AutoPluralizableCommitmentDefinition } from '../_base/AutoPluralizableCommitmentDefinition';

/**
 * MESSAGE/MESSAGES commitment definition
 *
 * The MESSAGE/MESSAGES commitment contains 1:1 text of the message which AI assistant already
 * sent during the conversation. Later messages are later in the conversation.
 * It is similar to EXAMPLE but it is not example, it is the real message which
 * AI assistant already sent.
 *
 * Example usage in agent source:
 *
 * ```book
 * MESSAGE Hello! How can I help you today?
 * MESSAGES I understand you're looking for information about our services.
 * MESSAGE Based on your requirements, I'd recommend our premium package.
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MessageCommitmentDefinition extends AutoPluralizableCommitmentDefinition<'MESSAGE'> {
    constructor(type: 'MESSAGE' | 'MESSAGES' = 'MESSAGE') {
        super(type);
    }

    /**
     * Short one-line description of MESSAGE/MESSAGES.
     */
    get description(): string {
        return this.createDescriptionWithBothForms('Include actual **messages** the AI assistant has sent during conversation history');
    }

    /**
     * Markdown documentation for MESSAGE/MESSAGES commitment.
     */
    get documentation(): string {
        return this.createDocumentationWithBothForms(spaceTrim(`
            # ${this.displayName}

            Contains 1:1 text of the message which AI assistant already sent during the conversation. Later messages are later in the conversation. It is similar to EXAMPLE but it is not example, it is the real message which AI assistant already sent.

            ## Key behaviors

            - Multiple \`${this.canonicalType}\`/\`${this.pluralType}\` commitments represent the conversation timeline.
            - Later messages are later in the conversation chronologically.
            - Contains actual historical messages, not examples or templates.
            - Helps maintain conversation continuity and context.

            ## Differences from EXAMPLE

            - \`EXAMPLE\` shows hypothetical or template responses
            - \`${this.canonicalType}\`/\`${this.pluralType}\` contains actual historical conversation content
            - \`${this.canonicalType}\`/\`${this.pluralType}\` preserves the exact conversation flow
            - \`${this.canonicalType}\`/\`${this.pluralType}\` helps with context awareness and consistency

            ## Use cases

            - Maintaining conversation history context
            - Ensuring consistent tone and style across messages
            - Referencing previous responses in ongoing conversations
            - Building upon previously established context

            ## Examples

            \`\`\`book
            Customer Support Continuation

            PERSONA You are a helpful customer support agent
            MESSAGE Hello! How can I help you today?
            MESSAGE I understand you're experiencing issues with your account login.
            MESSAGE I've sent you a password reset link to your email address.
            MESSAGE Is there anything else I can help you with regarding your account?
            GOAL Continue providing consistent support based on conversation history
            \`\`\`

            \`\`\`book
            Technical Discussion

            PERSONA You are a software development mentor
            MESSAGE Let's start by reviewing the React component structure you shared.
            MESSAGE I notice you're using class components - have you considered hooks?
            MESSAGE Here's how you could refactor that using the useState hook.
            MESSAGE Great question about performance! Let me explain React's rendering cycle.
            KNOWLEDGE React hooks were introduced in version 16.8
            \`\`\`

            \`\`\`book
            Educational Session

            PERSONA You are a mathematics tutor
            MESSAGE Today we'll work on solving quadratic equations.
            MESSAGE Let's start with the basic form: ax² + bx + c = 0
            MESSAGE Remember, we can use the quadratic formula or factoring.
            MESSAGE You did great with that first problem! Let's try a more complex one.
            GOAL Build upon previous explanations for deeper understanding
            \`\`\`
        `));
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Create message section for system message
        const messageSection = `Previous Message: ${trimmedContent}`;

        // Messages represent conversation history and should be included for context
        return this.appendToSystemMessage(requirements, messageSection, '\n\n');
    }
}

/**
 * Singleton instances of the MESSAGE commitment definitions
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const MessageCommitment = new MessageCommitmentDefinition('MESSAGE');

/**
 * Singleton instances of the MESSAGE commitment definitions
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const MessagesCommitment = new MessageCommitmentDefinition('MESSAGES');

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

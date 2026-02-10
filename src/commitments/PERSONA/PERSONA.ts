import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * PERSONA commitment definition
 *
 * The PERSONA commitment modifies the agent's personality and character in the system message.
 * It defines who the agent is, their background, expertise, and personality traits.
 *
 * Key features:
 * - Multiple PERSONA commitments are automatically merged into one
 * - Content is placed at the beginning of the system message
 * - Original content with comments is preserved in metadata.PERSONA
 * - Comments (# PERSONA) are removed from the final system message
 *
 * Example usage in agent source:
 *
 * ```book
 * PERSONA You are a helpful programming assistant with expertise in TypeScript and React
 * PERSONA You have deep knowledge of modern web development practices
 * ```
 *
 * The above will be merged into a single persona section at the beginning of the system message.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class PersonaCommitmentDefinition extends BaseCommitmentDefinition<'PERSONA' | 'PERSONAE'> {
    public constructor(type: 'PERSONA' | 'PERSONAE' = 'PERSONA') {
        super(type);
    }

    /**
     * Short one-line description of PERSONA.
     */
    get description(): string {
        return 'Define who the agent is: background, expertise, and personality.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '👤';
    }

    /**
     * Markdown documentation for PERSONA commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Defines who the agent is, their background, expertise, and personality traits.

            ## Key aspects

            - Multiple \`PERSONA\` and \`PERSONAE\` commitments are merged together.
            - Both terms work identically and can be used interchangeably.
            - If they are in conflict, the last one takes precedence.
            - You can write persona content in multiple lines.

            ## Examples

            \`\`\`book
            Programming Assistant

            PERSONA You are a helpful programming assistant with expertise in TypeScript and React
            PERSONA You have deep knowledge of modern web development practices
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        // The PERSONA commitment aggregates all persona content and places it at the beginning
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Get existing persona content from metadata
        const existingPersonaContent = requirements._metadata?.PERSONA || '';

        // Merge the new content with existing persona content
        // When multiple PERSONA commitments exist, they are merged into one
        const mergedPersonaContent = existingPersonaContent
            ? `${existingPersonaContent}\n${trimmedContent}`
            : trimmedContent;

        // Store the merged persona content in metadata for debugging and inspection
        const updatedMetadata = {
            ...requirements._metadata,
            PERSONA: mergedPersonaContent,
        };

        // Get the agent name from metadata (which should contain the first line of agent source)
        // If not available, extract from current system message as fallback
        let agentName = requirements._metadata?.agentName;

        if (!agentName) {
            // Fallback: extract from current system message
            const currentMessage = requirements.systemMessage.trim();
            const basicFormatMatch = currentMessage.match(/^You are (.+)$/);
            if (basicFormatMatch && basicFormatMatch[1]) {
                agentName = basicFormatMatch[1];
            } else {
                agentName = 'AI Agent'; // Final fallback
            }
        }

        // Remove any existing persona content from the system message
        // (this handles the case where we're processing multiple PERSONA commitments)
        const currentMessage = requirements.systemMessage.trim();
        let cleanedMessage = currentMessage;

        // Check if current message starts with persona content or is just the basic format
        const basicFormatRegex = /^You are .+$/;
        const isBasicFormat = basicFormatRegex.test(currentMessage) && !currentMessage.includes('\n');

        if (isBasicFormat) {
            // Replace the basic format entirely
            cleanedMessage = '';
        } else if (currentMessage.startsWith('# PERSONA')) {
            // Remove existing persona section by finding where it ends
            const lines = currentMessage.split(/\r?\n/);
            let personaEndIndex = lines.length;

            // Find the end of the PERSONA section (next comment or end of message)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i]!.trim();
                if (line.startsWith('#') && !line.startsWith('# PERSONA')) {
                    personaEndIndex = i;
                    break;
                }
            }

            // Keep everything after the PERSONA section
            cleanedMessage = lines.slice(personaEndIndex).join('\n').trim();
        }

        // TODO: [🕛] There should be `agentFullname` not `agentName`
        // Create new system message with persona at the beginning
        // Format: "You are {agentName}\n{personaContent}"
        // The # PERSONA comment will be removed later by removeCommentsFromSystemMessage
        const personaSection = `# PERSONA\nYou are ${agentName}\n${mergedPersonaContent}`; // <- TODO: Use spaceTrim
        const newSystemMessage = cleanedMessage ? `${personaSection}\n\n${cleanedMessage}` : personaSection;

        return {
            ...requirements,
            systemMessage: newSystemMessage,
            _metadata: updatedMetadata,
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

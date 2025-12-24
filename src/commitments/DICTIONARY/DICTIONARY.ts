import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * DICTIONARY commitment definition
 *
 * The DICTIONARY commitment defines specific terms and their meanings that the agent should use correctly
 * in its reasoning and responses. This ensures consistent terminology usage.
 *
 * Key features:
 * - Multiple DICTIONARY commitments are automatically merged into one
 * - Content is placed in a dedicated section of the system message
 * - Terms and definitions are stored in metadata.DICTIONARY for debugging
 * - Agent should use the defined terms correctly in responses
 *
 * Example usage in agent source:
 *
 * ```book
 * Legal Assistant
 *
 * PERSONA You are a knowledgeable legal assistant
 * DICTIONARY Misdemeanor is a minor wrongdoing or criminal offense
 * DICTIONARY Felony is a serious crime usually punishable by imprisonment for more than one year
 * DICTIONARY Tort is a civil wrong that causes harm or loss to another person, leading to legal liability
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class DictionaryCommitmentDefinition extends BaseCommitmentDefinition<'DICTIONARY'> {
    constructor() {
        super('DICTIONARY');
    }

    /**
     * Short one-line description of DICTIONARY.
     */
    get description(): string {
        return 'Define terms and their meanings for consistent terminology usage.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '📚';
    }

    /**
     * Markdown documentation for DICTIONARY commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # DICTIONARY

            Defines specific terms and their meanings that the agent should use correctly in reasoning and responses.

            ## Key aspects

            - Multiple \`DICTIONARY\` commitments are merged together.
            - Terms are defined in the format: "Term is definition"
            - The agent should use these terms consistently in responses.
            - Definitions help ensure accurate and consistent terminology.

            ## Examples

            \`\`\`book
            Legal Assistant

            PERSONA You are a knowledgeable legal assistant specializing in criminal law
            DICTIONARY Misdemeanor is a minor wrongdoing or criminal offense
            DICTIONARY Felony is a serious crime usually punishable by imprisonment for more than one year
            DICTIONARY Tort is a civil wrong that causes harm or loss to another person, leading to legal liability
            \`\`\`

            \`\`\`book
            Medical Assistant

            PERSONA You are a helpful medical assistant
            DICTIONARY Hypertension is persistently high blood pressure
            DICTIONARY Diabetes is a chronic condition that affects how the body processes blood sugar
            DICTIONARY Vaccine is a biological preparation that provides active immunity to a particular disease
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Get existing dictionary entries from metadata
        const existingDictionary = requirements.metadata?.DICTIONARY || '';

        // Merge the new dictionary entry with existing entries
        const mergedDictionary = existingDictionary ? `${existingDictionary}\n${trimmedContent}` : trimmedContent;

        // Store the merged dictionary in metadata for debugging and inspection
        const updatedMetadata = {
            ...requirements.metadata,
            DICTIONARY: mergedDictionary,
        };

        // Create the dictionary section for the system message
        // Format: "# DICTIONARY\nTerm: definition\nTerm: definition..."
        const dictionarySection = `# DICTIONARY\n${mergedDictionary}`;

        return {
            ...this.appendToSystemMessage(requirements, dictionarySection),
            metadata: updatedMetadata,
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

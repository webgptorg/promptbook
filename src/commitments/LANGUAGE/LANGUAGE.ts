import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * LANGUAGE commitment definition
 *
 * The LANGUAGE/LANGUAGES commitment specifies the language(s) the agent should use in its responses.
 *
 * Example usage in agent source:
 *
 * ```book
 * LANGUAGE English
 * LANGUAGE French, English and Czech
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class LanguageCommitmentDefinition extends BaseCommitmentDefinition<'LANGUAGE' | 'LANGUAGES'> {
    public constructor(type: 'LANGUAGE' | 'LANGUAGES' = 'LANGUAGE') {
        super(type);
    }

    /**
     * Short one-line description of LANGUAGE/LANGUAGES.
     */
    get description(): string {
        return 'Specifies the language(s) the agent should use.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🌐';
    }

    /**
     * Markdown documentation for LANGUAGE/LANGUAGES commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Specifies the language(s) the agent should use in its responses.
            This is a specialized variation of the RULE commitment focused on language constraints.

            ## Examples

            \`\`\`book
            Paul Smith & Associés

            PERSONA You are a company lawyer.
            LANGUAGE French, English and Czech
            \`\`\`

            \`\`\`book
            Customer Support

            PERSONA You are a customer support agent.
            LANGUAGE English
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Add language as a bullet under a ## Language section
        const languageSection = `## Language\n\n-   Your language is ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, languageSection, '\n\n');
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name

import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { string_knowledge_source_link } from '../../types/typeAliases';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * FROM commitment definition
 *
 * The FROM commitment tells the agent that its `agentSource` is inherited from another agent.
 *
 * Example usage in agent source:
 *
 * ```book
 * FROM https://s6.ptbk.io/benjamin-white
 * ```
 */
export class FromCommitmentDefinition extends BaseCommitmentDefinition<'FROM'> {
    constructor(type: 'FROM' = 'FROM') {
        super(type);
    }

    /**
     * Short one-line description of FROM.
     */
    get description(): string {
        return 'Inherit agent source from another agent.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🧬';
    }

    /**
     * Markdown documentation for FROM commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Inherits agent source from another agent.

            ## Examples

            \`\`\`book
            My AI Agent

            FROM https://s6.ptbk.io/benjamin-white
            RULE Speak only in English.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Validate URL
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const url = new URL(trimmedContent);
            // TODO: Add more validation if needed (e.g. check for valid protocol)
        } catch (error) {
            console.warn(`Invalid URL in FROM commitment: ${trimmedContent}`);
            return requirements;
        }

        return {
            ...requirements,
            parentAgentUrl: trimmedContent as string_knowledge_source_link,
        };
    }
}

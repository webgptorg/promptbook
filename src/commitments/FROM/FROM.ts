import { spaceTrim } from 'spacetrim';
import { isValidAgentUrl } from '../../_packages/utils.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { isVoidPseudoAgentReference } from '../../book-2.0/agent-source/pseudoAgentReferences';
import type { string_agent_url } from '../../types/typeAliases';
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
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class FromCommitmentDefinition extends BaseCommitmentDefinition<'FROM'> {
    public constructor(type: 'FROM' = 'FROM') {
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

        if (isVoidPseudoAgentReference(trimmedContent)) {
            return {
                ...requirements,
                parentAgentUrl: null,
            };
        }

        if (!isValidAgentUrl(trimmedContent)) {
            throw new Error(
                spaceTrim(
                    (block) => `
                        Invalid agent URL in FROM commitment: "${trimmedContent}"

                        \`\`\`book
                        ${block(content)}
                        \`\`\`


                `,
                ),
            );
        }

        const parentAgentUrl: string_agent_url = trimmedContent;

        return {
            ...requirements,
            parentAgentUrl,
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

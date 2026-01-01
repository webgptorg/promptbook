import { spaceTrim } from 'spacetrim';
import { isValidAgentUrl } from '../../_packages/utils.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { string_agent_url } from '../../types/typeAliases';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * IMPORT commitment definition
 *
 * The IMPORT commitment tells the agent to import content from another agent at the current location.
 *
 * Example usage in agent source:
 *
 * ```book
 * IMPORT https://s6.ptbk.io/benjamin-white
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class ImportCommitmentDefinition extends BaseCommitmentDefinition<'IMPORT' | 'IMPORTS'> {
    constructor(type: 'IMPORT' | 'IMPORTS' = 'IMPORT') {
        super(type);
    }

    /**
     * Short one-line description of IMPORT.
     */
    get description(): string {
        return 'Import content from another agent.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '📥';
    }

    /**
     * Markdown documentation for IMPORT commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Imports content from another agent at the location of the commitment.

            ## Examples

            \`\`\`book
            My AI Agent

            IMPORT https://s6.ptbk.io/benjamin-white
            RULE Speak only in English.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        if (!isValidAgentUrl(trimmedContent)) {
            throw new Error(
                spaceTrim(
                    (block) => `
                        Invalid agent URL in IMPORT commitment: "${trimmedContent}"

                        \`\`\`book
                        ${block(content)}
                        \`\`\`
                `,
                ),
            );
        }

        const importedAgentUrl: string_agent_url = trimmedContent;

        return {
            ...requirements,
            importedAgentUrls: [...(requirements.importedAgentUrls || []), importedAgentUrl],
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

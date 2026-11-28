import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META ID commitment definition
 *
 * The `META ID` commitment carries the permanent id of the agent when an agent source is moved
 * between systems. It is a low-level commitment which is normally written and stripped by the
 * persistence layer instead of being written by hand.
 * This commitment is metadata-only and does not modify model requirements.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MetaIdCommitmentDefinition extends BaseCommitmentDefinition<'META ID'> {
    public constructor() {
        super('META ID');
    }

    /**
     * Short one-line description of META ID.
     */
    get description(): string {
        return "Set the agent's permanent id.";
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🔖';
    }

    /**
     * `META ID` is written by the persistence layer, not by agent authors.
     */
    override get isLowLevel(): boolean {
        return true;
    }

    /**
     * Markdown documentation for META ID commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META ID

            Carries the permanent id of the agent inside the agent source.

            ## Key aspects

            - Does not modify the agent's behavior or responses.
            - Written and stripped by the persistence layer, it should not be written by hand.
            - When an agent source without \`META ID\` is stored, a fresh permanent id is assigned.
            - If multiple \`META ID\` commitments are specified, the last one takes precedence.

            ## Examples

            \`\`\`book
            My agent

            META ID doQMRg82izNfJa
            PERSONA My agent is an expert in something.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // META ID does not modify the model requirements.
        // It is consumed by profile parsing and agent persistence.
        return requirements;
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name

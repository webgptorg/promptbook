import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META FULLNAME commitment definition
 *
 * The `META FULLNAME` commitment sets the full display name of the agent, which can differ
 * from the agent name on the first line of the agent source, for example when the agent
 * should be presented with academic titles.
 * This commitment is metadata-only and does not modify model requirements.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MetaFullnameCommitmentDefinition extends BaseCommitmentDefinition<'META FULLNAME'> {
    public constructor() {
        super('META FULLNAME');
    }

    /**
     * Short one-line description of META FULLNAME.
     */
    get description(): string {
        return "Set the agent's full display name.";
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🪪';
    }

    /**
     * Markdown documentation for META FULLNAME commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META FULLNAME

            Sets the full display name of the agent shown in profiles, chats, and exports.

            ## Key aspects

            - Does not modify the agent's behavior or responses.
            - If not present, the agent name from the first line of the agent source is used.
            - If multiple \`META FULLNAME\` commitments are specified, the last one takes precedence.

            ## Examples

            \`\`\`book
            Pavol Hejný

            META FULLNAME Dr. Ing. Pavol Hejný, PhD.
            PERSONA Developer with 10 years of experience in building AI applications.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // META FULLNAME does not modify the model requirements.
        // It is consumed by profile parsing.
        return requirements;
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name

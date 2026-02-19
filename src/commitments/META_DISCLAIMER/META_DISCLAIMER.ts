import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META DISCLAIMER commitment definition
 *
 * The META DISCLAIMER commitment stores markdown text that must be acknowledged
 * by the user before they can chat with the agent.
 *
 * Example usage in agent source:
 *
 * ```book
 * META DISCLAIMER
 *
 * This agent may provide information that is **not legally binding**.
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MetaDisclaimerCommitmentDefinition extends BaseCommitmentDefinition<'META DISCLAIMER'> {
    public constructor() {
        super('META DISCLAIMER');
    }

    /**
     * Short one-line description of META DISCLAIMER.
     */
    get description(): string {
        return 'Set markdown disclaimer text that users must agree with before chat.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '⚠️';
    }

    /**
     * Markdown documentation for META DISCLAIMER commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META DISCLAIMER

            Defines a markdown disclaimer shown to users before they can start chatting with the agent.

            ## Key aspects

            - Does not modify the system message or model requirements.
            - Supports multiline markdown content.
            - Intended for legal warnings, safety notices, and mandatory acknowledgements.
            - If multiple \`META DISCLAIMER\` commitments are present, the last one takes precedence.

            ## Example

            \`\`\`book
            Legal Assistant

            META DISCLAIMER

            This assistant provides **informational content only** and does not
            replace professional legal advice.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // META DISCLAIMER does not modify model requirements.
        // It is consumed by parsing/UI layers in Agents Server.
        return requirements;
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META DOMAIN commitment definition
 *
 * The `META DOMAIN` commitment sets the canonical host/domain of the agent.
 * This commitment is metadata-only and does not modify model requirements.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MetaDomainCommitmentDefinition extends BaseCommitmentDefinition<'META DOMAIN'> {
    public constructor() {
        super('META DOMAIN', ['DOMAIN']);
    }

    /**
     * Short one-line description of META DOMAIN.
     */
    get description(): string {
        return "Set the agent's canonical domain/host.";
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🌐';
    }

    /**
     * Markdown documentation for META DOMAIN commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META DOMAIN

            Sets the canonical domain (host) of the agent, for example a custom domain that should open this agent directly.

            ## Key aspects

            - Does not modify the agent's behavior or responses.
            - Used by server routing to map incoming hostnames to this agent.
            - If multiple \`META DOMAIN\` commitments are specified, the last one takes precedence.
            - Prefer hostname-only values such as \`my-agent.com\`.

            ## Examples

            \`\`\`book
            My agent

            PERSONA My agent is an expert in something.
            META DOMAIN my-agent.com
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // META DOMAIN does not modify the model requirements.
        // It is consumed by profile parsing and server routing.
        return requirements;
    }

    /**
     * Extracts the domain value from commitment content.
     */
    extractDomain(content: string): string | null {
        const trimmedContent = content.trim();
        return trimmedContent || null;
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

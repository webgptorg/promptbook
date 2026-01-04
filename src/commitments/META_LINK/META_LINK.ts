import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { Promisable } from 'type-fest';
import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META LINK commitment definition
 *
 * The `META LINK` commitment represents the link to the person from whom the agent is created.
 * This commitment is special because it doesn't affect the system message,
 * but is handled separately in the parsing logic for profile display.
 *
 * Example usage in agent source:
 *
 * ```
 * META LINK https://twitter.com/username
 * META LINK https://linkedin.com/in/profile
 * META LINK https://github.com/username
 * ```
 *
 * Multiple `META LINK` commitments can be used when there are multiple sources:
 *
 * ```book
 * META LINK https://twitter.com/username
 * META LINK https://linkedin.com/in/profile
 * ```
 *
 * @private [đźŞ”] Maybe export the commitments through some package
 */
export class MetaLinkCommitmentDefinition extends BaseCommitmentDefinition<'META LINK'> {
    constructor() {
        super('META LINK');
    }

    /**
     * Short one-line description of META LINK.
     */
    get description(): string {
        return 'Provide profile/source links for the person the agent models.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return 'đź”—';
    }

    /**
     * Markdown documentation for META LINK commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META LINK

            Represents a profile or source link for the person the agent is modeled after.

            ## Key aspects

            - Does not modify the agent's behavior or responses.
            - Multiple \`META LINK\` commitments can be used for different social profiles.
            - Used for attribution and crediting the original person.
            - Displayed in user interfaces for transparency.

            ## Examples

            \`\`\`book
            Expert Consultant

            META LINK https://twitter.com/expertname
            META LINK https://linkedin.com/in/expertprofile
            PERSONA You are Dr. Smith, a renowned expert in artificial intelligence
            KNOWLEDGE Extensive background in machine learning and neural networks
            \`\`\`

            \`\`\`book
            Open Source Developer

            META LINK https://github.com/developer
            META LINK https://twitter.com/devhandle
            PERSONA You are an experienced open source developer
            ACTION Can help with code reviews and architecture decisions
            STYLE Be direct and technical in explanations
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string, _tools: Pick<ExecutionTools, 'fs' | 'scrapers'>): Promisable<AgentModelRequirements> {
        TODO_USE(content);

        // META LINK doesn't modify the system message or model requirements
        // It's handled separately in the parsing logic for profile link extraction
        // This method exists for consistency with the CommitmentDefinition interface
        return requirements;
    }

    /**
     * Extracts the profile link URL from the content
     * This is used by the parsing logic
     */
    extractProfileLinkUrl(content: string): string | null {
        const trimmedContent = content.trim();
        return trimmedContent || null;
    }

    /**
     * Validates if the provided content is a valid URL
     */
    isValidUrl(content: string): boolean {
        try {
            new URL(content.trim());
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Note: [đź’ž] Ignore a discrepancy between file name and entity name
 */

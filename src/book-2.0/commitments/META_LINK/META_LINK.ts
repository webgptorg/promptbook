import { spaceTrim } from 'spacetrim';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

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
 * @private [🪔] Maybe export the commitments through some package
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
     * Markdown documentation for META LINK commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META LINK

            Represents a profile or source link for the person the agent is modeled after.

            Behavior:
            - Does not modify the system message.
            - Parsing logic extracts and stores the link for profile display.
            - Multiple META LINK lines are allowed when there are multiple sources.

            Examples:
            \`\`\`book
            META LINK https://twitter.com/username
            META LINK https://linkedin.com/in/profile
            META LINK https://github.com/username
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
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
 * Singleton instance of the META LINK commitment definition
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const MetaLinkCommitment = new MetaLinkCommitmentDefinition();

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

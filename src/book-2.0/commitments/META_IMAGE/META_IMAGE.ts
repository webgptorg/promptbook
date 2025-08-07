import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * META IMAGE commitment definition
 *
 * The META IMAGE commitment sets the agent's avatar/profile image URL.
 * This commitment is special because it doesn't affect the system message,
 * but is handled separately in the parsing logic.
 *
 * Example usage in agent source:
 * ```
 * META IMAGE https://example.com/avatar.jpg
 * META IMAGE /assets/agent-avatar.png
 * ```
 */
export class MetaImageCommitmentDefinition extends BaseCommitmentDefinition {
    constructor() {
        super('META IMAGE');
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        // META IMAGE doesn't modify the system message or model requirements
        // It's handled separately in the parsing logic for profile image extraction
        // This method exists for consistency with the CommitmentDefinition interface
        return requirements;
    }

    /**
     * Extracts the profile image URL from the content
     * This is used by the parsing logic
     */
    extractProfileImageUrl(content: string): string | null {
        const trimmedContent = content.trim();
        return trimmedContent || null;
    }
}

/**
 * Singleton instance of the META IMAGE commitment definition
 */
export const MetaImageCommitment = new MetaImageCommitmentDefinition();


/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

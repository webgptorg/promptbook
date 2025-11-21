import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META commitment definition
 *
 * The META commitment handles all meta-information about the agent such as:
 * - META IMAGE: Sets the agent's avatar/profile image URL
 * - META LINK: Provides profile/source links for the person the agent models
 * - META TITLE: Sets the agent's display title
 * - META DESCRIPTION: Sets the agent's description
 * - META [ANYTHING]: Any other meta information in uppercase format
 *
 * These commitments are special because they don't affect the system message,
 * but are handled separately in the parsing logic for profile display.
 *
 * Example usage in agent source:
 *
 * ```book
 * META IMAGE https://example.com/avatar.jpg
 * META LINK https://twitter.com/username
 * META TITLE Professional Assistant
 * META DESCRIPTION An AI assistant specialized in business tasks
 * META AUTHOR John Doe
 * META VERSION 1.0
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MetaCommitmentDefinition extends BaseCommitmentDefinition<`META${string}`> {
    constructor() {
        super('META');
    }

    /**
     * Short one-line description of META commitments.
     */
    get description(): string {
        return 'Set meta-information about the agent (IMAGE, LINK, TITLE, DESCRIPTION, etc.).';
    }

    /**
     * Markdown documentation for META commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META

            Sets meta-information about the agent that is used for display and attribution purposes.

            ## Supported META types

            - **META IMAGE** - Sets the agent's avatar/profile image URL
            - **META LINK** - Provides profile/source links for the person the agent models
            - **META TITLE** - Sets the agent's display title
            - **META DESCRIPTION** - Sets the agent's description
            - **META [ANYTHING]** - Any other meta information in uppercase format

            ## Key aspects

            - Does not modify the agent's behavior or responses
            - Used for visual representation and attribution in user interfaces
            - Multiple META commitments of different types can be used
            - Multiple META LINK commitments can be used for different social profiles
            - If multiple META commitments of the same type are specified, the last one takes precedence (except for LINK)

            ## Examples

            ### Basic meta information

            \`\`\`book
            Professional Assistant

            META IMAGE https://example.com/professional-avatar.jpg
            META TITLE Senior Business Consultant
            META DESCRIPTION Specialized in strategic planning and project management
            META LINK https://linkedin.com/in/professional
            \`\`\`

            ### Multiple links and custom meta

            \`\`\`book
            Open Source Developer

            META IMAGE /assets/dev-avatar.png
            META LINK https://github.com/developer
            META LINK https://twitter.com/devhandle
            META AUTHOR Jane Smith
            META VERSION 2.1
            META LICENSE MIT
            \`\`\`

            ### Creative assistant

            \`\`\`book
            Creative Helper

            META IMAGE https://example.com/creative-bot.jpg
            META TITLE Creative Writing Assistant
            META DESCRIPTION Helps with brainstorming, storytelling, and creative projects
            META INSPIRATION Books, movies, and real-world experiences
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // META commitments don't modify the system message or model requirements
        // They are handled separately in the parsing logic for meta information extraction
        // This method exists for consistency with the CommitmentDefinition interface
        return requirements;
    }

    /**
     * Extracts meta information from the content based on the meta type
     * This is used by the parsing logic
     */
    extractMetaValue(metaType: string, content: string): string | null {
        const trimmedContent = content.trim();
        return trimmedContent || null;
    }

    /**
     * Validates if the provided content is a valid URL (for IMAGE and LINK types)
     */
    isValidUrl(content: string): boolean {
        try {
            new URL(content.trim());
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Checks if this is a known meta type
     */
    isKnownMetaType(metaType: string): boolean {
        const knownTypes = ['IMAGE', 'LINK', 'TITLE', 'DESCRIPTION', 'AUTHOR', 'VERSION', 'LICENSE'];
        return knownTypes.includes(metaType.toUpperCase());
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

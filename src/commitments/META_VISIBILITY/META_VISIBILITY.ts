import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META VISIBILITY commitment definition.
 *
 * The `META VISIBILITY` commitment stores whether an agent is public, private, or unlisted.
 * Agents Server mirrors this value into the database for efficient filtering, but the book
 * commitment remains the editable source of truth.
 *
 * @private Metadata-only commitment used by Agents Server.
 */
export class MetaVisibilityCommitmentDefinition extends BaseCommitmentDefinition<'META VISIBILITY'> {
    public constructor() {
        super('META VISIBILITY');
    }

    /**
     * Short one-line description of META VISIBILITY.
     */
    get description(): string {
        return 'Set whether the agent is private, unlisted, or public.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '👁️';
    }

    /**
     * Markdown documentation for META VISIBILITY commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META VISIBILITY

            Sets the agent visibility used by Agents Server.

            ## Allowed values

            - \`PRIVATE\` - accessible only to signed-in users with access.
            - \`UNLISTED\` - accessible by direct link but hidden from public listings.
            - \`PUBLIC\` - visible in public listings and accessible by anyone.

            ## Key aspects

            - Does not modify the agent's behavior, system message, or tools.
            - Whitespace and letter case are normalized when persisted.
            - If multiple \`META VISIBILITY\` commitments are present, persistence keeps one normalized value.
            - Agents Server mirrors the value into the database for filtering, but the book is the source of truth.

            ## Example

            \`\`\`book
            Helpful Assistant

            GOAL Be helpful and friendly.
            META VISIBILITY PUBLIC
            \`\`\`
        `);
    }

    public applyToAgentModelRequirements(
        requirements: AgentModelRequirements,
        content: string,
    ): AgentModelRequirements {
        TODO_USE(content);

        // META VISIBILITY is metadata only and does not alter model requirements.
        return requirements;
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name

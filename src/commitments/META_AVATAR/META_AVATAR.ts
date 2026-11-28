import { spaceTrim } from 'spacetrim';
import { AVATAR_VISUALS } from '../../avatars/visuals/avatarVisualRegistry';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META AVATAR / META VISUAL commitment type.
 */
type MetaAvatarCommitmentType = 'META AVATAR' | 'META VISUAL';

/**
 * META AVATAR commitment definition
 *
 * The `META AVATAR` and `META VISUAL` commitments set the built-in default avatar visual
 * used when the agent does not provide an explicit `META IMAGE`.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MetaAvatarCommitmentDefinition extends BaseCommitmentDefinition<MetaAvatarCommitmentType> {
    public constructor(type: MetaAvatarCommitmentType = 'META AVATAR') {
        super(type);
    }

    /**
     * Short one-line description of META AVATAR.
     */
    get description(): string {
        return "Set the agent's built-in avatar visual.";
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '👤';
    }

    /**
     * Markdown documentation for META AVATAR commitment.
     */
    get documentation(): string {
        const supportedVisuals = AVATAR_VISUALS.map((avatarVisual) => `\`${avatarVisual.id}\``).join(', ');

        return spaceTrim(`
            # ${this.type}

            Sets the built-in avatar visual used for the agent when no explicit \`META IMAGE\` is provided.
            \`META AVATAR\` and \`META VISUAL\` are equivalent.

            ## Key aspects

            - Does not modify the agent's behavior or responses.
            - Only one \`META AVATAR\` or \`META VISUAL\` should be used per agent.
            - If multiple are specified, the last one takes precedence.
            - Values are matched case-insensitively and spaces, hyphens, and underscores are normalized.
            - Supported visuals are derived from the shared avatar registry: ${supportedVisuals}.

            ## Examples

            \`\`\`book
            Pixel Assistant

            META AVATAR PIXEL_ART
            GOAL Help users with concise answers.
            \`\`\`

            \`\`\`book
            Minecraft Assistant

            META VISUAL Minecraft2
            GOAL Answer in a calm and focused way.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // META AVATAR and META VISUAL don't modify the system message or model requirements.
        // It's handled separately in the parsing logic for profile avatar resolution.
        return requirements;
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name

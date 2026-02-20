import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META VOICE commitment definition
 *
 * The META VOICE commitment tells the agent which ElevenLabs voice ID should be used
 * when text-to-speech playback is requested.
 *
 * Example usage in agent source:
 *
 * ```book
 * META VOICE 21m00Tcm4TlvDq8ikWAM
 * ```
 *
 * @private Voice-related metadata used only by the UI and TTS helpers
 */
export class MetaVoiceCommitmentDefinition extends BaseCommitmentDefinition<'META VOICE'> {
    public constructor() {
        super('META VOICE', ['VOICE']);
    }

    /**
     * Short one-line description of META VOICE.
     */
    get description(): string {
        return 'Select the ElevenLabs voice ID used for this agent.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🎙️';
    }

    /**
     * Markdown documentation for META VOICE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META VOICE

            Instructs the UI to use a specific ElevenLabs voice when reading this agent's replies aloud.

            ## Key aspects

            - Only affects ElevenLabs TTS playback, not agent behavior or system prompts
            - If multiple \`META VOICE\` lines are provided, the last one wins
            - The value should match one of the voice IDs listed in the ElevenLabs console

            ## Example

            \`\`\`book
            Friendly Assistant

            META VOICE 21m00Tcm4TlvDq8ikWAM
            PERSONA You are a warm, conversational tutor
            \`\`\`
        `);
    }

    public applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // META VOICE is metadata only and does not alter system messages or tools
        return requirements;
    }

    /**
     * Convenience helper to normalize the provided voice ID.
     */
    public extractVoiceId(content: string): string | null {
        const trimmedContent = content.trim();
        return trimmedContent || null;
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

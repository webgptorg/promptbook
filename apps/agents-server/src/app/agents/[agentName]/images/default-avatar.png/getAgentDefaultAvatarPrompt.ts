import { AgentBasicInformation } from '@promptbook-local/types';
import spaceTrim from 'spacetrim';
import { string_prompt_image } from '../../../../../../../../src/types/typeAliases';

/**
 * Formats an array of strings into bullet list rows.
 *
 * @private
 */
const renderBullets = (items: readonly string[]) => items.map((item) => `-  ${item}`).join('\n');

/**
 * Builds the image prompt that generates the modern default avatar for the agent.
 *
 * @param agent - Basic agent information used to personalize the portrait.
 * @returns A prompt string describing the high-end, cinematic, and symbolic avatar.
 * @public
 */
export function getAgentDefaultAvatarPrompt(agent: AgentBasicInformation): string_prompt_image {
    const {
        agentName,
        personaDescription,
        meta: { fullname, color, font },
    } = agent;
    const paletteHint = color || 'graphite with iridescent sapphire accents';
    const typographyHint = font || 'a modern geometric sans serif';
    const heroLabel = fullname || agentName || 'Promptbook Agent';
    const personaBlock = (personaDescription || 'Friendly, future-ready partner.').trim();

    const styleHighlights = [
        `High-resolution portrait that combines digital illustration polish with photographic depth of field, as if shot for a premium innovation magazine.`,
        `Soft volumetric rim light meets saturated highlights; the figure glows with subtle neon edges and gentle lens flares without looking cartoonish.`,
        `Treat skin, fabric, or symbolic armor as tactile surfaces (soft ceramics, brushed metal, or woven fibers) that still read as human and welcoming.`,
    ];

    const motifHighlights = [
        `Color palette anchored in ${paletteHint}, complemented by luminous accent streaks to suggest intelligence and energy.`,
        `Typography hints tied to ${typographyHint} in any implied badges, borders, or soft UI fragments.`,
        'Introduce symbolic cues (constellations, guiding hands, delicate circuitry gestures) that feel like metaphors for memory, guidance, or navigation.',
    ];

    const compositionHints = [
        'Vertical composition with the figure centered and filling roughly two-thirds of the frame, leaving airy gradients behind.',
        'Simple yet textured background (soft gradients, mist, or abstract planes) that keeps the focus on the figure and its mood.',
        'Facial expression is calm, confident, and observant—balanced between empathy and quiet authority.',
    ];

    const lightingHints = [
        'Soft, temperature-balanced lighting with a gentle highlight on one cheekbone and subtle fill on the opposite side.',
        'Textures should carry a delicate sheen as if the subject is lit through frosted glass, supporting a timeless but modern feel.',
    ];

    return spaceTrim(
        (block) => `

            Create a modern portrait interpreting the figure that symbolizes the AI agent named "${heroLabel}".

            ${renderBullets(styleHighlights)}

            Persona summary:
            \`\`\`
            ${block(personaBlock)}
            \`\`\`

            Motifs & palette:
            ${renderBullets(motifHighlights)}

            Composition:
            ${renderBullets(compositionHints)}

            Lighting & texture:
            ${renderBullets(lightingHints)}

            Atmosphere should feel timeless, curious, and deeply human while remaining unmistakably crafted by light and pixels.
        `,
    );
}

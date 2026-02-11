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
 * @private @@@
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
        `Warm, high-resolution portrait that balances painterly softness with photographic clarity, like a trusted mentor featured in a business leadership profile.`,
        `Ambient golden-hour tones wrap the figure while retaining crisp details; luminous accents read as steady insight rather than neon flash.`,
        `Clothing or symbolic layers should feel polished yet tactile—soft wool, brushed metal, or woven fibers—that remain human and reassuring.`,
    ];

    const motifHighlights = [
        `Color palette rooted in ${paletteHint}, with gentle amber, honeyed, or copper accents that convey warmth and calm intelligence.`,
        `Typography echoes ${typographyHint} through refined badges, lapel insignias, or soft framing glyphs that underline professionalism.`,
        'Introduce symbols such as steady horizons, guiding hands, open books, or constellations that speak to mentorship and reliable guidance.',
    ];

    const compositionHints = [
        'Vertical composition with the figure centered and occupying roughly two-thirds of the frame, leaving soft tonal gradients behind.',
        'Simple yet rich background (warm gradients, brushed textures, or subtle auroras) that keeps focus on the figure while suggesting depth.',
        'Facial expression is warm, calm, and observant—with a gentle smile or knowing gaze that blends empathy with quiet authority.',
    ];

    const lightingHints = [
        'Soft, warm lighting with a gentle highlight on one cheekbone and a balanced fill on the opposite side to model approachable depth.',
        'Surfaces should glow with a subtle sheen, as if lit through layered diffusion, reinforcing a timeless but contemporary presence.',
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

            Atmosphere should feel like a welcoming, wise advisor—timeless, human, and unmistakably crafted by thoughtful light and pixels.
        `,
    );
}

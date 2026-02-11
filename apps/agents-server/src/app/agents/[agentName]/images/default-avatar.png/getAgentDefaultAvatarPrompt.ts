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
        `Create a non-photorealistic animated illustration with rich, hand-crafted digital rendering and confident business polish.`,
        `The character should feel like a friendly, wise mentor: warm, composed, approachable, and clearly competent without looking childish.`,
        `Avoid cold technocratic aesthetics; favor tactile brushwork, gentle gradients, and elegant stylization that feels modern and human.`,
    ];

    const motifHighlights = [
        `Color palette rooted in ${paletteHint}, harmonized with warm ambers, terracotta, peach, or muted gold to create welcoming contrast.`,
        `Reference ${typographyHint} only as abstract shape language (rhythm, geometry, spacing), never as readable letters or words.`,
        'Use symbolic motifs of guidance and intelligence (constellations, pathways, lantern glow, layered maps, subtle geometric halos) in a mature business context.',
    ];

    const compositionHints = [
        'Vertical composition with a clearly readable central character and clean silhouette, suitable for small avatar crops.',
        'Each agent should feel visually distinct through unique accessories, framing motifs, mood, and scene geometry so users can quickly tell them apart.',
        'Background should be rich but uncluttered, using layered animated-style textures and soft depth cues rather than realistic photography.',
    ];

    const lightingHints = [
        'Use warm cinematic lighting with soft bounce light and subtle rim accents to communicate safety, clarity, and helpful presence.',
        'Keep material rendering stylized and illustrative (not photoreal), with smooth gradients and selective detail that reads cleanly at avatar size.',
    ];

    return spaceTrim(
        (block) => `

            Create an animated, non-photorealistic portrait of the AI agent persona "${heroLabel}".

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

            Hard constraints:
            -  No photorealism.
            -  No text, letters, logos, or readable typography in the image.
            -  Professional business-friendly tone: warm and welcoming, never childish or goofy.

            Atmosphere should feel like a welcoming, wise advisor: a trustworthy assistant rendered in a distinctive animated visual language.
        `,
    );
}

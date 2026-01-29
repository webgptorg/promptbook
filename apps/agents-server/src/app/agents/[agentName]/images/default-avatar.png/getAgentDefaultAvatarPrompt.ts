import { AgentBasicInformation } from '@promptbook-local/types';
import spaceTrim from 'spacetrim';
import { string_prompt_image } from '../../../../../../../../src/types/typeAliases';

export function getAgentDefaultAvatarPrompt(agent: AgentBasicInformation): string_prompt_image {
    const {
        agentName,
        personaDescription,
        meta: { fullname, color, font },
    } = agent;

    return spaceTrim(
        // Note: [⚜] When changing the prompt here, mark commit with [⚜]
        (block) => `

            Create a portrait or figure in the style of a Central European baroque or late renaissance relief sculpture.

            The figure symbolizes the AI agent named "${fullname || agentName}".

            \`\`\`
            ${block(personaDescription || '')}
            \`\`\`

            Visual style:
            -  Focus only on the main subject (person, creature, or symbolic figure)
            -  No frames, borders, or architectural elements
            -  Use color scheme based on "${color || 'neutral tones'}"
            -  Use font style based on "${font || 'classic serif'}"
            -  hand-crafted stone or stucco relief appearance
            -  slightly weathered surface, visible age and patina
            -  muted historical colors (ochre, faded blue, warm terracotta, stone white)
            -  painterly yet sculptural look, like a carved figure
            -  shallow relief style, not flat illustration

            Symbolism:
            -  the central figure should be allegorical, readable without text
            -  avoid modern objects, screens, cables, or explicit technology
            -  express intelligence, vigilance, guidance, protection, memory, or mediation through classical symbols
            -  inspiration from animals, mythological figures, tools, or natural elements

            Composition:
            -  centered figure only
            -  no decorative flourishes or surrounding ornaments
            -  no frames or cartouches
            -  clean background, neutral or simple
            -  figure fills most of the composition

            Lighting and texture:
            -  soft daylight
            -  realistic stone and plaster texture
            -  subtle shadows enhancing relief depth

            Overall mood:
            -  timeless
            -  dignified
            -  calm authority
            -  classical sculptural portrait
            
        `,
    );
}

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

            Create a historical house sign (domovní znamení) in the style of a Central European baroque or late renaissance facade relief.

            The main motif symbolizes the AI agent named "${fullname || agentName}".

            \`\`\`
            ${block(personaDescription || '')}
            \`\`\`

            Visual style:
            -  oval or cartouche-shaped frame
            -  Use color scheme based on "${color || 'neutral tones'}"
            -  Use font style based on "${font || 'classic serif'}"
            -  hand-crafted stone or stucco relief
            -  slightly weathered surface, visible age and patina
            -  muted historical colors (ochre, faded blue, warm terracotta, stone white)
            -  painterly yet sculptural look, like a carved facade emblem
            -  shallow relief, not flat illustration

            Symbolism:
            -  the central figure should be allegorical, readable without text
            -  avoid modern objects, screens, cables, or explicit technology
            -  express intelligence, vigilance, guidance, protection, memory, or mediation through classical symbols
            -  inspiration from animals, mythological figures, tools, or natural elements

            Composition:
            -  centered motif
            -  symmetrical or near-symmetrical layout
            -  decorative baroque flourishes around the frame
            -  suitable for placement above a historical doorway

            Lighting and texture:
            -  soft daylight
            -  realistic stone and plaster texture
            -  subtle shadows enhancing relief depth

            Overall mood:
            -  timeless
            -  dignified
            -  calm authority
            -  feels like a house sign named “U …” (At the sign of …)
            
        `,
    );
}

import { AgentBasicInformation } from '@promptbook-local/types';
import spaceTrim from 'spacetrim';
import { string_prompt_image } from '../../../../../../../../src/types/typeAliases';

export function getAgentDefaultAvatarPrompt(agent: AgentBasicInformation): string_prompt_image {
    const {
        agentName,
        personaDescription,
        meta: { fullname, color },
    } = agent;

    return spaceTrim(
        (block) => `
            Professional corporate headshot of ${fullname || agentName}
            
            ${block(personaDescription || '')}
            
            - Professional business portrait photograph
            - Photorealistic, studio quality lighting
            - Shot with 85mm lens, shallow depth of field
            - Neutral gray or soft gradient background
            - Subject wearing professional attire with accent colors: ${color}
            - Confident, approachable expression with slight smile
            - Eye-level camera angle, centered composition
            - Soft diffused lighting, subtle rim light
            - Sharp focus on eyes, cinematic color grading
            - 8K resolution, ultra detailed
            
        `,
    );
}

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
            Image of ${fullname || agentName}
            
            ${block(personaDescription || '')}
            
            - Portrait photograph
            - Photorealistic portrait
            - Use clothes with colors: ${color}
            - Detailed, high quality
            
        `,
    );
}

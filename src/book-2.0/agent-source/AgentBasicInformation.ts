import type { string_agent_name, string_url_image } from '../../types/typeAliases';

export type AgentBasicInformation = {
    /**
     * Name of the agent
     * This is the first line of the agent source
     */
    agentName: string_agent_name | null;

    /**
     * Optional description of the agent
     * This is the line starting with "PERSONA"
     */
    personaDescription: string | null;

    /**
     * Optional profile image URL
     * This is the line starting with "META IMAGE"
     */
    profileImageUrl: string_url_image;
};

/**
 * TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
 */

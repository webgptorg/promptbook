import type { string_agent_name, string_url_image } from '../../types/typeAliases';

/**
 * Unified parameter representation that supports two different notations:
 * 1. @Parameter - single word parameter starting with @
 * 2. {parameterName} or {parameter with multiple words} or {parameterName: description text}
 * Both notations represent the same syntax feature - parameters
 */
export type BookParameter = {
    /**
     * The raw text of the parameter as it appears in the source
     */
    text: string;

    /**
     * The notation used for this parameter
     */
    notation: 'at' | 'brace';

    /**
     * The parameter name (without @ or {})
     */
    name: string;

    /**
     * Optional description for {parameterName: description} notation
     */
    description?: string;
};

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

    /**
     * Parameters found in the agent source
     * Supports two different notations for the same syntax feature:
     * - @Parameter (single word parameter starting with @)
     * - {parameterName} or {parameter with multiple words} or {parameterName: description text}
     */
    parameters: BookParameter[];
};

/**
 * TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
 */

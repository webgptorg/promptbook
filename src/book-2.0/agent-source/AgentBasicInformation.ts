import type { string_agent_hash, string_agent_name, string_color, string_url_image } from '../../types/typeAliases';

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
    agentName: string_agent_name;

    /**
     * Hash of the agent source for integrity verification
     */
    agentHash: string_agent_hash;

    /**
     * Optional description of the agent
     * This is the line starting with "PERSONA"
     */
    personaDescription: string | null;
    // <- TODO: [🕛][🧠]  Maybe rename to just `description`

    /**
     * Metadata commitments parsed from META lines
     * Each META commitment has the format "META TYPE content"
     * When there are multiple meta commitments of the same type, later overrides earlier
     */
    meta: {
        image?: string_url_image;
        color?: string_color;
        [key: string]: string | undefined;
    };

    /**
     * Parameters found in the agent source
     * Supports two different notations for the same syntax feature:
     * - @Parameter (single word parameter starting with @)
     * - {parameterName} or {parameter with multiple words} or {parameterName: description text}
     */
    parameters: BookParameter[];
    // <- TODO: [🧠][😰] Maybe remove, Agent is not working with the parameters
};

/**
 * TODO: !!!! Make all properties of `AgentBasicInformation` readonly
 * TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
 */

import type {
    string_agent_hash,
    string_agent_name,
    string_agent_url,
    string_color,
    string_fonts,
    string_url_image,
} from '../../types/typeAliases';

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
     * Unique identifier of the agent
     * This is a random base58 string assigned by the server
     */
    permanentId: string;

    /**
     * Optional description of the agent
     * This is the line starting with "PERSONA"
     */
    personaDescription: string | null;
    // <- TODO: [🕛][🧠]  Maybe rename to just `description`

    /**
     * The initial message shown to the user when the chat starts
     * This is the line starting with "INITIAL MESSAGE"
     */
    initialMessage: string | null;

    /**
     * Metadata commitments parsed from META lines
     * Each META commitment has the format "META TYPE content"
     * When there are multiple meta commitments of the same type, later overrides earlier
     */
    meta: {
        fullname?: string;
        image?: string_url_image;
        font?: string_fonts;
        color?: string_color;
        [key: string]: string | undefined;
    };

    /**
     * Links found in the agent source
     * This corresponds to META LINK commitments
     */
    links: Array<string_agent_url>;

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
 * TODO: [🐱‍🚀] Make all properties of `AgentBasicInformation` readonly
 * TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
 */

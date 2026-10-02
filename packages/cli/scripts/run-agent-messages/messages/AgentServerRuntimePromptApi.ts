/**
 * Internal runtime API details available to an Agents Server-managed coding agent.
 */
export type AgentServerRuntimePromptApi = {
    /**
     * Permanent id of the agent currently answering the message.
     */
    readonly agentPermanentId: string;

    /**
     * Environment variable containing the Agents Server origin.
     */
    readonly serverUrlEnvironmentVariableName: string;

    /**
     * Environment variable containing the internal worker token.
     */
    readonly tokenEnvironmentVariableName: string;
};

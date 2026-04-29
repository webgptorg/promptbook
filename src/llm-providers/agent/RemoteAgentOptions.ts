import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { string_agent_url } from '../../types/typeAliases';

/**
 * Options for creating a Remote Agent
 */
export type RemoteAgentOptions = Omit<CommonToolsOptions, 'teacherAgent'> & {
    /**
     * Url of the remote agent
     */
    agentUrl: string_agent_url;
    /**
     * Additional HTTP headers sent to the remote agent profile, chat, and voice endpoints.
     */
    requestHeaders?: Record<string, string>;
};

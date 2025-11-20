import { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import { string_agent_url } from '../../types/typeAliases';

/**
 * Options for creating a Remote Agent
 */
export type RemoteAgentOptions = CommonToolsOptions & {
    /**
     * Url of the remote agent
     */
    agentUrl: string_agent_url;
};

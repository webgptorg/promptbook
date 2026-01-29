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
};

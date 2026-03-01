import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { string_agent_url } from '../../types/typeAliases';

/**
 * Options for creating a Remote Agent
 *
 * @public exported from `@promptbook/core`
 */
export type RemoteAgentOptions = Omit<CommonToolsOptions, 'teacherAgent'> & {
    /**
     * Url of the remote agent
     */
    agentUrl: string_agent_url;

    /**
     * Optional chat ID for browser-independent chat synchronization.
     * When provided, the agent will include this in requests to enable
     * real-time sync across multiple browser windows.
     *
     * @public exported from `@promptbook/core`
     */
    chatId?: string;
};

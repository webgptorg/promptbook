import { AgentCollection } from '@promptbook-local/types';

/**
 * @@@
 */
type Agent = Awaited<ReturnType<AgentCollection['listAgents']>>[number];

/**
 * @@@
 */
type AgentWithUrl = Agent & {
    url: string;
};

/**
 * @@@
 */
export type AgentsByServer = {
    serverUrl: string;
    agents: AgentWithUrl[];
};

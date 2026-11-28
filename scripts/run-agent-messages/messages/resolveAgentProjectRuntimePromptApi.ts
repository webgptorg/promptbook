import { basename } from 'path';
import {
    PTBK_AGENTS_SERVER_URL_ENV,
    PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV,
} from '../../../apps/agents-server/src/utils/agentProjects/agentProjectRuntimeConstants';
import { resolveAgentIdFromRepositoryName } from '../main/agentIgnorePatterns';
import type { AgentProjectRuntimePromptApi } from './buildAgentProjectsPromptSection';

/**
 * Resolves project-runtime prompt API details for one local agent runner folder.
 *
 * @param projectPath - Absolute path of the current agent runner folder.
 * @returns Runtime prompt API details or `undefined` outside Agents Server-managed runs.
 */
export function resolveAgentProjectRuntimePromptApi(projectPath: string): AgentProjectRuntimePromptApi | undefined {
    const agentPermanentId = resolveAgentIdFromRepositoryName(basename(projectPath));
    const isServerUrlAvailable = Boolean(process.env[PTBK_AGENTS_SERVER_URL_ENV]?.trim());
    const isWorkerTokenAvailable = Boolean(process.env[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV]?.trim());

    if (!agentPermanentId || !isServerUrlAvailable || !isWorkerTokenAvailable) {
        return undefined;
    }

    return {
        agentPermanentId,
        serverUrlEnvironmentVariableName: PTBK_AGENTS_SERVER_URL_ENV,
        tokenEnvironmentVariableName: PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV,
    };
}


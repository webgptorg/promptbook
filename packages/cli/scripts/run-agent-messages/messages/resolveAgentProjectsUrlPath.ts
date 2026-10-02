import { basename } from 'path';
import { resolveAgentIdFromRepositoryName } from '../main/agentIgnorePatterns';

/**
 * Resolves the Agents Server projects URL path for one local agent runner folder.
 *
 * Agent runner folders managed by the Agents Server follow the `agent-<agentId>` naming
 * convention, so the stable agent id can be derived from the folder name. For ad-hoc
 * workspaces (for example `ptbk agent exec` sessions) no URL path is resolved and the
 * prompt falls back to generic project references.
 *
 * @param projectPath - Absolute path of the agent runner folder.
 * @returns Projects URL path like `/agents/<agentId>/projects`, or `undefined` when unknown.
 */
export function resolveAgentProjectsUrlPath(projectPath: string): string | undefined {
    const agentId = resolveAgentIdFromRepositoryName(basename(projectPath));

    if (!agentId) {
        return undefined;
    }

    return `/agents/${encodeURIComponent(agentId)}/projects`;
}

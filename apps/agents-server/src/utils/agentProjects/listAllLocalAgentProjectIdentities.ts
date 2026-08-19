import { readdir } from 'fs/promises';
import { resolveLocalAgentRootPath } from '../localChatRunner/ensureLocalAgentFolder';
import type { AgentProjectIdentity } from './agentProjectIdentity';
import { parseAgentPermanentIdFromDirectoryName } from './agentProjectsPaths';
import { isMissingPathError } from './isMissingPathError';
import { listAgentProjectNames } from './listAgentProjectNames';

/**
 * Lists every project folder present on this machine, across all agents of all servers.
 *
 * Unlike `listAllAgentProjectSummaries` this never asks a database which agents exist and never
 * measures a project tree — it only reads the two directory levels needed to name a project. That
 * makes it usable before the first request is served, when no server database is selected yet.
 *
 * @returns Identities of all local agent projects ordered by agent and project name.
 */
export async function listAllLocalAgentProjectIdentities(): Promise<ReadonlyArray<AgentProjectIdentity>> {
    const localAgentRootPath = resolveLocalAgentRootPath();
    let localAgentRootEntries;

    try {
        localAgentRootEntries = await readdir(localAgentRootPath, { withFileTypes: true });
    } catch (error) {
        if (isMissingPathError(error)) {
            return [];
        }

        throw error;
    }

    const agentPermanentIds = localAgentRootEntries
        .filter((localAgentRootEntry) => localAgentRootEntry.isDirectory())
        .map((agentDirectoryEntry) => parseAgentPermanentIdFromDirectoryName(agentDirectoryEntry.name))
        .filter((agentPermanentId): agentPermanentId is string => agentPermanentId !== null)
        .sort((firstAgentPermanentId, secondAgentPermanentId) =>
            firstAgentPermanentId.localeCompare(secondAgentPermanentId),
        );

    const identitiesPerAgent = await Promise.all(
        agentPermanentIds.map(async (agentPermanentId): Promise<ReadonlyArray<AgentProjectIdentity>> => {
            const projectNames = await listAgentProjectNames(agentPermanentId);

            return projectNames.map((projectName) => ({ agentPermanentId, projectName }));
        }),
    );

    return identitiesPerAgent.flat();
}

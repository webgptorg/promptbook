import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { readdir } from 'fs/promises';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { resolveLocalAgentRootPath } from '../localChatRunner/ensureLocalAgentFolder';
import type { AgentProjectsSummary, AllAgentProjectsReport } from './AgentProjectInfo';
import { parseAgentPermanentIdFromDirectoryName } from './agentProjectsPaths';
import { isMissingPathError } from './isMissingPathError';
import { listAgentProjects } from './listAgentProjects';

/**
 * Builds the server-wide report of all projects of all agents.
 *
 * The report is assembled from the local agent root on disk (the single source of truth for
 * project data) and enriched with agent display names from the database. Agents without any
 * project are counted but not listed.
 *
 * @returns Report with per-agent summaries ordered by total size descending.
 */
export async function listAllAgentProjectSummaries(): Promise<AllAgentProjectsReport> {
    const rootPath = resolveLocalAgentRootPath();
    const agentDirectoryNames = await listAgentDirectoryNames(rootPath);

    const summaryCandidates = await Promise.all(
        agentDirectoryNames.map(async (agentDirectoryName): Promise<AgentProjectsSummary | null> => {
            const agentPermanentId = parseAgentPermanentIdFromDirectoryName(agentDirectoryName);
            if (agentPermanentId === null) {
                return null;
            }

            const projects = await listAgentProjects(agentPermanentId);
            if (projects.length === 0) {
                return null;
            }

            return {
                agentPermanentId,
                agentName: null,
                agentDirectoryName,
                projects,
                totalSizeBytes: projects.reduce((totalSizeBytes, project) => totalSizeBytes + project.sizeBytes, 0),
                totalFileCount: projects.reduce((totalFileCount, project) => totalFileCount + project.fileCount, 0),
            };
        }),
    );

    const summariesWithoutNames = summaryCandidates.filter(
        (summaryCandidate): summaryCandidate is AgentProjectsSummary => summaryCandidate !== null,
    );
    const agentNameByPermanentId = await loadAgentNamesByPermanentId(
        summariesWithoutNames.map((summary) => summary.agentPermanentId),
    );
    const summaries = summariesWithoutNames
        .map((summary) => ({
            ...summary,
            agentName: agentNameByPermanentId.get(summary.agentPermanentId.toLowerCase()) ?? null,
        }))
        .sort((firstSummary, secondSummary) => secondSummary.totalSizeBytes - firstSummary.totalSizeBytes);

    return {
        rootPath,
        scannedAgentDirectoryCount: agentDirectoryNames.length,
        summaries,
        totalSizeBytes: summaries.reduce((totalSizeBytes, summary) => totalSizeBytes + summary.totalSizeBytes, 0),
        totalProjectCount: summaries.reduce((totalProjectCount, summary) => totalProjectCount + summary.projects.length, 0),
        totalFileCount: summaries.reduce((totalFileCount, summary) => totalFileCount + summary.totalFileCount, 0),
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Lists local agent directory names inside the agent root, treating a missing root as empty.
 */
async function listAgentDirectoryNames(rootPath: string): Promise<ReadonlyArray<string>> {
    try {
        const rootEntries = await readdir(rootPath, { withFileTypes: true });
        return rootEntries
            .filter((rootEntry) => rootEntry.isDirectory())
            .map((rootEntry) => rootEntry.name)
            .filter((directoryName) => parseAgentPermanentIdFromDirectoryName(directoryName) !== null);
    } catch (error) {
        if (isMissingPathError(error)) {
            return [];
        }

        throw error;
    }
}

/**
 * Loads display names of agents for the given permanent ids in one query.
 *
 * Local agent directory names are lowercased permanent ids, so the lookup map is keyed by
 * lowercased permanent id.
 */
async function loadAgentNamesByPermanentId(
    agentPermanentIds: ReadonlyArray<string>,
): Promise<Map<string, string>> {
    if (agentPermanentIds.length === 0) {
        return new Map();
    }

    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('Agent'))
        .select('permanentId,agentName')
        .in('permanentId', [...agentPermanentIds]);

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to load agent names for the projects report.

                **Database error:** ${error.message}
            `),
        );
    }

    const agentNameByPermanentId = new Map<string, string>();
    for (const agentRow of (data || []) as Array<{ permanentId: string | null; agentName: string | null }>) {
        if (agentRow.permanentId && agentRow.agentName) {
            agentNameByPermanentId.set(agentRow.permanentId.toLowerCase(), agentRow.agentName);
        }
    }

    return agentNameByPermanentId;
}

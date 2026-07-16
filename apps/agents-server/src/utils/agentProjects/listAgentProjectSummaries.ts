import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import type { AgentProjectRecord } from './AgentProjectRecord';
import { listAgentProjects } from './listAgentProjects';
import { readAgentProjectDirectoryUsage, type AgentProjectDirectoryUsage } from './readAgentProjectDirectoryUsage';

/**
 * Agent row fields needed by project admin summaries.
 */
type AgentProjectOwnerRow = Pick<
    AgentsServerDatabase['public']['Tables']['Agent']['Row'],
    'agentName' | 'permanentId' | 'userId'
>;

/**
 * Project summary with filesystem usage.
 */
export type AgentProjectSummary = AgentProjectRecord &
    AgentProjectDirectoryUsage & {
        /**
         * Human-readable owning agent name.
         */
        readonly agentName: string | null;

        /**
         * Owning user id inherited from the agent.
         */
        readonly userId: number | null;
    };

/**
 * Aggregated project usage for one agent.
 */
export type AgentProjectsByAgentSummary = {
    readonly agentPermanentId: string;
    readonly agentName: string | null;
    readonly userId: number | null;
    readonly projectCount: number;
    readonly totalSizeBytes: number;
    readonly projects: ReadonlyArray<AgentProjectSummary>;
};

/**
 * Lists all project summaries with directory sizes and owner metadata.
 *
 * @param options - Optional agent scope.
 * @returns Project summaries.
 */
export async function listAgentProjectSummaries(
    options: {
        readonly agentPermanentId?: string;
    } = {},
): Promise<Array<AgentProjectSummary>> {
    const [projects, agentsByPermanentId] = await Promise.all([
        listAgentProjects({
            agentPermanentId: options.agentPermanentId,
        }),
        loadAgentProjectOwners(),
    ]);

    return await Promise.all(
        projects.map(async (project) => {
            const usage = await readAgentProjectDirectoryUsage(project.directoryPath);
            const agent = agentsByPermanentId.get(project.agentPermanentId);
            return {
                ...project,
                ...usage,
                agentName: agent?.agentName ?? null,
                userId: agent?.userId ?? null,
            };
        }),
    );
}

/**
 * Groups project summaries by owning agent.
 *
 * @param projects - Project summaries.
 * @returns Agent grouped summaries.
 */
export function groupAgentProjectSummariesByAgent(
    projects: ReadonlyArray<AgentProjectSummary>,
): Array<AgentProjectsByAgentSummary> {
    const summariesByAgentPermanentId = new Map<string, AgentProjectsByAgentSummary>();

    for (const project of projects) {
        const existingSummary = summariesByAgentPermanentId.get(project.agentPermanentId);
        if (existingSummary) {
            summariesByAgentPermanentId.set(project.agentPermanentId, {
                ...existingSummary,
                projectCount: existingSummary.projectCount + 1,
                totalSizeBytes: existingSummary.totalSizeBytes + project.sizeBytes,
                projects: [...existingSummary.projects, project],
            });
            continue;
        }

        summariesByAgentPermanentId.set(project.agentPermanentId, {
            agentPermanentId: project.agentPermanentId,
            agentName: project.agentName,
            userId: project.userId,
            projectCount: 1,
            totalSizeBytes: project.sizeBytes,
            projects: [project],
        });
    }

    return Array.from(summariesByAgentPermanentId.values()).sort((left, right) => {
        const leftName = left.agentName || left.agentPermanentId;
        const rightName = right.agentName || right.agentPermanentId;
        return leftName.localeCompare(rightName);
    });
}

/**
 * Loads agent owner metadata indexed by permanent id.
 *
 * @private function of `listAgentProjectSummaries`
 */
async function loadAgentProjectOwners(): Promise<Map<string, AgentProjectOwnerRow>> {
    const supabase = $provideSupabaseForServer();
    const agentTableName = await $getTableName('Agent');
    const { data, error } = await supabase
        .from(agentTableName)
        .select('agentName, permanentId, userId')
        .is('deletedAt', null);

    if (error) {
        throw new DatabaseError(error.message);
    }

    const agentsByPermanentId = new Map<string, AgentProjectOwnerRow>();
    for (const agent of (data || []) as AgentProjectOwnerRow[]) {
        if (agent.permanentId) {
            agentsByPermanentId.set(agent.permanentId, agent);
        }
    }

    return agentsByPermanentId;
}

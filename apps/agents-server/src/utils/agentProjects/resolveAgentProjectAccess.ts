import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { UserInfo } from '../getCurrentUser';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import type { AgentProjectRecord } from './AgentProjectRecord';
import { findAgentProjectByIdentifier } from './listAgentProjects';

/**
 * Access-check result for one project.
 */
export type AgentProjectAccessResult =
    | {
          readonly isAllowed: true;
          readonly project: AgentProjectRecord;
      }
    | {
          readonly isAllowed: false;
          readonly status: 401 | 403 | 404;
          readonly message: string;
      };

/**
 * Resolves one project by id and checks whether the current user may read it.
 *
 * @param projectId - Project id from the route.
 * @param currentUser - Authenticated user snapshot.
 * @returns Access result.
 */
export async function resolveAgentProjectReadAccess(
    projectId: number,
    currentUser: UserInfo | null,
): Promise<AgentProjectAccessResult> {
    if (!currentUser) {
        return {
            isAllowed: false,
            status: 401,
            message: 'Unauthorized',
        };
    }

    const project = await findProjectById(projectId);
    if (!project) {
        return {
            isAllowed: false,
            status: 404,
            message: 'Project not found',
        };
    }

    if (currentUser.isAdmin) {
        return {
            isAllowed: true,
            project,
        };
    }

    const agentOwnerId = await loadAgentOwnerId(project.agentPermanentId);
    if (typeof currentUser.id === 'number' && agentOwnerId === currentUser.id) {
        return {
            isAllowed: true,
            project,
        };
    }

    return {
        isAllowed: false,
        status: 403,
        message: 'Forbidden',
    };
}

/**
 * Finds one active project by numeric id.
 *
 * @private function of `resolveAgentProjectReadAccess`
 */
async function findProjectById(projectId: number): Promise<AgentProjectRecord | null> {
    const supabase = $provideSupabaseForServer();
    const projectTableName = await $getTableName('AgentProject');
    const { data, error } = await supabase
        .from(projectTableName)
        .select('agentPermanentId')
        .eq('id', projectId as never)
        .is('deletedAt', null)
        .maybeSingle<{ agentPermanentId: string }>();

    if (error) {
        throw new DatabaseError(error.message);
    }

    if (!data) {
        return null;
    }

    return findAgentProjectByIdentifier(data.agentPermanentId, projectId);
}

/**
 * Loads the owning user id for one agent.
 *
 * @private function of `resolveAgentProjectReadAccess`
 */
async function loadAgentOwnerId(agentPermanentId: string): Promise<number | null> {
    const supabase = $provideSupabaseForServer();
    const agentTableName = await $getTableName('Agent');
    const { data, error } = await supabase
        .from(agentTableName)
        .select('userId')
        .eq('permanentId', agentPermanentId as never)
        .maybeSingle<{ userId: number | null }>();

    if (error) {
        throw new DatabaseError(error.message);
    }

    return data?.userId ?? null;
}

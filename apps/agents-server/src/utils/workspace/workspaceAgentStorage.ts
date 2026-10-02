import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { $provideServer } from '../../tools/$provideServer';
import { AgentCollectionInWorkspace } from '../../../../../scripts/run-codex-prompts/workspace/AgentCollectionInWorkspace';
import { WorkspaceState } from '../../../../../scripts/run-codex-prompts/workspace/WorkspaceState';
import { resolveServerSqliteDatabasePath } from '../../database/sqlite/resolveServerSqliteDatabasePath';
import { invalidateCachedActiveOrganizationSnapshots } from '../agentOrganization/loadAgentOrganizationState';
import { $invalidateProvidedAgentReferenceResolverCache } from '../agentReferenceResolver/$provideAgentReferenceResolver';
import { invalidateCachedServerAgentRuntime } from '../cachedServerAgentRuntime';

/** Workspace collection cache is keyed by explicit project and namespace, never by listening port. */
const WORKSPACE_COLLECTIONS = new Map<string, AgentCollectionInWorkspace>();

/** Distinguishes standalone/droplet database sources from workspace file authority. */
export function isWorkspaceAgentStorage(): boolean {
    return Boolean(process.env.PTBK_AGENTS_SERVER_WORKSPACE);
}

/** Provides the same file-backed collection used by the CLI supervisor. */
export async function provideWorkspaceAgentCollection(): Promise<AgentCollectionInWorkspace> {
    const projectPath = process.env.PTBK_AGENTS_SERVER_WORKSPACE!;
    const repositoryRoot = process.env.PTBK_AGENTS_SERVER_REPOSITORY_ROOT!;
    const { tablePrefix } = await $provideServer();
    const key = `${projectPath}:${tablePrefix}`;
    let collection = WORKSPACE_COLLECTIONS.get(key);
    if (!collection) {
        collection = new AgentCollectionInWorkspace(
            { projectPath, repositoryRoot, repositoryStatus: 'reused' },
            $provideSupabaseForServer(),
            new WorkspaceState(resolveServerSqliteDatabasePath(tablePrefix)),
            tablePrefix,
            () => {
                invalidateCachedActiveOrganizationSnapshots();
                $invalidateProvidedAgentReferenceResolverCache();
                invalidateCachedServerAgentRuntime();
            },
            process.env,
        );
        WORKSPACE_COLLECTIONS.set(key, collection);
    }
    await collection.reconcile();
    return collection;
}

/**
 * Groups existing authorized folder/order actions behind source storage's provider boundary.
 * Database-only installations retain their existing action behavior.
 */
export async function mutateAgentOrganization<Result>(operation: () => Promise<Result>): Promise<Result> {
    if (!isWorkspaceAgentStorage()) return operation();
    return (await provideWorkspaceAgentCollection()).mutateOrganization(operation);
}

/** Converts recoverable storage conflicts into actionable API responses while preserving normal route authorization. */
export async function mutateAgentOrganizationRoute(operation: () => Promise<Response>): Promise<Response> {
    try {
        return await mutateAgentOrganization(operation);
    } catch (error) {
        if (error instanceof Error && error.name === 'ConflictError')
            return Response.json({ error: error.message }, { status: 409 });
        throw error;
    }
}

// Note: [💞] Ignore a discrepancy between file name and exported helper names

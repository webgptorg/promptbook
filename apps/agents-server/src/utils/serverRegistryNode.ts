import { isAgentsServerSqliteMode } from '../database/agentsServerDatabaseMode';
import { listStandaloneRegisteredServers } from '../database/sqlite/standaloneServerRegistryStore';
import {
    listRegisteredServersUsingServiceRole as listSupabaseRegisteredServersUsingServiceRole,
    type ServerRecord,
} from './serverRegistry';

/**
 * Loads registered servers for a Node.js request or background task.
 *
 * The standalone SQLite registry is deliberately imported only by this Node.js-only
 * module. Edge middleware must use environment-derived server rows instead, because
 * importing SQLite code makes Next.js compile native database dependencies into its
 * Edge bundle.
 *
 * @param options - Cache controls for the Supabase registry lookup.
 * @returns Registered servers ordered by name.
 */
export async function listRegisteredServersUsingServiceRole(options?: {
    readonly forceRefresh?: boolean;
}): Promise<Array<ServerRecord>> {
    if (isAgentsServerSqliteMode()) {
        return listStandaloneRegisteredServers();
    }

    return listSupabaseRegisteredServersUsingServiceRole(options);
}

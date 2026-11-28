import { isAgentsServerSqliteMode } from '../../database/agentsServerDatabaseMode';
import {
    listEnvironmentRegisteredServers,
    listRegisteredServersUsingServiceRole,
    type ServerRecord,
} from '../../utils/serverRegistry';

/**
 * Loads registered servers while preserving the middleware fallback behavior on failure.
 *
 * @returns Registered servers, or an empty list when unavailable.
 *
 * @private function of createMiddlewareRequestContext
 */
export async function loadRegisteredServers(): Promise<Array<ServerRecord>> {
    try {
        if (isAgentsServerSqliteMode()) {
            // Note: Edge middleware cannot open the standalone SQLite registry. `SERVERS`
            //       supplies the domain list required for its host-routing decisions.
            return listEnvironmentRegisteredServers();
        }

        return await listRegisteredServersUsingServiceRole();
    } catch (error) {
        console.error('Error loading server registry in middleware:', error);
        return [];
    }
}

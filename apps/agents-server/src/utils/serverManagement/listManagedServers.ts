import type { ServerRecord } from '../serverRegistry';
import { listRegisteredServersUsingServiceRole } from '../serverRegistry';

/**
 * Loads all registered servers directly from the shared registry cache.
 *
 * @returns Registered servers ordered by name.
 */
export async function listManagedServers(): Promise<ReadonlyArray<ServerRecord>> {
    return listRegisteredServersUsingServiceRole({ forceRefresh: true });
}

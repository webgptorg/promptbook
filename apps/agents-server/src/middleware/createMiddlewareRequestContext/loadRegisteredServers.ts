import {
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
        return await listRegisteredServersUsingServiceRole();
    } catch (error) {
        console.error('Error loading server registry in middleware:', error);
        return [];
    }
}

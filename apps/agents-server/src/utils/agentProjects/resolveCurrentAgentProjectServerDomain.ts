import { resolveCurrentServerRegistryContext } from '../currentServerRegistryContext';

/**
 * Resolves the current public server domain used to scope agent project domain assignments.
 *
 * @returns Current server domain, host server domain, or `null` when no server context is available.
 */
export async function resolveCurrentAgentProjectServerDomain(): Promise<string | null> {
    const context = await resolveCurrentServerRegistryContext();

    return context.currentServer?.domain || context.hostServer?.domain || null;
}

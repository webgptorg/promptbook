import { mapRegisteredServerContexts } from '../../tools/mapRegisteredServerContexts';
import { readStalwartConfiguration } from './StalwartConfiguration';
import { synchronizeStalwartEmailDomain } from './synchronizeStalwartEmailDomain';

/**
 * Synchronizes every registered VPS server domain without allowing one domain failure to block another.
 */
export async function synchronizeAllStalwartEmailDomains(): Promise<void> {
    if (!readStalwartConfiguration().isConfigured) {
        return;
    }

    await mapRegisteredServerContexts(async (server) => {
        if (!server) {
            return;
        }

        try {
            await synchronizeStalwartEmailDomain(server.domain);
        } catch (error) {
            console.error('[stalwart-email]', 'startup_domain_synchronization_failed', {
                serverName: server.name,
                serverDomain: server.domain,
                error,
            });
        }
    });
}

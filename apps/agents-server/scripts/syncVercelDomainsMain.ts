import { Client } from 'pg';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../src/errors/DatabaseError';
import { listRegisteredServersFromDatabase } from '../src/database/listRegisteredServersFromDatabase';
import { resolveDatabaseMigrationConnectionStringFromEnvironment } from '../src/database/runDatabaseMigrations';
import {
    addProjectDomain,
    createVercelDomainSyncPlan,
    listProjectDomains,
    loadProjectMetadata,
    loadVercelApiConfiguration,
    normalizeVercelDomainBinding,
    removeProjectDomain,
    verifyProjectDomain,
} from './createVercelDomainSyncPlan';
import {
    resolveCloudflareSyncConfiguration,
    syncCloudflareDnsRecords,
    type CloudflareDnsRecordSyncPlan,
} from './createCloudflareDnsRecordSyncPlan';
import { logSyncEvent } from './logSyncEvent';
import { printHumanReadableSyncReport } from './printHumanReadableSyncReport';

/**
 * CLI options controlling one `_Server` -> Vercel sync run.
 */
type SyncVercelDomainsOptions = {
    /**
     * When true, only logs planned changes without mutating Vercel.
     */
    readonly dryRun: boolean;
    /**
     * When true, removes Vercel project domains that are no longer present in `_Server`.
     */
    readonly deleteRemoved: boolean;
};

/**
 * Executes the `_Server` -> Vercel domain sync.
 *
 * @private function of `sync-vercel-domains`
 */
export async function syncVercelDomainsMain(): Promise<void> {
    const options = parseCliOptions(process.argv.slice(2));
    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();

    if (!connectionString) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot sync Vercel domains because \`POSTGRES_URL\` / \`DATABASE_URL\` is missing.
            `),
        );
    }

    const registeredServers = await loadRegisteredServers(connectionString);
    if (registeredServers.length === 0) {
        throw new DatabaseError(
            spaceTrim(`
                Refusing to sync Vercel domains because \`_Server\` contains no rows.
            `),
        );
    }

    const vercelConfiguration = loadVercelApiConfiguration();
    const projectMetadata = await loadProjectMetadata(vercelConfiguration);
    const projectDomains = await listProjectDomains(vercelConfiguration);
    const syncPlan = createVercelDomainSyncPlan({
        registeredServers,
        projectMetadata,
        projectDomains,
    });
    let cloudflareSyncPlan: CloudflareDnsRecordSyncPlan | null = null;
    let cloudflareSyncSkippedReason: string | null = null;

    logSyncEvent('info', 'server_registry_loaded', {
        count: registeredServers.length,
        dryRun: options.dryRun,
    });
    logSyncEvent('info', 'vercel_project_domains_loaded', {
        count: projectDomains.length,
        ignoredCount: syncPlan.ignoredDomains.length,
        dryRun: options.dryRun,
    });
    logSyncEvent('info', 'vercel_project_loaded', {
        productionBranch: projectMetadata.productionBranch,
        customEnvironmentCount: projectMetadata.customEnvironments.length,
        dryRun: options.dryRun,
    });

    for (const reconfiguration of syncPlan.domainsToReconfigure) {
        const currentBinding = normalizeVercelDomainBinding(reconfiguration.currentDomain);
        const desiredBinding = normalizeVercelDomainBinding(reconfiguration.desiredDomain);

        if (options.dryRun) {
            logSyncEvent('info', 'domain_reconfigure_planned', {
                domain: reconfiguration.desiredDomain.name,
                sourceEnvironment: reconfiguration.desiredDomain.sourceEnvironment,
                vercelEnvironment: reconfiguration.desiredDomain.vercelEnvironmentName,
                currentGitBranch: currentBinding.gitBranch,
                currentCustomEnvironmentId: currentBinding.customEnvironmentId,
                desiredGitBranch: desiredBinding.gitBranch,
                desiredCustomEnvironmentId: desiredBinding.customEnvironmentId,
                reasons: reconfiguration.reasons,
                dryRun: true,
            });
            continue;
        }

        await removeProjectDomain(vercelConfiguration, reconfiguration.currentDomain.name);
        logSyncEvent('info', 'domain_deleted_for_reconfigure', {
            domain: reconfiguration.currentDomain.name,
            dryRun: false,
        });

        const addedDomain = await addProjectDomain(vercelConfiguration, reconfiguration.desiredDomain);
        logSyncEvent('info', 'domain_reconfigured', {
            domain: reconfiguration.desiredDomain.name,
            sourceEnvironment: reconfiguration.desiredDomain.sourceEnvironment,
            vercelEnvironment: reconfiguration.desiredDomain.vercelEnvironmentName,
            gitBranch: reconfiguration.desiredDomain.gitBranch ?? null,
            customEnvironmentId: reconfiguration.desiredDomain.customEnvironmentId ?? null,
            verified: addedDomain.verified ?? null,
            dryRun: false,
        });

        if (addedDomain.verified === false) {
            await verifyProjectDomain(vercelConfiguration, reconfiguration.desiredDomain.name);
            logSyncEvent('info', 'domain_verified', {
                domain: reconfiguration.desiredDomain.name,
                dryRun: false,
            });
        }
    }

    for (const desiredDomain of syncPlan.domainsToAdd) {
        if (options.dryRun) {
            logSyncEvent('info', 'domain_add_planned', {
                domain: desiredDomain.name,
                sourceEnvironment: desiredDomain.sourceEnvironment,
                vercelEnvironment: desiredDomain.vercelEnvironmentName,
                gitBranch: desiredDomain.gitBranch ?? null,
                customEnvironmentId: desiredDomain.customEnvironmentId ?? null,
                dryRun: true,
            });
            continue;
        }

        const addedDomain = await addProjectDomain(vercelConfiguration, desiredDomain);
        logSyncEvent('info', 'domain_added', {
            domain: desiredDomain.name,
            sourceEnvironment: desiredDomain.sourceEnvironment,
            vercelEnvironment: desiredDomain.vercelEnvironmentName,
            gitBranch: desiredDomain.gitBranch ?? null,
            customEnvironmentId: desiredDomain.customEnvironmentId ?? null,
            verified: addedDomain.verified ?? null,
            dryRun: false,
        });

        if (addedDomain.verified === false) {
            await verifyProjectDomain(vercelConfiguration, desiredDomain.name);
            logSyncEvent('info', 'domain_verified', {
                domain: desiredDomain.name,
                dryRun: false,
            });
        }
    }

    for (const domain of syncPlan.domainsToVerify) {
        if (options.dryRun) {
            logSyncEvent('info', 'domain_verify_planned', { domain, dryRun: true });
            continue;
        }

        await verifyProjectDomain(vercelConfiguration, domain);
        logSyncEvent('info', 'domain_verified', {
            domain,
            dryRun: false,
        });
    }

    for (const domain of syncPlan.domainsToFlag) {
        if (!options.deleteRemoved) {
            logSyncEvent('warn', 'domain_flagged_removed_from_registry', {
                domain,
                dryRun: options.dryRun,
            });
            continue;
        }

        if (options.dryRun) {
            logSyncEvent('info', 'domain_delete_planned', { domain, dryRun: true });
            continue;
        }

        await removeProjectDomain(vercelConfiguration, domain);
        logSyncEvent('info', 'domain_deleted', {
            domain,
            dryRun: false,
        });
    }

    const cloudflareSyncConfigurationResolution = resolveCloudflareSyncConfiguration();
    if (cloudflareSyncConfigurationResolution.configuration) {
        cloudflareSyncPlan = await syncCloudflareDnsRecords({
            cloudflareConfiguration: cloudflareSyncConfigurationResolution.configuration,
            vercelConfiguration,
            desiredDomains: syncPlan.desiredDomains,
            dryRun: options.dryRun,
        });
    } else {
        cloudflareSyncSkippedReason = cloudflareSyncConfigurationResolution.skippedReason;
        logSyncEvent('warn', 'cloudflare_sync_skipped', {
            reason: cloudflareSyncSkippedReason,
            dryRun: options.dryRun,
        });
    }

    logSyncEvent('info', 'sync_completed', {
        desiredCount: syncPlan.desiredDomains.length,
        addedCount: syncPlan.domainsToAdd.length,
        verifyCount: syncPlan.domainsToVerify.length,
        reconfiguredCount: syncPlan.domainsToReconfigure.length,
        flaggedCount: syncPlan.domainsToFlag.length,
        ignoredCount: syncPlan.ignoredDomains.length,
        cloudflareCreatedCount: cloudflareSyncPlan?.recordsToCreate.length ?? 0,
        cloudflareUpdatedCount: cloudflareSyncPlan?.recordsToUpdate.length ?? 0,
        cloudflareSkippedCount: cloudflareSyncPlan?.skippedDomains.length ?? 0,
        cloudflareSyncSkippedReason,
        deleteRemoved: options.deleteRemoved,
        dryRun: options.dryRun,
    });

    printHumanReadableSyncReport({
        dryRun: options.dryRun,
        deleteRemoved: options.deleteRemoved,
        projectMetadata,
        syncPlan,
        cloudflareSyncPlan,
        cloudflareSyncSkippedReason,
    });
}

/**
 * Parses sync CLI flags.
 *
 * @param args - CLI arguments.
 * @returns Parsed sync options.
 */
function parseCliOptions(args: ReadonlyArray<string>): SyncVercelDomainsOptions {
    return {
        dryRun: args.includes('--dry-run'),
        deleteRemoved: args.includes('--delete-removed'),
    };
}

/**
 * Loads all registered servers from the global `_Server` table.
 *
 * @param connectionString - PostgreSQL connection string.
 * @returns Registered servers ordered by name.
 */
async function loadRegisteredServers(connectionString: string) {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        return await listRegisteredServersFromDatabase(client);
    } finally {
        await client.end();
    }
}

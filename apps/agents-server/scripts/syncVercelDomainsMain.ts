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
    type DesiredVercelProjectDomain,
    type VercelApiConfiguration,
    type VercelDomainReconfiguration,
    type VercelDomainSyncPlan,
    type VercelProjectMetadata,
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
 * Loaded state required for one `_Server` -> Vercel sync run.
 *
 * @private type of `sync-vercel-domains`
 */
type SyncVercelDomainsContext = {
    /**
     * CLI options controlling the sync behavior.
     */
    readonly options: SyncVercelDomainsOptions;
    /**
     * Number of `_Server` rows loaded from PostgreSQL.
     */
    readonly registeredServerCount: number;
    /**
     * Number of domains currently attached to the Vercel project.
     */
    readonly projectDomainCount: number;
    /**
     * Vercel API configuration used for mutations.
     */
    readonly vercelConfiguration: VercelApiConfiguration;
    /**
     * Project metadata used for reporting and diffing.
     */
    readonly projectMetadata: VercelProjectMetadata;
    /**
     * Planned Vercel domain changes derived from `_Server`.
     */
    readonly syncPlan: VercelDomainSyncPlan;
};

/**
 * Result of the optional Cloudflare DNS sync phase.
 *
 * @private type of `sync-vercel-domains`
 */
type CloudflareSyncOutcome = {
    /**
     * Planned or applied Cloudflare DNS changes when sync is enabled.
     */
    readonly cloudflareSyncPlan: CloudflareDnsRecordSyncPlan | null;
    /**
     * Human-readable reason why Cloudflare sync was skipped.
     */
    readonly cloudflareSyncSkippedReason: string | null;
};

/**
 * Executes the `_Server` -> Vercel domain sync.
 *
 * @private function of `sync-vercel-domains`
 */
export async function syncVercelDomainsMain(): Promise<void> {
    const options = parseCliOptions(process.argv.slice(2));
    const syncContext = await loadSyncVercelDomainsContext(options);

    logLoadedSyncContext(syncContext);
    await applyVercelDomainSyncPlan(syncContext);

    const cloudflareSyncOutcome = await syncCloudflareDomains(syncContext);
    logSyncCompleted(syncContext, cloudflareSyncOutcome);

    printHumanReadableSyncReport({
        dryRun: syncContext.options.dryRun,
        deleteRemoved: syncContext.options.deleteRemoved,
        projectMetadata: syncContext.projectMetadata,
        syncPlan: syncContext.syncPlan,
        cloudflareSyncPlan: cloudflareSyncOutcome.cloudflareSyncPlan,
        cloudflareSyncSkippedReason: cloudflareSyncOutcome.cloudflareSyncSkippedReason,
    });
}

/**
 * Loads the database rows and Vercel project state required to compute one sync plan.
 *
 * @param options - CLI options controlling the sync behavior.
 * @returns Fully prepared sync context.
 *
 * @private function of `sync-vercel-domains`
 */
async function loadSyncVercelDomainsContext(options: SyncVercelDomainsOptions): Promise<SyncVercelDomainsContext> {
    const connectionString = resolveRequiredDatabaseConnectionString();
    const registeredServers = await loadRequiredRegisteredServers(connectionString);
    const vercelConfiguration = loadVercelApiConfiguration();
    const projectMetadata = await loadProjectMetadata(vercelConfiguration);
    const projectDomains = await listProjectDomains(vercelConfiguration);
    const syncPlan = createVercelDomainSyncPlan({
        registeredServers,
        projectMetadata,
        projectDomains,
    });

    return {
        options,
        registeredServerCount: registeredServers.length,
        projectDomainCount: projectDomains.length,
        vercelConfiguration,
        projectMetadata,
        syncPlan,
    };
}

/**
 * Resolves the PostgreSQL connection string required to query the `_Server` table.
 *
 * @returns PostgreSQL connection string.
 * @throws {DatabaseError} When the database connection string is missing.
 *
 * @private function of `sync-vercel-domains`
 */
function resolveRequiredDatabaseConnectionString(): string {
    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();

    if (!connectionString) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot sync Vercel domains because \`POSTGRES_URL\` / \`DATABASE_URL\` is missing.
            `),
        );
    }

    return connectionString;
}

/**
 * Loads `_Server` rows and ensures the sync has at least one desired domain to manage.
 *
 * @param connectionString - PostgreSQL connection string.
 * @returns Registered servers ordered by name.
 * @throws {DatabaseError} When `_Server` contains no rows.
 *
 * @private function of `sync-vercel-domains`
 */
async function loadRequiredRegisteredServers(connectionString: string) {
    const registeredServers = await loadRegisteredServers(connectionString);

    if (registeredServers.length === 0) {
        throw new DatabaseError(
            spaceTrim(`
                Refusing to sync Vercel domains because \`_Server\` contains no rows.
            `),
        );
    }

    return registeredServers;
}

/**
 * Logs the loaded `_Server` and Vercel inputs before any mutations are applied.
 *
 * @param syncContext - Prepared sync context.
 *
 * @private function of `sync-vercel-domains`
 */
function logLoadedSyncContext(syncContext: SyncVercelDomainsContext): void {
    logSyncEvent('info', 'server_registry_loaded', {
        count: syncContext.registeredServerCount,
        dryRun: syncContext.options.dryRun,
    });
    logSyncEvent('info', 'vercel_project_domains_loaded', {
        count: syncContext.projectDomainCount,
        ignoredCount: syncContext.syncPlan.ignoredDomains.length,
        dryRun: syncContext.options.dryRun,
    });
    logSyncEvent('info', 'vercel_project_loaded', {
        productionBranch: syncContext.projectMetadata.productionBranch,
        customEnvironmentCount: syncContext.projectMetadata.customEnvironments.length,
        dryRun: syncContext.options.dryRun,
    });
}

/**
 * Applies the Vercel project-domain portion of the computed sync plan.
 *
 * @param syncContext - Prepared sync context.
 *
 * @private function of `sync-vercel-domains`
 */
async function applyVercelDomainSyncPlan(syncContext: SyncVercelDomainsContext): Promise<void> {
    await applyDomainReconfigurations(
        syncContext.vercelConfiguration,
        syncContext.syncPlan.domainsToReconfigure,
        syncContext.options,
    );
    await applyDomainAdditions(syncContext.vercelConfiguration, syncContext.syncPlan.domainsToAdd, syncContext.options);
    await applyDomainVerifications(
        syncContext.vercelConfiguration,
        syncContext.syncPlan.domainsToVerify,
        syncContext.options,
    );
    await handleFlaggedProjectDomains(
        syncContext.vercelConfiguration,
        syncContext.syncPlan.domainsToFlag,
        syncContext.options,
    );
}

/**
 * Rebinds existing Vercel domains whose environment or branch drifted from `_Server`.
 *
 * @param vercelConfiguration - Vercel API configuration.
 * @param reconfigurations - Reconfiguration steps derived from the sync plan.
 * @param options - CLI options controlling dry-run behavior.
 *
 * @private function of `sync-vercel-domains`
 */
async function applyDomainReconfigurations(
    vercelConfiguration: VercelApiConfiguration,
    reconfigurations: ReadonlyArray<VercelDomainReconfiguration>,
    options: SyncVercelDomainsOptions,
): Promise<void> {
    for (const reconfiguration of reconfigurations) {
        if (options.dryRun) {
            logPlannedDomainReconfiguration(reconfiguration);
            continue;
        }

        await removeProjectDomainWithLog(
            vercelConfiguration,
            reconfiguration.currentDomain.name,
            'domain_deleted_for_reconfigure',
        );
        await addProjectDomainAndVerifyIfNeeded({
            vercelConfiguration,
            desiredDomain: reconfiguration.desiredDomain,
            appliedEvent: 'domain_reconfigured',
        });
    }
}

/**
 * Logs one planned domain reconfiguration during a dry run.
 *
 * @param reconfiguration - Reconfiguration step to describe.
 *
 * @private function of `sync-vercel-domains`
 */
function logPlannedDomainReconfiguration(reconfiguration: VercelDomainReconfiguration): void {
    const currentBinding = normalizeVercelDomainBinding(reconfiguration.currentDomain);
    const desiredBinding = normalizeVercelDomainBinding(reconfiguration.desiredDomain);

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
}

/**
 * Adds domains that exist in `_Server` but are missing from the Vercel project.
 *
 * @param vercelConfiguration - Vercel API configuration.
 * @param desiredDomains - Desired domains missing from Vercel.
 * @param options - CLI options controlling dry-run behavior.
 *
 * @private function of `sync-vercel-domains`
 */
async function applyDomainAdditions(
    vercelConfiguration: VercelApiConfiguration,
    desiredDomains: ReadonlyArray<DesiredVercelProjectDomain>,
    options: SyncVercelDomainsOptions,
): Promise<void> {
    for (const desiredDomain of desiredDomains) {
        if (options.dryRun) {
            logPlannedDomainAddition(desiredDomain);
            continue;
        }

        await addProjectDomainAndVerifyIfNeeded({
            vercelConfiguration,
            desiredDomain,
            appliedEvent: 'domain_added',
        });
    }
}

/**
 * Logs one planned domain addition during a dry run.
 *
 * @param desiredDomain - Desired Vercel domain to describe.
 *
 * @private function of `sync-vercel-domains`
 */
function logPlannedDomainAddition(desiredDomain: DesiredVercelProjectDomain): void {
    logSyncEvent('info', 'domain_add_planned', {
        ...createDesiredDomainSyncPayload(desiredDomain),
        dryRun: true,
    });
}

/**
 * Verifies existing Vercel domains that are present but still unverified.
 *
 * @param vercelConfiguration - Vercel API configuration.
 * @param domainsToVerify - Domain names requiring verification.
 * @param options - CLI options controlling dry-run behavior.
 *
 * @private function of `sync-vercel-domains`
 */
async function applyDomainVerifications(
    vercelConfiguration: VercelApiConfiguration,
    domainsToVerify: ReadonlyArray<string>,
    options: SyncVercelDomainsOptions,
): Promise<void> {
    for (const domain of domainsToVerify) {
        if (options.dryRun) {
            logSyncEvent('info', 'domain_verify_planned', { domain, dryRun: true });
            continue;
        }

        await verifyProjectDomainWithLog(vercelConfiguration, domain);
    }
}

/**
 * Flags or deletes Vercel domains that no longer exist in `_Server`.
 *
 * @param vercelConfiguration - Vercel API configuration.
 * @param domainsToFlag - Domain names missing from `_Server`.
 * @param options - CLI options controlling deletion and dry-run behavior.
 *
 * @private function of `sync-vercel-domains`
 */
async function handleFlaggedProjectDomains(
    vercelConfiguration: VercelApiConfiguration,
    domainsToFlag: ReadonlyArray<string>,
    options: SyncVercelDomainsOptions,
): Promise<void> {
    for (const domain of domainsToFlag) {
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

        await removeProjectDomainWithLog(vercelConfiguration, domain, 'domain_deleted');
    }
}

/**
 * Adds one desired Vercel domain and verifies it immediately when Vercel reports it as unverified.
 *
 * @param options - Domain addition inputs and the event name to emit.
 *
 * @private function of `sync-vercel-domains`
 */
async function addProjectDomainAndVerifyIfNeeded(options: {
    readonly vercelConfiguration: VercelApiConfiguration;
    readonly desiredDomain: DesiredVercelProjectDomain;
    readonly appliedEvent: 'domain_added' | 'domain_reconfigured';
}): Promise<void> {
    const addedDomain = await addProjectDomain(options.vercelConfiguration, options.desiredDomain);

    logSyncEvent('info', options.appliedEvent, {
        ...createDesiredDomainSyncPayload(options.desiredDomain),
        verified: addedDomain.verified ?? null,
        dryRun: false,
    });

    if (addedDomain.verified === false) {
        await verifyProjectDomainWithLog(options.vercelConfiguration, options.desiredDomain.name);
    }
}

/**
 * Removes one Vercel project domain and emits the corresponding sync event.
 *
 * @param vercelConfiguration - Vercel API configuration.
 * @param domain - Domain name to remove.
 * @param event - Stable removal event name.
 *
 * @private function of `sync-vercel-domains`
 */
async function removeProjectDomainWithLog(
    vercelConfiguration: VercelApiConfiguration,
    domain: string,
    event: 'domain_deleted' | 'domain_deleted_for_reconfigure',
): Promise<void> {
    await removeProjectDomain(vercelConfiguration, domain);
    logSyncEvent('info', event, {
        domain,
        dryRun: false,
    });
}

/**
 * Verifies one Vercel project domain and emits the standard verification event.
 *
 * @param vercelConfiguration - Vercel API configuration.
 * @param domain - Domain name to verify.
 *
 * @private function of `sync-vercel-domains`
 */
async function verifyProjectDomainWithLog(vercelConfiguration: VercelApiConfiguration, domain: string): Promise<void> {
    await verifyProjectDomain(vercelConfiguration, domain);
    logSyncEvent('info', 'domain_verified', {
        domain,
        dryRun: false,
    });
}

/**
 * Creates the shared logging payload describing the desired binding of one Vercel domain.
 *
 * @param desiredDomain - Desired Vercel domain.
 * @returns Stable log payload fields shared across multiple events.
 *
 * @private function of `sync-vercel-domains`
 */
function createDesiredDomainSyncPayload(desiredDomain: DesiredVercelProjectDomain) {
    return {
        domain: desiredDomain.name,
        sourceEnvironment: desiredDomain.sourceEnvironment,
        vercelEnvironment: desiredDomain.vercelEnvironmentName,
        gitBranch: desiredDomain.gitBranch ?? null,
        customEnvironmentId: desiredDomain.customEnvironmentId ?? null,
    };
}

/**
 * Runs the optional Cloudflare DNS sync phase or records why it was skipped.
 *
 * @param syncContext - Prepared sync context.
 * @returns Cloudflare sync outcome.
 *
 * @private function of `sync-vercel-domains`
 */
async function syncCloudflareDomains(syncContext: SyncVercelDomainsContext): Promise<CloudflareSyncOutcome> {
    const cloudflareSyncConfigurationResolution = resolveCloudflareSyncConfiguration();

    if (!cloudflareSyncConfigurationResolution.configuration) {
        logSyncEvent('warn', 'cloudflare_sync_skipped', {
            reason: cloudflareSyncConfigurationResolution.skippedReason,
            dryRun: syncContext.options.dryRun,
        });

        return {
            cloudflareSyncPlan: null,
            cloudflareSyncSkippedReason: cloudflareSyncConfigurationResolution.skippedReason,
        };
    }

    return {
        cloudflareSyncPlan: await syncCloudflareDnsRecords({
            cloudflareConfiguration: cloudflareSyncConfigurationResolution.configuration,
            vercelConfiguration: syncContext.vercelConfiguration,
            desiredDomains: syncContext.syncPlan.desiredDomains,
            dryRun: syncContext.options.dryRun,
        }),
        cloudflareSyncSkippedReason: null,
    };
}

/**
 * Logs the final sync summary after both Vercel and Cloudflare phases finish.
 *
 * @param syncContext - Prepared sync context.
 * @param cloudflareSyncOutcome - Cloudflare sync result or skip reason.
 *
 * @private function of `sync-vercel-domains`
 */
function logSyncCompleted(
    syncContext: SyncVercelDomainsContext,
    cloudflareSyncOutcome: CloudflareSyncOutcome,
): void {
    logSyncEvent('info', 'sync_completed', {
        desiredCount: syncContext.syncPlan.desiredDomains.length,
        addedCount: syncContext.syncPlan.domainsToAdd.length,
        verifyCount: syncContext.syncPlan.domainsToVerify.length,
        reconfiguredCount: syncContext.syncPlan.domainsToReconfigure.length,
        flaggedCount: syncContext.syncPlan.domainsToFlag.length,
        ignoredCount: syncContext.syncPlan.ignoredDomains.length,
        cloudflareCreatedCount: cloudflareSyncOutcome.cloudflareSyncPlan?.recordsToCreate.length ?? 0,
        cloudflareUpdatedCount: cloudflareSyncOutcome.cloudflareSyncPlan?.recordsToUpdate.length ?? 0,
        cloudflareSkippedCount: cloudflareSyncOutcome.cloudflareSyncPlan?.skippedDomains.length ?? 0,
        cloudflareSyncSkippedReason: cloudflareSyncOutcome.cloudflareSyncSkippedReason,
        deleteRemoved: syncContext.options.deleteRemoved,
        dryRun: syncContext.options.dryRun,
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

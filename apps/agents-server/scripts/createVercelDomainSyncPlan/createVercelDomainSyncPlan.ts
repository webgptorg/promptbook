import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import type { ServerRecord } from '../../src/utils/serverRegistry';
import { normalizeManagedDomain } from '../normalizeManagedDomain';
import type {
    DesiredVercelProjectDomain,
    VercelDomainReconfiguration,
    VercelDomainSyncPlan,
    VercelProjectDomain,
    VercelProjectMetadata,
} from './VercelDomainSyncPlan';
import { normalizeVercelDomainBinding } from './normalizeVercelDomainBinding';
import { resolveDesiredProjectDomain } from './resolveDesiredProjectDomain';

/**
 * Project domains that are managed by Vercel itself and should not be deleted.
 */
const VERCEL_PLATFORM_DOMAIN_SUFFIX = '.vercel.app';

/**
 * Builds the desired/current domain diff for Vercel synchronization.
 *
 * @param options - Registered servers and current project domains.
 * @returns Sync plan derived from normalized domain sets.
 */
export function createVercelDomainSyncPlan(options: {
    readonly registeredServers: ReadonlyArray<ServerRecord>;
    readonly projectMetadata: VercelProjectMetadata;
    readonly projectDomains: ReadonlyArray<VercelProjectDomain>;
}): VercelDomainSyncPlan {
    const desiredProjectDomains = uniqueDesiredProjectDomains(
        options.registeredServers.map((server) =>
            resolveDesiredProjectDomain(server, {
                projectMetadata: options.projectMetadata,
                projectDomains: options.projectDomains,
            }),
        ),
    );
    const desiredDomains = desiredProjectDomains.map((domain) => domain.name);
    const desiredDomainSet = new Set(desiredDomains);
    const { ignoredDomains, projectDomainByName } = createManagedProjectDomainLookup(options.projectDomains);
    const domainsToAdd: Array<DesiredVercelProjectDomain> = [];
    const domainsToVerify: Array<string> = [];
    const domainsToReconfigure: Array<VercelDomainReconfiguration> = [];

    for (const desiredDomain of desiredProjectDomains) {
        const currentDomain = projectDomainByName.get(desiredDomain.name);

        if (!currentDomain) {
            domainsToAdd.push(desiredDomain);
            continue;
        }

        const reconfigurationReasons = describeDomainReconfigurationReasons(currentDomain, desiredDomain);
        if (reconfigurationReasons.length > 0) {
            domainsToReconfigure.push({
                currentDomain,
                desiredDomain,
                reasons: reconfigurationReasons,
            });
            continue;
        }

        if (currentDomain.verified === false) {
            domainsToVerify.push(desiredDomain.name);
        }
    }

    const domainsToFlag = Array.from(projectDomainByName.keys()).filter((domain) => !desiredDomainSet.has(domain));

    return {
        desiredDomains,
        domainsToAdd,
        domainsToVerify,
        domainsToReconfigure,
        domainsToFlag,
        ignoredDomains,
    };
}

/**
 * Deduplicates desired project-domain bindings while preserving their original order.
 *
 * @param domains - Desired domain bindings.
 * @returns Unique desired domain bindings.
 */
function uniqueDesiredProjectDomains(
    domains: ReadonlyArray<DesiredVercelProjectDomain>,
): Array<DesiredVercelProjectDomain> {
    const result: Array<DesiredVercelProjectDomain> = [];
    const seenDomains = new Set<string>();

    for (const domain of domains) {
        if (seenDomains.has(domain.name)) {
            continue;
        }

        seenDomains.add(domain.name);
        result.push(domain);
    }

    return result;
}

/**
 * Creates a normalized lookup of Vercel project domains that should be managed by sync.
 *
 * @param projectDomains - Current project domains from Vercel.
 * @returns Managed domain lookup plus ignored Vercel-owned domains.
 */
function createManagedProjectDomainLookup(projectDomains: ReadonlyArray<VercelProjectDomain>): {
    readonly ignoredDomains: ReadonlyArray<string>;
    readonly projectDomainByName: Map<string, VercelProjectDomain>;
} {
    const projectDomainByName = new Map<string, VercelProjectDomain>();
    const ignoredDomains: Array<string> = [];

    for (const projectDomain of projectDomains) {
        const normalizedDomain = normalizeManagedDomain(projectDomain.name);
        if (isIgnoredProjectDomain(normalizedDomain)) {
            ignoredDomains.push(normalizedDomain);
            continue;
        }

        if (projectDomainByName.has(normalizedDomain)) {
            throw new DatabaseError(
                spaceTrim(`
                    Encountered duplicate Vercel project domain entry for \`${normalizedDomain}\`.
                `),
            );
        }

        projectDomainByName.set(normalizedDomain, projectDomain);
    }

    return {
        ignoredDomains,
        projectDomainByName,
    };
}

/**
 * Lists human-readable reasons why an existing Vercel domain binding must be reconfigured.
 *
 * @param currentDomain - Existing Vercel project domain.
 * @param desiredDomain - Desired Vercel project domain derived from `_Server`.
 * @returns Reconfiguration reasons.
 */
function describeDomainReconfigurationReasons(
    currentDomain: VercelProjectDomain,
    desiredDomain: DesiredVercelProjectDomain,
): Array<string> {
    const currentBinding = normalizeVercelDomainBinding(currentDomain);
    const desiredBinding = normalizeVercelDomainBinding(desiredDomain);
    const reasons: Array<string> = [];

    if (currentBinding.gitBranch !== desiredBinding.gitBranch) {
        reasons.push(
            `gitBranch ${formatNullableValue(currentBinding.gitBranch)} -> ${formatNullableValue(
                desiredBinding.gitBranch,
            )}`,
        );
    }

    if (currentBinding.customEnvironmentId !== desiredBinding.customEnvironmentId) {
        reasons.push(
            `customEnvironmentId ${formatNullableValue(currentBinding.customEnvironmentId)} -> ${formatNullableValue(
                desiredBinding.customEnvironmentId,
            )}`,
        );
    }

    return reasons;
}

/**
 * Formats one nullable diagnostic value.
 *
 * @param value - Raw value.
 * @returns Display-friendly placeholder or value.
 */
function formatNullableValue(value: string | null): string {
    return value === null ? '<none>' : value;
}

/**
 * Checks whether the project domain should be ignored by sync deletion/flagging.
 *
 * @param domain - Normalized domain.
 * @returns `true` when the domain is managed by Vercel platform defaults.
 */
function isIgnoredProjectDomain(domain: string): boolean {
    return domain.endsWith(VERCEL_PLATFORM_DOMAIN_SUFFIX);
}

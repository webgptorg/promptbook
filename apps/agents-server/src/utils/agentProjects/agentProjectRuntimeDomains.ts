import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { normalizeServerDomain } from '../serverRegistry';
import { buildAgentProjectProfileHref } from './agentProjectHrefs';
import {
    resolveAgentProjectDomainRegistryFilePath,
    resolveAgentProjectDomainsFilePath,
} from './agentProjectRuntimePaths';

/**
 * Current on-disk domain registry schema version.
 */
const AGENT_PROJECT_DOMAIN_REGISTRY_VERSION = 2;

/**
 * Global key used to serialize domain-registry mutations across concurrent requests.
 */
const AGENT_PROJECT_DOMAIN_REGISTRY_GLOBAL_KEY = '__PROMPTBOOK_AGENT_PROJECT_DOMAIN_REGISTRY__';

/**
 * Maximum length of a single DNS label.
 */
const DNS_LABEL_MAX_LENGTH = 63;

/**
 * Maximum length of a full DNS hostname.
 */
const DNS_HOSTNAME_MAX_LENGTH = 253;

/**
 * Short fallback label used when a project name has no DNS-safe characters.
 */
const FALLBACK_PROJECT_DOMAIN_LABEL = 'project';

/**
 * Strict public DNS hostname pattern mirrored by the standalone VPS installer.
 */
const PUBLIC_DNS_HOSTNAME_PATTERN =
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/u;

/**
 * Header written into the installer-facing domains file.
 */
const PROJECT_DOMAINS_FILE_HEADER = '# Managed by Promptbook Agents Server. Do not edit manually.';

/**
 * Persisted domain assignment of one agent project.
 */
export type AgentProjectDomainRecord = {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Directory name of the project inside the agent `projects/` folder.
     */
    readonly projectName: string;

    /**
     * Base Agents Server domain, for example `agents.example.com`.
     */
    readonly serverDomain: string;

    /**
     * Optional admin-assigned full custom domain. When present, it overrides the generated project domain.
     */
    readonly customDomain: string | null;

    /**
     * Public project domain, for example `my-project.agents.example.com` or `landing.example.com`.
     */
    readonly domain: string;

    /**
     * Public HTTPS URL for the project domain.
     */
    readonly publicUrl: string;

    /**
     * Agents Server project page URL path.
     */
    readonly projectHref: string;

    /**
     * ISO timestamp when this domain was first assigned.
     */
    readonly assignedAt: string;

    /**
     * ISO timestamp when this domain assignment was last refreshed.
     */
    readonly updatedAt: string;
};

/**
 * Result of assigning a domain to a project.
 */
export type AgentProjectDomainAssignment = {
    /**
     * Persisted project-domain record, or `null` when no public base domain is configured.
     */
    readonly record: AgentProjectDomainRecord | null;

    /**
     * Whether the installer-facing domain file changed.
     */
    readonly isChanged: boolean;
};

/**
 * Options identifying one project-domain record.
 */
type AgentProjectDomainRecordIdentity = {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Directory name of the project inside the agent `projects/` folder.
     */
    readonly projectName: string;

    /**
     * Normalized base Agents Server domain.
     */
    readonly serverDomain: string;
};

/**
 * Raw persisted domain registry shape.
 */
type PersistedAgentProjectDomainRegistry = {
    readonly version: number;
    readonly domains: ReadonlyArray<AgentProjectDomainRecord>;
};

/**
 * Process-wide domain registry state.
 */
type AgentProjectDomainRegistryState = {
    /**
     * Promise chain used as a lightweight mutation queue.
     */
    domainMutationQueue: Promise<void>;
};

/**
 * Global object shape used for process-wide domain registry state.
 */
type AgentProjectDomainRegistryGlobal = typeof globalThis & {
    [AGENT_PROJECT_DOMAIN_REGISTRY_GLOBAL_KEY]?: AgentProjectDomainRegistryState;
};

/**
 * Assigns or refreshes the stable public domain for one agent project.
 *
 * @param options - Project identity and optional request-selected server domain.
 * @returns Domain assignment result.
 */
export async function assignAgentProjectDomain(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly serverDomain?: string | null;
}): Promise<AgentProjectDomainAssignment> {
    return await runAgentProjectDomainRegistryMutation(async () => {
        const serverDomain = resolveAgentProjectRuntimeBaseDomain(options.serverDomain);

        if (!serverDomain) {
            return { record: null, isChanged: false };
        }

        const records = await listAgentProjectDomainRecords();
        const now = new Date().toISOString();
        let isChanged = false;
        let assignedRecord: AgentProjectDomainRecord | null = null;
        const nextRecords = records.map((record) => {
            const isSameProject = isSameAgentProjectDomainRecord(record, {
                agentPermanentId: options.agentPermanentId,
                projectName: options.projectName,
                serverDomain,
            });

            if (!isSameProject) {
                return record;
            }

            assignedRecord = createAgentProjectDomainRecord({
                agentPermanentId: options.agentPermanentId,
                assignedAt: record.assignedAt,
                customDomain: record.customDomain,
                projectName: options.projectName,
                serverDomain,
                updatedAt: now,
            });
            isChanged =
                record.serverDomain !== assignedRecord.serverDomain ||
                record.customDomain !== assignedRecord.customDomain ||
                record.domain !== assignedRecord.domain ||
                record.publicUrl !== assignedRecord.publicUrl ||
                record.projectHref !== assignedRecord.projectHref;

            return assignedRecord;
        });

        if (!assignedRecord) {
            assignedRecord = createAgentProjectDomainRecord({
                agentPermanentId: options.agentPermanentId,
                assignedAt: now,
                customDomain: null,
                projectName: options.projectName,
                serverDomain,
                updatedAt: now,
            });
            nextRecords.push(assignedRecord);
            isChanged = true;
        }

        if (isChanged) {
            await writeAgentProjectDomainRecords(nextRecords);
        }

        return { record: assignedRecord, isChanged };
    });
}

/**
 * Assigns, updates, or clears a custom full domain for one agent project.
 *
 * Passing an empty custom domain clears the override and keeps an existing generated domain record.
 * If no record exists yet, clearing is a no-op.
 *
 * @param options - Project identity, owning server domain, and custom domain text.
 * @returns Domain assignment result.
 */
export async function setAgentProjectCustomDomain(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly serverDomain?: string | null;
    readonly customDomain: string | null;
}): Promise<AgentProjectDomainAssignment> {
    return await runAgentProjectDomainRegistryMutation(async () => {
        const serverDomain = resolveAgentProjectRuntimeBaseDomain(options.serverDomain);

        if (!serverDomain) {
            throw new NotAllowed(
                spaceTrim(`
                    Cannot assign a custom project domain because the current server has no externally routable domain.
                `),
            );
        }

        const customDomain = normalizeOptionalAgentProjectCustomDomain(options.customDomain);
        const records = await listAgentProjectDomainRecords();
        const identity = {
            agentPermanentId: options.agentPermanentId,
            projectName: options.projectName,
            serverDomain,
        };

        if (customDomain) {
            assertAgentProjectCustomDomainIsAvailable(records, identity, customDomain);
        }

        const now = new Date().toISOString();
        let isChanged = false;
        let assignedRecord: AgentProjectDomainRecord | null = null;
        const nextRecords = records.map((record) => {
            if (!isSameAgentProjectDomainRecord(record, identity)) {
                return record;
            }

            assignedRecord = createAgentProjectDomainRecord({
                agentPermanentId: options.agentPermanentId,
                assignedAt: record.assignedAt,
                customDomain,
                projectName: options.projectName,
                serverDomain,
                updatedAt: now,
            });
            isChanged =
                record.serverDomain !== assignedRecord.serverDomain ||
                record.customDomain !== assignedRecord.customDomain ||
                record.domain !== assignedRecord.domain ||
                record.publicUrl !== assignedRecord.publicUrl ||
                record.projectHref !== assignedRecord.projectHref;

            return isChanged ? assignedRecord : record;
        });

        if (!assignedRecord) {
            if (!customDomain) {
                return { record: null, isChanged: false };
            }

            assignedRecord = createAgentProjectDomainRecord({
                agentPermanentId: options.agentPermanentId,
                assignedAt: now,
                customDomain,
                projectName: options.projectName,
                serverDomain,
                updatedAt: now,
            });
            nextRecords.push(assignedRecord);
            isChanged = true;
        }

        if (isChanged) {
            await writeAgentProjectDomainRecords(nextRecords);
        }

        return { record: assignedRecord, isChanged };
    });
}

/**
 * Lists all persisted project-domain assignments.
 *
 * @returns Domain records ordered by domain.
 */
export async function listAgentProjectDomainRecords(): Promise<ReadonlyArray<AgentProjectDomainRecord>> {
    const registryFilePath = resolveAgentProjectDomainRegistryFilePath();
    let rawContent: string;

    try {
        rawContent = await readFile(registryFilePath, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return [];
        }

        throw new UnexpectedError(
            spaceTrim(`
                Failed to read agent project domain registry.

                **Registry file:** \`${registryFilePath}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }

    try {
        return [...parsePersistedAgentProjectDomainRegistry(JSON.parse(rawContent))].sort((firstRecord, secondRecord) =>
            firstRecord.domain.localeCompare(secondRecord.domain),
        );
    } catch (error) {
        throw new UnexpectedError(
            spaceTrim(`
                Failed to parse agent project domain registry.

                **Registry file:** \`${registryFilePath}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }
}

/**
 * Finds a persisted project-domain assignment by request host.
 *
 * @param host - Raw host header value.
 * @returns Matching domain record or `null`.
 */
export async function resolveAgentProjectDomainRecordByHost(
    host: string | null | undefined,
): Promise<AgentProjectDomainRecord | null> {
    const normalizedHost = normalizeServerDomain(host || '');

    if (!normalizedHost) {
        return null;
    }

    const records = await listAgentProjectDomainRecords();
    return records.find((record) => normalizeServerDomain(record.domain) === normalizedHost) ?? null;
}

/**
 * Finds a persisted project-domain assignment by project identity and server domain.
 *
 * @param options - Project identity and request-selected server domain.
 * @returns Matching domain record or `null`.
 */
export async function resolveAgentProjectDomainRecord(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly serverDomain?: string | null;
}): Promise<AgentProjectDomainRecord | null> {
    const serverDomain = resolveAgentProjectRuntimeBaseDomain(options.serverDomain);

    if (!serverDomain) {
        return null;
    }

    const records = await listAgentProjectDomainRecords();
    return (
        records.find((record) =>
            isSameAgentProjectDomainRecord(record, {
                agentPermanentId: options.agentPermanentId,
                projectName: options.projectName,
                serverDomain,
            }),
        ) ?? null
    );
}

/**
 * Creates one public project domain from a project name and base server domain.
 *
 * @param options - Project and server domain.
 * @returns Public project domain.
 */
export function createAgentProjectRuntimeDomain(options: {
    readonly projectName: string;
    readonly serverDomain: string;
}): string {
    return `${createAgentProjectDomainLabel(options.projectName)}.${options.serverDomain}`;
}

/**
 * Creates the public HTTPS URL for one project domain.
 *
 * @param domain - Public project domain.
 * @returns Public project URL.
 */
export function createAgentProjectRuntimePublicUrl(domain: string): string {
    return `https://${domain}`;
}

/**
 * Resolves the public base domain used for generated project domains.
 *
 * @param requestedServerDomain - Request-selected server domain.
 * @returns Normalized externally routable base domain or `null`.
 */
export function resolveAgentProjectRuntimeBaseDomain(requestedServerDomain?: string | null): string | null {
    const candidates = [
        requestedServerDomain || '',
        process.env.NEXT_PUBLIC_SITE_URL || '',
        process.env.SERVERS?.split(',')[0] || '',
    ];

    for (const candidate of candidates) {
        const normalizedDomain = normalizeServerDomain(candidate);

        if (normalizedDomain && isExternallyRoutableProjectDomain(normalizedDomain)) {
            return normalizedDomain;
        }
    }

    return null;
}

/**
 * Writes the durable JSON registry and the installer-facing domains file.
 *
 * @param records - Domain records to persist.
 */
async function writeAgentProjectDomainRecords(records: ReadonlyArray<AgentProjectDomainRecord>): Promise<void> {
    const sortedRecords = [...records].sort((firstRecord, secondRecord) =>
        firstRecord.domain.localeCompare(secondRecord.domain),
    );
    const registryFilePath = resolveAgentProjectDomainRegistryFilePath();
    const domainsFilePath = resolveAgentProjectDomainsFilePath();
    const payload: PersistedAgentProjectDomainRegistry = {
        version: AGENT_PROJECT_DOMAIN_REGISTRY_VERSION,
        domains: sortedRecords,
    };
    const uniqueDomains = [...new Set(sortedRecords.map((record) => record.domain))].sort((firstDomain, secondDomain) =>
        firstDomain.localeCompare(secondDomain),
    );

    await Promise.all([
        writeTextFile(registryFilePath, `${JSON.stringify(payload, null, 4)}\n`),
        writeTextFile(domainsFilePath, `${PROJECT_DOMAINS_FILE_HEADER}\n${uniqueDomains.join('\n')}\n`),
    ]);
}

/**
 * Runs one domain-registry mutation after previous mutations have finished.
 */
async function runAgentProjectDomainRegistryMutation<TValue>(operation: () => Promise<TValue>): Promise<TValue> {
    const registryState = getAgentProjectDomainRegistryState();
    const previousMutation = registryState.domainMutationQueue;
    let releaseMutation!: () => void;

    registryState.domainMutationQueue = new Promise<void>((resolve) => {
        releaseMutation = resolve;
    });

    await previousMutation.catch(() => undefined);

    try {
        return await operation();
    } finally {
        releaseMutation();
    }
}

/**
 * Parses persisted domain records and validates required fields.
 */
function parsePersistedAgentProjectDomainRegistry(rawValue: unknown): ReadonlyArray<AgentProjectDomainRecord> {
    if (!rawValue || typeof rawValue !== 'object') {
        return [];
    }

    const registry = rawValue as Partial<PersistedAgentProjectDomainRegistry>;

    if (!Array.isArray(registry.domains)) {
        return [];
    }

    return registry.domains
        .map((rawRecord): AgentProjectDomainRecord | null => {
            if (!rawRecord || typeof rawRecord !== 'object') {
                return null;
            }

            const record = rawRecord as Partial<AgentProjectDomainRecord>;

            if (
                typeof record.agentPermanentId !== 'string' ||
                typeof record.projectName !== 'string' ||
                typeof record.serverDomain !== 'string' ||
                typeof record.domain !== 'string' ||
                typeof record.publicUrl !== 'string' ||
                typeof record.projectHref !== 'string' ||
                typeof record.assignedAt !== 'string' ||
                typeof record.updatedAt !== 'string'
            ) {
                return null;
            }

            return {
                agentPermanentId: record.agentPermanentId,
                projectName: record.projectName,
                serverDomain: record.serverDomain,
                customDomain:
                    typeof record.customDomain === 'string'
                        ? normalizeAgentProjectCustomDomain(record.customDomain)
                        : null,
                domain: record.domain,
                publicUrl: record.publicUrl,
                projectHref: record.projectHref,
                assignedAt: record.assignedAt,
                updatedAt: record.updatedAt,
            };
        })
        .filter((record): record is AgentProjectDomainRecord => record !== null);
}

/**
 * Creates a DNS-safe label from one project directory name.
 */
function createAgentProjectDomainLabel(projectName: string): string {
    const normalizedLabel = projectName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/gu, '-')
        .replace(/-+/gu, '-')
        .replace(/^-+|-+$/gu, '')
        .slice(0, DNS_LABEL_MAX_LENGTH)
        .replace(/-+$/gu, '');

    return normalizedLabel || FALLBACK_PROJECT_DOMAIN_LABEL;
}

/**
 * Normalizes one optional admin-provided custom project domain.
 */
function normalizeOptionalAgentProjectCustomDomain(rawCustomDomain: string | null): string | null {
    const rawDomain = rawCustomDomain || '';
    const customDomain = normalizeAgentProjectCustomDomain(rawDomain);

    if (customDomain) {
        return customDomain;
    }

    if (rawDomain.trim()) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid custom project domain \`${rawDomain}\`.

                Use a public DNS hostname such as \`example.com\`, \`www.example.com\`, or \`client.website.example.com\`.
            `),
        );
    }

    return null;
}

/**
 * Normalizes one custom project domain into the strict public-DNS form accepted by the VPS installer.
 */
function normalizeAgentProjectCustomDomain(rawDomain: string): string | null {
    const normalizedDomain = normalizeServerDomain(rawDomain)?.replace(/[.]$/u, '') ?? null;

    if (!normalizedDomain || normalizedDomain.length > DNS_HOSTNAME_MAX_LENGTH) {
        return null;
    }

    if (!PUBLIC_DNS_HOSTNAME_PATTERN.test(normalizedDomain)) {
        return null;
    }

    if (!isExternallyRoutableProjectDomain(normalizedDomain)) {
        return null;
    }

    return normalizedDomain;
}

/**
 * Creates a complete project-domain record from its identity and optional custom override.
 */
function createAgentProjectDomainRecord(options: {
    readonly agentPermanentId: string;
    readonly assignedAt: string;
    readonly customDomain: string | null;
    readonly projectName: string;
    readonly serverDomain: string;
    readonly updatedAt: string;
}): AgentProjectDomainRecord {
    const domain =
        options.customDomain ||
        createAgentProjectRuntimeDomain({
            projectName: options.projectName,
            serverDomain: options.serverDomain,
        });

    return {
        agentPermanentId: options.agentPermanentId,
        projectName: options.projectName,
        serverDomain: options.serverDomain,
        customDomain: options.customDomain,
        domain,
        publicUrl: createAgentProjectRuntimePublicUrl(domain),
        projectHref: buildAgentProjectProfileHref(options.agentPermanentId, options.projectName),
        assignedAt: options.assignedAt,
        updatedAt: options.updatedAt,
    };
}

/**
 * Returns whether a record belongs to the provided project and server identity.
 */
function isSameAgentProjectDomainRecord(
    record: AgentProjectDomainRecord,
    identity: AgentProjectDomainRecordIdentity,
): boolean {
    return (
        record.agentPermanentId.toLowerCase() === identity.agentPermanentId.toLowerCase() &&
        record.projectName.toLowerCase() === identity.projectName.toLowerCase() &&
        normalizeServerDomain(record.serverDomain) === identity.serverDomain
    );
}

/**
 * Throws when a requested custom domain is already assigned to another project.
 */
function assertAgentProjectCustomDomainIsAvailable(
    records: ReadonlyArray<AgentProjectDomainRecord>,
    identity: AgentProjectDomainRecordIdentity,
    customDomain: string,
): void {
    if (customDomain === identity.serverDomain) {
        throw new NotAllowed(
            spaceTrim(`
                Custom project domain \`${customDomain}\` conflicts with the server domain.
            `),
        );
    }

    const conflictingRecord = records.find(
        (record) => !isSameAgentProjectDomainRecord(record, identity) && record.domain === customDomain,
    );

    if (!conflictingRecord) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Custom project domain \`${customDomain}\` is already assigned to another project.

            **Agent:** \`${conflictingRecord.agentPermanentId}\`
            **Project:** \`${conflictingRecord.projectName}\`
        `),
    );
}

/**
 * Returns whether a normalized domain can safely be exposed as a public project domain.
 */
function isExternallyRoutableProjectDomain(domain: string): boolean {
    if (domain.includes(':')) {
        return false;
    }

    if (domain === 'localhost' || domain.endsWith('.localhost')) {
        return false;
    }

    if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(domain)) {
        return false;
    }

    return domain.includes('.');
}

/**
 * Writes a UTF-8 text file after ensuring its parent directory exists.
 */
async function writeTextFile(filePath: string, content: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, 'utf-8');
}

/**
 * Returns process-wide project-domain registry state.
 */
function getAgentProjectDomainRegistryState(): AgentProjectDomainRegistryState {
    const registryGlobal = globalThis as AgentProjectDomainRegistryGlobal;
    registryGlobal[AGENT_PROJECT_DOMAIN_REGISTRY_GLOBAL_KEY] ??= {
        domainMutationQueue: Promise.resolve(),
    };

    return registryGlobal[AGENT_PROJECT_DOMAIN_REGISTRY_GLOBAL_KEY]!;
}

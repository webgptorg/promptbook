import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { SERVER_ENVIRONMENT } from '../src/utils/serverRegistry';

/**
 * Constant for create vercel domain sync plan.
 */
let createVercelDomainSyncPlan: typeof import('./sync-vercel-domains').createVercelDomainSyncPlan;
/**
 * Constant for create cloudflare Dns record sync plan.
 */
let createCloudflareDnsRecordSyncPlan: typeof import('./sync-vercel-domains').createCloudflareDnsRecordSyncPlan;
/**
 * Constant for resolve desired cloudflare Dns record.
 */
let resolveDesiredCloudflareDnsRecord: typeof import('./sync-vercel-domains').resolveDesiredCloudflareDnsRecord;
/**
 * Constant for resolve desired project domain.
 */
let resolveDesiredProjectDomain: typeof import('./sync-vercel-domains').resolveDesiredProjectDomain;

beforeAll(async () => {
    process.env.PROMPTBOOK_RUN_SYNC_VERCEL_DOMAINS_MAIN = 'false';

    const syncVercelDomainsModule = await import('./sync-vercel-domains');
    createVercelDomainSyncPlan = syncVercelDomainsModule.createVercelDomainSyncPlan;
    createCloudflareDnsRecordSyncPlan = syncVercelDomainsModule.createCloudflareDnsRecordSyncPlan;
    resolveDesiredCloudflareDnsRecord = syncVercelDomainsModule.resolveDesiredCloudflareDnsRecord;
    resolveDesiredProjectDomain = syncVercelDomainsModule.resolveDesiredProjectDomain;
});

describe('sync-vercel-domains', () => {
    it('maps all `_Server.environment` values to the expected Vercel bindings', () => {
        const projectMetadata = {
            productionBranch: 'production',
            customEnvironments: [{ id: 'env_lts', slug: 'lts', name: 'lts' }],
        };

        expect(
            resolveDesiredProjectDomain(
                {
                    domain: 'core.ptbk.io',
                    environment: SERVER_ENVIRONMENT.LTS,
                },
                { projectMetadata },
            ),
        ).toEqual({
            name: 'core.ptbk.io',
            sourceEnvironment: SERVER_ENVIRONMENT.LTS,
            vercelEnvironmentName: 'lts',
            gitBranch: 'lts',
            customEnvironmentId: 'env_lts',
        });

        expect(
            resolveDesiredProjectDomain(
                {
                    domain: 'dashboard.ptbk.io',
                    environment: SERVER_ENVIRONMENT.PRODUCTION,
                },
                { projectMetadata },
            ),
        ).toEqual({
            name: 'dashboard.ptbk.io',
            sourceEnvironment: SERVER_ENVIRONMENT.PRODUCTION,
            vercelEnvironmentName: 'Production',
        });

        expect(
            resolveDesiredProjectDomain(
                {
                    domain: 'demo.ptbk.io',
                    environment: SERVER_ENVIRONMENT.PREVIEW,
                },
                { projectMetadata },
            ),
        ).toEqual({
            name: 'demo.ptbk.io',
            sourceEnvironment: SERVER_ENVIRONMENT.PREVIEW,
            vercelEnvironmentName: 'Preview',
            gitBranch: 'preview',
        });

        expect(
            resolveDesiredProjectDomain(
                {
                    domain: 's8.ptbk.io',
                    environment: SERVER_ENVIRONMENT.LIVE,
                },
                { projectMetadata },
            ),
        ).toEqual({
            name: 's8.ptbk.io',
            sourceEnvironment: SERVER_ENVIRONMENT.LIVE,
            vercelEnvironmentName: 'Development',
            gitBranch: 'main',
        });
    });

    it('detects add, verify, reconfigure, and delete steps from `_Server` vs Vercel drift', () => {
        const projectMetadata = {
            productionBranch: 'production',
            customEnvironments: [{ id: 'env_lts', slug: 'lts', name: 'lts' }],
        };

        const syncPlan = createVercelDomainSyncPlan({
            registeredServers: [
                {
                    id: 1,
                    name: 'core.ptbk.io',
                    environment: SERVER_ENVIRONMENT.LTS,
                    domain: 'core.ptbk.io',
                    tablePrefix: 'server_Core_',
                    createdAt: '2026-03-15T00:00:00.000Z',
                    updatedAt: '2026-03-15T00:00:00.000Z',
                },
                {
                    id: 2,
                    name: 'demo.ptbk.io',
                    environment: SERVER_ENVIRONMENT.PREVIEW,
                    domain: 'demo.ptbk.io',
                    tablePrefix: 'server_Demo_',
                    createdAt: '2026-03-15T00:00:00.000Z',
                    updatedAt: '2026-03-15T00:00:00.000Z',
                },
                {
                    id: 3,
                    name: 's8.ptbk.io',
                    environment: SERVER_ENVIRONMENT.LIVE,
                    domain: 's8.ptbk.io',
                    tablePrefix: 'server_S8_',
                    createdAt: '2026-03-15T00:00:00.000Z',
                    updatedAt: '2026-03-15T00:00:00.000Z',
                },
            ],
            projectMetadata,
            projectDomains: [
                {
                    name: 'demo.ptbk.io',
                    verified: false,
                    gitBranch: 'preview',
                },
                {
                    name: 's8.ptbk.io',
                    verified: true,
                    gitBranch: 'preview',
                },
                {
                    name: 'search.ptbk.io',
                    verified: true,
                },
                {
                    name: 'promptbook-agents-server.vercel.app',
                    verified: true,
                },
            ],
        });

        expect(syncPlan.desiredDomains).toEqual(['core.ptbk.io', 'demo.ptbk.io', 's8.ptbk.io']);
        expect(syncPlan.domainsToAdd).toEqual([
            {
                name: 'core.ptbk.io',
                sourceEnvironment: SERVER_ENVIRONMENT.LTS,
                vercelEnvironmentName: 'lts',
                gitBranch: 'lts',
                customEnvironmentId: 'env_lts',
            },
        ]);
        expect(syncPlan.domainsToVerify).toEqual(['demo.ptbk.io']);
        expect(syncPlan.domainsToReconfigure).toHaveLength(1);
        const [reconfiguration] = syncPlan.domainsToReconfigure;

        expect(reconfiguration).toBeDefined();
        expect(reconfiguration).toMatchObject({
            currentDomain: { name: 's8.ptbk.io', gitBranch: 'preview' },
            desiredDomain: {
                name: 's8.ptbk.io',
                sourceEnvironment: SERVER_ENVIRONMENT.LIVE,
                vercelEnvironmentName: 'Development',
                gitBranch: 'main',
            },
        });
        expect(reconfiguration!.reasons).toEqual(['gitBranch preview -> main']);
        expect(syncPlan.domainsToFlag).toEqual(['search.ptbk.io']);
        expect(syncPlan.ignoredDomains).toEqual(['promptbook-agents-server.vercel.app']);
    });

    it('fails when the Vercel production branch does not match the expected `production` mapping', () => {
        expect(() =>
            resolveDesiredProjectDomain(
                {
                    domain: 'dashboard.ptbk.io',
                    environment: SERVER_ENVIRONMENT.PRODUCTION,
                },
                {
                    projectMetadata: {
                        productionBranch: 'main',
                        customEnvironments: [],
                    },
                },
            ),
        ).toThrow(/Expected the Vercel production branch to be `production`/);
    });

    it('maps apex domains to Cloudflare A records and subdomains to CNAME records using Vercel recommendations', () => {
        expect(
            resolveDesiredCloudflareDnsRecord(
                'ptbk.io',
                {
                    id: 'zone_ptbk',
                    name: 'ptbk.io',
                },
                {
                    misconfigured: true,
                    recommendedIPv4: [{ rank: 1, value: ['76.76.21.21'] }],
                    recommendedCNAME: [{ rank: 1, value: 'cname.vercel-dns.com.' }],
                },
            ),
        ).toEqual({
            zoneId: 'zone_ptbk',
            zoneName: 'ptbk.io',
            name: 'ptbk.io',
            type: 'A',
            content: '76.76.21.21',
            proxied: false,
            ttl: 1,
            comment: 'Managed by Promptbook sync-vercel-domains.ts',
            tags: [],
        });

        expect(
            resolveDesiredCloudflareDnsRecord(
                'preview.ptbk.io',
                {
                    id: 'zone_ptbk',
                    name: 'ptbk.io',
                },
                {
                    misconfigured: true,
                    recommendedIPv4: [{ rank: 1, value: ['76.76.21.21'] }],
                    recommendedCNAME: [{ rank: 1, value: '0ed1865950424cc4.vercel-dns-016.com.' }],
                },
            ),
        ).toEqual({
            zoneId: 'zone_ptbk',
            zoneName: 'ptbk.io',
            name: 'preview.ptbk.io',
            type: 'CNAME',
            content: '0ed1865950424cc4.vercel-dns-016.com',
            proxied: false,
            ttl: 1,
            comment: 'Managed by Promptbook sync-vercel-domains.ts',
            tags: [],
        });
    });

    it('plans Cloudflare creates, updates, and skips without deleting unrelated zone records', async () => {
        const cloudflareConfiguration = { token: 'token' };
        const desiredRecords = [
            {
                zoneId: 'zone_ptbk',
                zoneName: 'ptbk.io',
                name: 'new.ptbk.io',
                type: 'CNAME' as const,
                content: 'cname.vercel-dns.com',
                proxied: false,
                ttl: 1,
                comment: 'Managed by Promptbook sync-vercel-domains.ts',
                tags: [],
            },
            {
                zoneId: 'zone_ptbk',
                zoneName: 'ptbk.io',
                name: 'old.ptbk.io',
                type: 'CNAME' as const,
                content: 'cname.vercel-dns.com',
                proxied: false,
                ttl: 1,
                comment: 'Managed by Promptbook sync-vercel-domains.ts',
                tags: [],
            },
            {
                zoneId: 'zone_ptbk',
                zoneName: 'ptbk.io',
                name: 'conflict.ptbk.io',
                type: 'CNAME' as const,
                content: 'cname.vercel-dns.com',
                proxied: false,
                ttl: 1,
                comment: 'Managed by Promptbook sync-vercel-domains.ts',
                tags: [],
            },
        ];

        const originalFetch = global.fetch;
        global.fetch = jest.fn(async (input: string | URL) => {
            const url = input.toString();

            if (url.includes('/client/v4/zones/zone_ptbk/dns_records') && !url.includes('/rec_')) {
                return {
                    ok: true,
                    text: async () =>
                        JSON.stringify({
                            success: true,
                            result: [
                                {
                                    id: 'rec_old',
                                    type: 'CNAME',
                                    name: 'old.ptbk.io',
                                    content: 'legacy.example.com',
                                    proxied: true,
                                    ttl: 120,
                                    comment: 'Legacy record',
                                    tags: [],
                                },
                                {
                                    id: 'rec_conflict_a',
                                    type: 'A',
                                    name: 'conflict.ptbk.io',
                                    content: '1.2.3.4',
                                },
                            ],
                            result_info: { page: 1, total_pages: 1 },
                        }),
                } as Response;
            }

            throw new Error(`Unexpected fetch URL in test: ${url}`);
        }) as typeof fetch;

        try {
            const plan = await createCloudflareDnsRecordSyncPlan({
                cloudflareConfiguration,
                desiredRecords,
            });

            expect(plan.recordsToCreate).toEqual([desiredRecords[0]]);
            expect(plan.recordsToUpdate).toHaveLength(1);
            expect(plan.recordsToUpdate[0]).toMatchObject({
                currentRecord: {
                    id: 'rec_old',
                    name: 'old.ptbk.io',
                    content: 'legacy.example.com',
                },
                desiredRecord: desiredRecords[1],
            });
            expect(plan.recordsToUpdate[0]!.reasons).toEqual([
                'content legacy.example.com -> cname.vercel-dns.com',
                'proxied true -> false',
                'ttl 120 -> 1',
                'comment marker missing',
            ]);
            expect(plan.skippedDomains).toEqual([
                {
                    domain: 'conflict.ptbk.io',
                    reason: 'Cloudflare already contains conflicting or ambiguous records on this hostname, so no automatic create/update was attempted.',
                },
            ]);
        } finally {
            global.fetch = originalFetch;
        }
    });
});

import { beforeAll, describe, expect, it } from '@jest/globals';
import { SERVER_ENVIRONMENT } from '../src/utils/serverRegistry';

let createVercelDomainSyncPlan: typeof import('./sync-vercel-domains').createVercelDomainSyncPlan;
let resolveDesiredProjectDomain: typeof import('./sync-vercel-domains').resolveDesiredProjectDomain;

beforeAll(async () => {
    process.env.PROMPTBOOK_RUN_SYNC_VERCEL_DOMAINS_MAIN = 'false';

    const syncVercelDomainsModule = await import('./sync-vercel-domains');
    createVercelDomainSyncPlan = syncVercelDomainsModule.createVercelDomainSyncPlan;
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
});

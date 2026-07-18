import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    assignAgentProjectDomain,
    listAgentProjectDomainRecords,
    resolveAgentProjectDomainRecordByHost,
    resolveAgentProjectRuntimeBaseDomain,
} from './agentProjectRuntimeDomains';
import {
    PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV,
    PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV,
} from './agentProjectRuntimePaths';

/**
 * Environment snapshot restored after each domain-registry test.
 */
const ORIGINAL_ENVIRONMENT = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    PTBK_AGENT_PROJECT_DOMAINS_FILE: process.env[PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV],
    PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE: process.env[PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV],
    SERVERS: process.env.SERVERS,
};

describe('agentProjectRuntimeDomains', () => {
    let temporaryDirectory: string | null = null;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-domains-'));
        process.env[PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV] = join(temporaryDirectory, 'domains.txt');
        process.env[PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV] = join(temporaryDirectory, 'domains.json');
        delete process.env.NEXT_PUBLIC_SITE_URL;
        delete process.env.SERVERS;
    });

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }

        restoreEnvironmentVariable('NEXT_PUBLIC_SITE_URL', ORIGINAL_ENVIRONMENT.NEXT_PUBLIC_SITE_URL);
        restoreEnvironmentVariable(
            PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV,
            ORIGINAL_ENVIRONMENT.PTBK_AGENT_PROJECT_DOMAINS_FILE,
        );
        restoreEnvironmentVariable(
            PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV,
            ORIGINAL_ENVIRONMENT.PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE,
        );
        restoreEnvironmentVariable('SERVERS', ORIGINAL_ENVIRONMENT.SERVERS);
    });

    it('assigns a stable project subdomain and writes the installer domains file', async () => {
        const assignment = await assignAgentProjectDomain({
            agentPermanentId: 'AgentABC',
            projectName: 'My Project',
            serverDomain: 'https://agents.example.com',
        });

        expect(assignment.record).toMatchObject({
            agentPermanentId: 'AgentABC',
            projectName: 'My Project',
            serverDomain: 'agents.example.com',
            domain: 'my-project.agents.example.com',
            publicUrl: 'https://my-project.agents.example.com',
            projectHref: '/agents/AgentABC/projects/My%20Project',
        });
        expect(assignment.isChanged).toBe(true);
        await expect(listAgentProjectDomainRecords()).resolves.toHaveLength(1);
        await expect(resolveAgentProjectDomainRecordByHost('my-project.agents.example.com')).resolves.toMatchObject({
            domain: 'my-project.agents.example.com',
        });

        const domainsFileContent = await readFile(process.env[PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV]!, 'utf-8');

        expect(domainsFileContent).toContain('my-project.agents.example.com');
    });

    it('skips project subdomains when only a local development URL is configured', () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:4440';

        expect(resolveAgentProjectRuntimeBaseDomain()).toBeNull();
    });
});

/**
 * Restores one optional environment variable after a test case.
 */
function restoreEnvironmentVariable(key: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[key];
        return;
    }

    process.env[key] = value;
}

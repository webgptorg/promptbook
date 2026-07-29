import {
    isAgentProjectDnsDiagnosticIssue,
    listAgentProjectDnsDiagnostics,
} from './listAgentProjectDnsDiagnostics';

describe('listAgentProjectDnsDiagnostics', () => {
    it('checks generated project domains and recommends one wildcard CNAME record', async () => {
        const diagnostics = await listAgentProjectDnsDiagnostics({
            projectDomainRecords: [
                {
                    agentPermanentId: 'agent-1',
                    projectName: 'book-cheatsheet-a4',
                    serverDomain: 'lts1.ptbk.io',
                    customDomain: null,
                    domain: 'book-cheatsheet-a4.lts1.ptbk.io',
                    publicUrl: 'https://book-cheatsheet-a4.lts1.ptbk.io',
                    projectHref: '/agents/agent-1/projects/book-cheatsheet-a4',
                    assignedAt: '2026-07-01T00:00:00.000Z',
                    updatedAt: '2026-07-01T00:00:00.000Z',
                },
            ],
            publicIpAddress: '203.0.113.42',
            serverDomain: 'lts1.ptbk.io',
            resolveDnsAddresses: async () => [],
        });

        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({
            agentPermanentId: 'agent-1',
            projectName: 'book-cheatsheet-a4',
            projectDomain: 'book-cheatsheet-a4.lts1.ptbk.io',
            dnsDiagnostic: {
                status: 'pending',
                expectedRecords: [
                    {
                        type: 'CNAME',
                        name: '*.lts1.ptbk.io',
                        value: 'lts1.ptbk.io',
                    },
                ],
            },
        });
        expect(isAgentProjectDnsDiagnosticIssue(diagnostics[0]!)).toBe(true);
    });

    it('excludes custom domains because the generated-project wildcard cannot configure them', async () => {
        const diagnostics = await listAgentProjectDnsDiagnostics({
            projectDomainRecords: [
                {
                    agentPermanentId: 'agent-1',
                    projectName: 'generated-project',
                    serverDomain: 'lts1.ptbk.io',
                    customDomain: null,
                    domain: 'generated-project.lts1.ptbk.io',
                    publicUrl: 'https://generated-project.lts1.ptbk.io',
                    projectHref: '/agents/agent-1/projects/generated-project',
                    assignedAt: '2026-07-01T00:00:00.000Z',
                    updatedAt: '2026-07-01T00:00:00.000Z',
                },
                {
                    agentPermanentId: 'agent-1',
                    projectName: 'custom-project',
                    serverDomain: 'lts1.ptbk.io',
                    customDomain: 'www.example.com',
                    domain: 'www.example.com',
                    publicUrl: 'https://www.example.com',
                    projectHref: '/agents/agent-1/projects/custom-project',
                    assignedAt: '2026-07-01T00:00:00.000Z',
                    updatedAt: '2026-07-01T00:00:00.000Z',
                },
            ],
            publicIpAddress: '203.0.113.42',
            serverDomain: 'lts1.ptbk.io',
            resolveDnsAddresses: async () => ['203.0.113.42'],
        });

        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]?.projectName).toBe('generated-project');
        expect(isAgentProjectDnsDiagnosticIssue(diagnostics[0]!)).toBe(false);
    });
});

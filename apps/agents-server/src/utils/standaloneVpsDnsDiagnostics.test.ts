import { createStandaloneVpsDomainDnsDiagnostic } from './standaloneVpsDnsDiagnostics';

describe('createStandaloneVpsDomainDnsDiagnostic', () => {
    it('marks a domain as verified when DNS resolves to the configured VPS IP', async () => {
        const diagnostic = await createStandaloneVpsDomainDnsDiagnostic({
            domain: 'agents.example.com',
            publicIpAddress: '203.0.113.42',
            resolveDnsAddresses: async () => ['203.0.113.42'],
        });

        expect(diagnostic.status).toBe('verified');
        expect(diagnostic.summary).toContain('DNS is ready');
        expect(diagnostic.expectedRecords[0]).toMatchObject({
            type: 'A',
            name: 'agents.example.com',
            value: '203.0.113.42',
        });
    });

    it('marks a domain as pending when DNS does not resolve yet', async () => {
        const diagnostic = await createStandaloneVpsDomainDnsDiagnostic({
            domain: 'agents.example.com',
            publicIpAddress: '203.0.113.42',
            resolveDnsAddresses: async () => [],
        });

        expect(diagnostic.status).toBe('pending');
        expect(diagnostic.summary).toContain('does not resolve yet');
    });

    it('marks a domain as misconfigured when DNS resolves to another IP address', async () => {
        const diagnostic = await createStandaloneVpsDomainDnsDiagnostic({
            domain: 'agents.example.com',
            publicIpAddress: '203.0.113.42',
            resolveDnsAddresses: async () => ['198.51.100.10'],
        });

        expect(diagnostic.status).toBe('misconfigured');
        expect(diagnostic.summary).toContain('198.51.100.10');
        expect(diagnostic.summary).toContain('203.0.113.42');
    });

    it('returns an unavailable diagnostic when the VPS public IP is not known', async () => {
        const diagnostic = await createStandaloneVpsDomainDnsDiagnostic({
            domain: 'agents.example.com',
            publicIpAddress: 'localhost',
            resolveDnsAddresses: async () => ['203.0.113.42'],
        });

        expect(diagnostic.status).toBe('unavailable');
        expect(diagnostic.publicIpAddress).toBeNull();
        expect(diagnostic.expectedRecords).toEqual([]);
    });

    it('includes an optional CNAME fallback for additional domains', async () => {
        const diagnostic = await createStandaloneVpsDomainDnsDiagnostic({
            domain: 'support.example.com',
            publicIpAddress: '203.0.113.42',
            fallbackCnameTargetDomain: 'agents.example.com',
            resolveDnsAddresses: async () => [],
        });

        expect(diagnostic.expectedRecords).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'CNAME',
                    name: 'support.example.com',
                    value: 'agents.example.com',
                }),
            ]),
        );
    });
});

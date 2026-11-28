import { resolveShibbolethPublicRequestUrl } from './resolveShibbolethPublicRequestUrl';

describe('resolveShibbolethPublicRequestUrl', () => {
    it('uses forwarded host and protocol for proxied Shibboleth requests', () => {
        const request = new Request('http://localhost:4440/api/auth/shibboleth/acs', {
            headers: {
                host: 'localhost:4440',
                'x-forwarded-host': 's23.ptbk.io',
                'x-forwarded-proto': 'https',
            },
        });

        expect(resolveShibbolethPublicRequestUrl(request)).toBe('https://s23.ptbk.io/api/auth/shibboleth/acs');
    });

    it('infers https for non-local hosts when no forwarded protocol is present', () => {
        const request = new Request('http://s23.ptbk.io/api/auth/shibboleth/metadata', {
            headers: {
                host: 's23.ptbk.io',
            },
        });

        expect(resolveShibbolethPublicRequestUrl(request)).toBe('https://s23.ptbk.io/api/auth/shibboleth/metadata');
    });
});

import { resolveShibbolethServiceProviderUrls } from './resolveShibbolethServiceProviderUrls';

/**
 * Environment keys used by Shibboleth Service Provider URL resolution.
 */
const SHIBBOLETH_SERVICE_PROVIDER_URL_ENV_KEYS = ['NEXT_PUBLIC_SITE_URL'] as const;

/**
 * Original environment snapshot restored after each test.
 */
const ORIGINAL_SHIBBOLETH_SERVICE_PROVIDER_URL_ENV = SHIBBOLETH_SERVICE_PROVIDER_URL_ENV_KEYS.map(
    (key) => [key, process.env[key]] as const,
);

describe('resolveShibbolethServiceProviderUrls', () => {
    afterEach(() => {
        restoreShibbolethServiceProviderUrlEnv();
    });

    it('prefers the public request origin over a stale local site URL', () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'https://localhost:4440';

        const serviceProviderUrls = resolveShibbolethServiceProviderUrls(
            'https://s23.ptbk.io/api/auth/shibboleth/acs',
            {},
        );

        expect(serviceProviderUrls.origin).toBe('https://s23.ptbk.io');
        expect(serviceProviderUrls.assertionConsumerServiceUrl).toBe('https://s23.ptbk.io/api/auth/shibboleth/acs');
        expect(serviceProviderUrls.metadataUrl).toBe('https://s23.ptbk.io/api/auth/shibboleth/metadata');
    });

    it('uses a non-local configured site URL when the request is local', () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'https://pasu.ptbk.io';

        const serviceProviderUrls = resolveShibbolethServiceProviderUrls(
            'http://localhost:4440/api/auth/shibboleth/metadata',
            {},
        );

        expect(serviceProviderUrls.origin).toBe('https://pasu.ptbk.io');
        expect(serviceProviderUrls.metadataUrl).toBe('https://pasu.ptbk.io/api/auth/shibboleth/metadata');
    });
});

/**
 * Restores the original environment snapshot after a test case.
 */
function restoreShibbolethServiceProviderUrlEnv(): void {
    for (const key of SHIBBOLETH_SERVICE_PROVIDER_URL_ENV_KEYS) {
        delete process.env[key];
    }

    for (const [key, value] of ORIGINAL_SHIBBOLETH_SERVICE_PROVIDER_URL_ENV) {
        if (typeof value === 'string') {
            process.env[key] = value;
        }
    }
}

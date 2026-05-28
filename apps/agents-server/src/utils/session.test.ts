import { describe, expect, it } from '@jest/globals';
import { shouldUseSecureSessionCookieForRequest } from './session';

describe('shouldUseSecureSessionCookieForRequest', () => {
    it('allows non-secure cookies for raw-IP bootstrap access without configured domains', () => {
        expect(
            shouldUseSecureSessionCookieForRequest({
                isProduction: true,
                host: '203.0.113.42',
                forwardedHost: null,
                forwardedProto: 'http',
                nextPublicSiteUrl: 'http://203.0.113.42',
                configuredServers: '',
                publicIpAddress: '203.0.113.42',
            }),
        ).toBe(false);
    });

    it('keeps secure cookies for configured domains in production', () => {
        expect(
            shouldUseSecureSessionCookieForRequest({
                isProduction: true,
                host: 'agents.example.com',
                forwardedHost: null,
                forwardedProto: 'https',
                nextPublicSiteUrl: 'https://agents.example.com',
                configuredServers: 'agents.example.com',
                publicIpAddress: '203.0.113.42',
            }),
        ).toBe(true);
    });

    it('allows non-secure cookies while standalone VPS raw-IP bootstrap stays active', () => {
        expect(
            shouldUseSecureSessionCookieForRequest({
                isProduction: true,
                host: '203.0.113.42',
                forwardedHost: null,
                forwardedProto: 'http',
                nextPublicSiteUrl: 'http://203.0.113.42',
                configuredServers: 'agents.example.com',
                publicIpAddress: '203.0.113.42',
            }),
        ).toBe(false);
    });

    it('keeps secure cookies when raw-IP access is not the configured standalone VPS address', () => {
        expect(
            shouldUseSecureSessionCookieForRequest({
                isProduction: true,
                host: '198.51.100.10',
                forwardedHost: null,
                forwardedProto: 'http',
                nextPublicSiteUrl: 'http://203.0.113.42',
                configuredServers: '',
                publicIpAddress: '203.0.113.42',
            }),
        ).toBe(true);
    });

    it('keeps secure cookies outside production only disabled by NODE_ENV', () => {
        expect(
            shouldUseSecureSessionCookieForRequest({
                isProduction: false,
                host: 'agents.example.com',
                forwardedHost: null,
                forwardedProto: 'https',
                nextPublicSiteUrl: 'https://agents.example.com',
                configuredServers: 'agents.example.com',
                publicIpAddress: '203.0.113.42',
            }),
        ).toBe(false);
    });
});

import { describe, expect, it } from '@jest/globals';
import {
    createShibbolethAuthenticationLogPayload,
    type ReadonlyHeadersLike,
} from './createShibbolethAuthenticationLogPayload';

describe('createShibbolethAuthenticationLogPayload', () => {
    it('returns null when the request does not carry Shibboleth-related headers', () => {
        expect(
            createShibbolethAuthenticationLogPayload(new Headers(), {
                event: 'middleware-request',
                pathname: '/',
                method: 'GET',
                hasSessionCookie: false,
            }),
        ).toBeNull();
    });

    it('captures and fingerprints supported Shibboleth attributes without exposing raw values', () => {
        const headers = new Headers({
            'shib-session-id': '_4f3d9c2a',
            'remote-user': 'jah0009',
            displayName: 'Jiri Jahn',
            mail: 'jiri@example.edu',
            unstructuredName: '123456',
        });

        expect(
            createShibbolethAuthenticationLogPayload(headers, {
                event: 'middleware-request',
                pathname: '/',
                method: 'GET',
                hasSessionCookie: false,
            }),
        ).toEqual({
            event: 'middleware-request',
            pathname: '/',
            method: 'GET',
            hasSessionCookie: false,
            isSecureSessionCookie: undefined,
            headerNames: ['shib-session-id', 'remote-user', 'displayname', 'mail', 'unstructuredname'],
            attributeFields: ['sessionId', 'remoteUser', 'displayName', 'mail', 'unstructuredName'],
            attributes: [
                { fieldName: 'sessionId', headerName: 'shib-session-id', fingerprint: '06e47776cf55', valueLength: 9 },
                { fieldName: 'remoteUser', headerName: 'remote-user', fingerprint: '1e7b3b5c0542', valueLength: 7 },
                { fieldName: 'displayName', headerName: 'displayname', fingerprint: '07d58a463330', valueLength: 9 },
                { fieldName: 'mail', headerName: 'mail', fingerprint: '070a14c1f1e0', valueLength: 16 },
                {
                    fieldName: 'unstructuredName',
                    headerName: 'unstructuredname',
                    fingerprint: '078f72e40dc5',
                    valueLength: 6,
                },
            ],
        });
    });

    it('supports proxied x-prefixed Shibboleth headers', () => {
        const headers = createHeadersLike({
            'x-shib-session-id': 'session-123',
            'x-displayname': 'Jane Doe',
            'x-mail': 'jane@example.edu',
        });

        expect(
            createShibbolethAuthenticationLogPayload(headers, {
                event: 'session-set',
                hasSessionCookie: false,
                isSecureSessionCookie: true,
            }),
        ).toEqual({
            event: 'session-set',
            pathname: undefined,
            method: undefined,
            hasSessionCookie: false,
            isSecureSessionCookie: true,
            headerNames: ['x-shib-session-id', 'x-displayname', 'x-mail'],
            attributeFields: ['sessionId', 'displayName', 'mail'],
            attributes: [
                { fieldName: 'sessionId', headerName: 'x-shib-session-id', fingerprint: '001b402e7fd4', valueLength: 11 },
                { fieldName: 'displayName', headerName: 'x-displayname', fingerprint: '194f3881d493', valueLength: 8 },
                { fieldName: 'mail', headerName: 'x-mail', fingerprint: '080e08de6f6c', valueLength: 16 },
            ],
        });
    });
});

/**
 * Creates a tiny read-only header accessor for unit tests.
 *
 * @param values - Header names mapped to values.
 * @returns Header accessor implementing `get`.
 */
function createHeadersLike(values: Record<string, string>): ReadonlyHeadersLike {
    const normalizedEntries = Object.entries(values).map(([key, value]) => [key.toLowerCase(), value] as const);
    const normalizedMap = new Map(normalizedEntries);

    return {
        get(name: string): string | null {
            return normalizedMap.get(name.toLowerCase()) || null;
        },
    };
}

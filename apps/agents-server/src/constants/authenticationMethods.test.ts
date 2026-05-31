import { describe, expect, it } from '@jest/globals';
import {
    DEFAULT_AUTHENTICATION_METHODS_METADATA_VALUE,
    isAuthenticationMethodEnabled,
    parseAuthenticationMethods,
} from './authenticationMethods';

describe('authentication methods metadata', () => {
    it('defaults to password login only', () => {
        expect(parseAuthenticationMethods(null)).toEqual(['PASSWORD']);
        expect(DEFAULT_AUTHENTICATION_METHODS_METADATA_VALUE).toBe('PASSWORD');
    });

    it('parses known methods case-insensitively and removes duplicates', () => {
        expect(parseAuthenticationMethods('password, shibboleth PASSWORD')).toEqual(['PASSWORD', 'SHIBBOLETH']);
    });

    it('falls back to password when no known method is configured', () => {
        expect(parseAuthenticationMethods('UNKNOWN')).toEqual(['PASSWORD']);
    });

    it('checks one enabled method', () => {
        expect(isAuthenticationMethodEnabled('PASSWORD,SHIBBOLETH', 'SHIBBOLETH')).toBe(true);
        expect(isAuthenticationMethodEnabled('PASSWORD', 'SHIBBOLETH')).toBe(false);
    });
});

import { describe, expect, it } from '@jest/globals';
import { resolveStalwartApiUrl, STALWART_DEFAULT_API_URL } from './resolveStalwartApiUrl';

describe('resolveStalwartApiUrl', () => {
    it('falls back to the local JMAP management endpoint', () => {
        expect(resolveStalwartApiUrl(undefined)).toBe(STALWART_DEFAULT_API_URL);
        expect(resolveStalwartApiUrl(null)).toBe(STALWART_DEFAULT_API_URL);
        expect(resolveStalwartApiUrl('   ')).toBe(STALWART_DEFAULT_API_URL);
    });

    it('upgrades the legacy `/api` path which Stalwart answers with HTTP 404', () => {
        expect(resolveStalwartApiUrl('http://127.0.0.1:8080/api')).toBe('http://127.0.0.1:8080/jmap/');
        expect(resolveStalwartApiUrl('http://127.0.0.1:8080/api/')).toBe('http://127.0.0.1:8080/jmap/');
        expect(resolveStalwartApiUrl('  http://127.0.0.1:8080/api  ')).toBe('http://127.0.0.1:8080/jmap/');
    });

    it('upgrades a bare Stalwart base URL', () => {
        expect(resolveStalwartApiUrl('http://127.0.0.1:8080')).toBe('http://127.0.0.1:8080/jmap/');
        expect(resolveStalwartApiUrl('https://mail.example.com/')).toBe('https://mail.example.com/jmap/');
    });

    it('keeps an explicitly configured endpoint', () => {
        expect(resolveStalwartApiUrl('http://127.0.0.1:8080/jmap/')).toBe('http://127.0.0.1:8080/jmap/');
        expect(resolveStalwartApiUrl('https://mail.example.com/jmap')).toBe('https://mail.example.com/jmap');
        expect(resolveStalwartApiUrl('https://mail.example.com/stalwart/jmap/')).toBe(
            'https://mail.example.com/stalwart/jmap/',
        );
    });

    it('keeps an unparsable value so that the failing call can report it', () => {
        expect(resolveStalwartApiUrl('127.0.0.1:8080/jmap/')).toBe('127.0.0.1:8080/jmap/');
    });
});

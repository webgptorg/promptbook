import { afterEach, describe, expect, it } from '@jest/globals';
import { resolveInternalServerOrigin } from './resolveInternalServerOrigin';

/**
 * Environment keys used by internal-origin resolution.
 */
const INTERNAL_SERVER_ENV_KEYS = [
    'NEXT_PUBLIC_SITE_URL',
    'PORT',
] as const;

/**
 * Original environment snapshot restored after each test.
 */
const ORIGINAL_INTERNAL_SERVER_ENV = INTERNAL_SERVER_ENV_KEYS.map((key) => [key, process.env[key]] as const);

describe('resolveInternalServerOrigin', () => {
    afterEach(() => {
        restoreInternalServerEnv();
    });

    it('prefers NEXT_PUBLIC_SITE_URL when configured', () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'https://agents.example.com/';

        expect(resolveInternalServerOrigin()).toBe('https://agents.example.com');
    });

    it('falls back to local http localhost when no deployment URL is configured', () => {
        clearInternalServerEnv(INTERNAL_SERVER_ENV_KEYS);

        expect(resolveInternalServerOrigin()).toBe('http://localhost:4440');
    });

    it('uses the configured local port for localhost fallback', () => {
        clearInternalServerEnv(INTERNAL_SERVER_ENV_KEYS);
        process.env.PORT = '5555';

        expect(resolveInternalServerOrigin()).toBe('http://localhost:5555');
    });
});

/**
 * Clears one or more environment keys for a test case.
 *
 * @param keys - Environment keys to delete.
 */
function clearInternalServerEnv(keys: ReadonlyArray<(typeof INTERNAL_SERVER_ENV_KEYS)[number]>): void {
    for (const key of keys) {
        delete process.env[key];
    }
}

/**
 * Restores the original environment snapshot after a test case.
 */
function restoreInternalServerEnv(): void {
    clearInternalServerEnv(INTERNAL_SERVER_ENV_KEYS);

    for (const [key, value] of ORIGINAL_INTERNAL_SERVER_ENV) {
        if (typeof value === 'string') {
            process.env[key] = value;
        }
    }
}

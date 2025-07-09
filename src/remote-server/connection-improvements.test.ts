import { describe, expect, it } from '@jest/globals';
import { CONNECTION_TIMEOUT_MS } from '../config';
import { OAUTH_TIMEOUT_MS } from '../config';

describe('Connection timeout improvements for Facebook connection issue', () => {
    it('should have increased connection timeout to handle OAuth flows', () => {
        // The timeout should be at least 20 seconds to handle social login flows
        expect(CONNECTION_TIMEOUT_MS).toBeGreaterThanOrEqual(20 * 1000);
        expect(CONNECTION_TIMEOUT_MS).toBe(30 * 1000); // Specifically 30 seconds as we set
    });

    it('should have OAuth-specific timeout configuration', () => {
        // OAuth flows need even more time for user interaction
        expect(OAUTH_TIMEOUT_MS).toBeGreaterThanOrEqual(30 * 1000);
        expect(OAUTH_TIMEOUT_MS).toBe(60 * 1000); // Specifically 60 seconds as we set
    });

    it('should have OAuth timeout longer than regular connection timeout', () => {
        // OAuth should allow more time than regular connections
        expect(OAUTH_TIMEOUT_MS).toBeGreaterThan(CONNECTION_TIMEOUT_MS);
    });
});

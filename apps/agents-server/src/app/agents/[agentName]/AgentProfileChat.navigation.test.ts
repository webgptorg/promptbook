/**
 * Regression tests for profile-page → chat-page navigation.
 *
 * Bug: clicking navigation items on the agent profile page (quick buttons,
 * "My chats" panel, send-message action, etc.) did nothing - the UI faded
 * briefly then returned to the profile page without navigating.
 *
 * Root causes that these tests guard against:
 *  1. The destination URL must point to the agent's `/chat` route (not back to
 *     the profile route).
 *  2. `buildAgentChatDestinationUrl` must append `?chat=new` only when both
 *     `shouldForceNewChat` AND `isHistoryEnabled` are true, so history-disabled
 *     agents never receive an unexpected query parameter.
 *  3. `normalizeDestinationForLocationComparison` must strip the origin from a
 *     full URL so the stall-detection logic can compare it against
 *     `window.location.pathname`.
 */

import { buildAgentChatDestinationUrl, normalizeDestinationForLocationComparison } from './agentChatNavigationUtils';

// ─── buildAgentChatDestinationUrl ────────────────────────────────────────────

describe('buildAgentChatDestinationUrl', () => {
    const CHAT_ROUTE = '/agents/hKs8wGS2xc5GhF/chat';

    it('returns the base chat route when forceNewChat is false', () => {
        expect(
            buildAgentChatDestinationUrl(CHAT_ROUTE, {
                shouldForceNewChat: false,
                isHistoryEnabled: true,
            }),
        ).toBe('/agents/hKs8wGS2xc5GhF/chat');
    });

    it('returns the base chat route when history is disabled even if forceNewChat is requested', () => {
        expect(
            buildAgentChatDestinationUrl(CHAT_ROUTE, {
                shouldForceNewChat: true,
                isHistoryEnabled: false,
            }),
        ).toBe('/agents/hKs8wGS2xc5GhF/chat');
    });

    it('appends ?chat=new when forceNewChat is true and history is enabled', () => {
        expect(
            buildAgentChatDestinationUrl(CHAT_ROUTE, {
                shouldForceNewChat: true,
                isHistoryEnabled: true,
            }),
        ).toBe('/agents/hKs8wGS2xc5GhF/chat?chat=new');
    });

    it('percent-encodes special characters in the chat route', () => {
        const encodedRoute = `/agents/${encodeURIComponent('my agent')}/chat`;
        expect(
            buildAgentChatDestinationUrl(encodedRoute, {
                shouldForceNewChat: false,
                isHistoryEnabled: false,
            }),
        ).toBe('/agents/my%20agent/chat');
    });
});

// ─── normalizeDestinationForLocationComparison ───────────────────────────────

describe('normalizeDestinationForLocationComparison', () => {
    const originalWindow = globalThis.window;

    beforeEach(() => {
        // Provide a minimal window.location so `new URL(dest, base)` works.
        Object.defineProperty(globalThis, 'window', {
            value: { location: { href: 'https://example.ptbk.io/' } },
            configurable: true,
            writable: true,
        });
    });

    afterEach(() => {
        Object.defineProperty(globalThis, 'window', {
            value: originalWindow,
            configurable: true,
            writable: true,
        });
    });

    it('strips the origin and returns pathname+search+hash for a full URL', () => {
        expect(normalizeDestinationForLocationComparison('https://example.ptbk.io/agents/abc/chat')).toBe(
            '/agents/abc/chat',
        );
    });

    it('returns pathname+search for a full URL with query params', () => {
        expect(normalizeDestinationForLocationComparison('https://example.ptbk.io/agents/abc/chat?chat=new')).toBe(
            '/agents/abc/chat?chat=new',
        );
    });

    it('resolves a relative path against the current origin', () => {
        expect(normalizeDestinationForLocationComparison('/agents/abc/chat')).toBe('/agents/abc/chat');
    });
});

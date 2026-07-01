import { describe, expect, it, afterEach } from '@jest/globals';
import {
    finishPagePreviewBrowserSession,
    listPagePreviewBrowserAdminTasks,
    normalizePagePreviewBrowserSessionId,
    registerPagePreviewBrowserSession,
} from './pagePreviewBrowserSessions';
import type { UserInfo } from './getCurrentUser';

/**
 * Stable user used by browser-preview session tests.
 *
 * @private test constant
 */
const TEST_USER: UserInfo = {
    id: 42,
    username: 'alice',
    isAdmin: false,
    profileImageUrl: null,
};

/**
 * Session id used by browser-preview session tests.
 *
 * @private test constant
 */
const TEST_SESSION_ID = 'page-preview-1234567890abcdef';

describe('pagePreviewBrowserSessions', () => {
    afterEach(() => {
        finishPagePreviewBrowserSession(TEST_SESSION_ID);
    });

    it('accepts only normalized browser preview session ids', () => {
        expect(normalizePagePreviewBrowserSessionId('PAGE-PREVIEW-1234567890ABCDEF')).toBe(TEST_SESSION_ID);
        expect(normalizePagePreviewBrowserSessionId('other-session')).toBeNull();
        expect(normalizePagePreviewBrowserSessionId('page-preview-short')).toBeNull();
    });

    it('surfaces active browser preview streams as task-manager rows', () => {
        registerPagePreviewBrowserSession({
            sessionId: TEST_SESSION_ID,
            url: 'https://example.com/source',
            user: TEST_USER,
        });

        const task = listPagePreviewBrowserAdminTasks().find((candidate) => candidate.id === TEST_SESSION_ID);

        expect(task).toMatchObject({
            id: TEST_SESSION_ID,
            kind: 'BROWSER_PREVIEW',
            status: 'RUNNING',
            queueName: 'page-preview-browser',
            userId: TEST_USER.id,
            username: TEST_USER.username,
            agentName: 'Browser preview',
            chatId: 'https://example.com/source',
            lastErrorDetails: 'https://example.com/source',
        });
    });
});


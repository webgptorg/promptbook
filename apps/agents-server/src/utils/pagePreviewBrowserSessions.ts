import type { CDPSession, Page } from 'playwright';
import {
    PAGE_PREVIEW_SESSION_ID_PATTERN,
    PAGE_PREVIEW_SESSION_ID_PREFIX,
} from '../../../../src/book-components/Chat/Chat/pagePreview/createPagePreviewSessionId';
import type { PagePreviewViewport } from '../../../../src/book-components/Chat/Chat/pagePreview/PagePreviewViewport';
import type { AdminChatTaskRecord } from './chatTasksAdmin';
import type { UserInfo } from './getCurrentUser';
import { appendTaskTerminalLogLine, markTaskTerminalLogFinished } from './taskTerminal/taskTerminalLog';

/**
 * Queue name used when active browser previews are surfaced in the admin task manager.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_BROWSER_TASK_QUEUE_NAME = 'page-preview-browser';

/**
 * Agent label used by the task manager for browser-preview rows.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_BROWSER_TASK_AGENT_NAME = 'Browser preview';

/**
 * In-memory record for one live browser preview stream.
 *
 * @private internal type of Agents Server page-preview streaming
 */
export type PagePreviewBrowserSession = {
    readonly id: string;
    readonly url: string;
    readonly userId: number;
    readonly username: string | null;
    readonly createdAt: string;
    readonly startedAt: string;
    readonly processId: number | null;
    page: Page | null;
    viewport: PagePreviewViewport | null;
    cdpSession: CDPSession | null;
    applyViewport: ((viewport: PagePreviewViewport) => Promise<void>) | null;
    updatedAt: string;
    lastFrameAt: string | null;
};

/**
 * Live page attachment of one browser preview stream.
 *
 * @private internal type of Agents Server page-preview streaming
 */
export type AttachPagePreviewBrowserSessionPageOptions = {
    /**
     * Playwright page bound to the stream.
     */
    readonly page: Page;

    /**
     * Viewport used by the stream.
     */
    readonly viewport: PagePreviewViewport;

    /**
     * CDP session used for screencasting and navigation-history lookups, when available.
     */
    readonly cdpSession?: CDPSession | null;

    /**
     * Applies a new viewport to the running stream (resizes the page and restarts the screencast).
     */
    readonly applyViewport?: (viewport: PagePreviewViewport) => Promise<void>;
};

/**
 * Options used when registering one browser preview stream.
 *
 * @private internal type of Agents Server page-preview streaming
 */
export type RegisterPagePreviewBrowserSessionOptions = {
    readonly sessionId: string;
    readonly url: string;
    readonly user: UserInfo;
};

/**
 * Shared in-memory browser-preview registry.
 *
 * The route streams are short-lived and tied to the current Node process, so a
 * durable database row would create stale task-manager entries after restarts.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const pagePreviewBrowserSessions = new Map<string, PagePreviewBrowserSession>();

/**
 * Creates a normalized page-preview browser session id.
 *
 * @param requestedSessionId - Optional client-created session id.
 * @returns Valid session id or `null` when the supplied value is invalid.
 */
export function normalizePagePreviewBrowserSessionId(requestedSessionId: string | null): string | null {
    if (!requestedSessionId) {
        return null;
    }

    const normalizedSessionId = requestedSessionId.trim().toLowerCase();
    return PAGE_PREVIEW_SESSION_ID_PATTERN.test(normalizedSessionId) ? normalizedSessionId : null;
}

/**
 * Registers or replaces one active browser preview session.
 *
 * @param options - Session metadata.
 * @returns Registered session snapshot.
 */
export function registerPagePreviewBrowserSession(
    options: RegisterPagePreviewBrowserSessionOptions,
): PagePreviewBrowserSession {
    const now = new Date().toISOString();
    const previousSession = pagePreviewBrowserSessions.get(options.sessionId);
    if (previousSession?.page) {
        void previousSession.page.close().catch(() => undefined);
    }

    const session: PagePreviewBrowserSession = {
        id: options.sessionId,
        url: options.url,
        userId: options.user.id ?? 0,
        username: options.user.username,
        createdAt: now,
        startedAt: now,
        updatedAt: now,
        lastFrameAt: null,
        processId: typeof process.pid === 'number' ? process.pid : null,
        page: null,
        viewport: null,
        cdpSession: null,
        applyViewport: null,
    };

    pagePreviewBrowserSessions.set(options.sessionId, session);
    appendTaskTerminalLogLine(
        options.sessionId,
        `Started live browser preview of ${options.url} for user #${session.userId} (${session.username || 'unknown'}).`,
    );
    return session;
}

/**
 * Attaches the Playwright page used by one live browser preview.
 *
 * @param sessionId - Active session id.
 * @param options - Live page attachment.
 */
export function attachPagePreviewBrowserSessionPage(
    sessionId: string,
    options: AttachPagePreviewBrowserSessionPageOptions,
): void {
    const session = pagePreviewBrowserSessions.get(sessionId);
    if (!session) {
        return;
    }

    session.page = options.page;
    session.viewport = options.viewport;
    session.cdpSession = options.cdpSession ?? null;
    session.applyViewport = options.applyViewport ?? null;
    session.updatedAt = new Date().toISOString();
    appendTaskTerminalLogLine(
        sessionId,
        `Browser page attached with a ${options.viewport.width}x${options.viewport.height} viewport, streaming frames.`,
    );
}

/**
 * Updates the viewport recorded for one live browser preview.
 *
 * @param sessionId - Active session id.
 * @param viewport - New viewport of the streamed page.
 */
export function updatePagePreviewBrowserSessionViewport(sessionId: string, viewport: PagePreviewViewport): void {
    const session = pagePreviewBrowserSessions.get(sessionId);
    if (!session) {
        return;
    }

    session.viewport = viewport;
    session.updatedAt = new Date().toISOString();
}

/**
 * Marks that one stream frame has been delivered.
 *
 * @param sessionId - Active session id.
 */
export function markPagePreviewBrowserSessionFrame(sessionId: string): void {
    const session = pagePreviewBrowserSessions.get(sessionId);
    if (!session) {
        return;
    }

    const now = new Date().toISOString();
    session.lastFrameAt = now;
    session.updatedAt = now;
}

/**
 * Removes one browser preview session from the active registry.
 *
 * @param sessionId - Active session id.
 */
export function finishPagePreviewBrowserSession(sessionId: string): void {
    if (pagePreviewBrowserSessions.delete(sessionId)) {
        appendTaskTerminalLogLine(sessionId, 'Browser preview session finished.');
        markTaskTerminalLogFinished(sessionId, { isSuccessful: true });
    }
}

/**
 * Returns the active browser preview session when owned by the current user.
 *
 * @param sessionId - Browser preview session id.
 * @param user - Current authenticated user.
 * @returns Session or `null` when missing or owned by a different user.
 */
export function findUserPagePreviewBrowserSession(
    sessionId: string,
    user: UserInfo,
): PagePreviewBrowserSession | null {
    const session = pagePreviewBrowserSessions.get(sessionId);
    if (!session) {
        return null;
    }

    if ((user.id ?? 0) !== session.userId || user.username !== session.username) {
        return null;
    }

    return session;
}

/**
 * Lists active browser preview sessions as admin task-manager rows.
 *
 * @returns Task-manager rows for streams currently attached to this process.
 */
export function listPagePreviewBrowserAdminTasks(): Array<AdminChatTaskRecord> {
    return Array.from(pagePreviewBrowserSessions.values()).map((session) => ({
        id: session.id,
        kind: 'BROWSER_PREVIEW',
        status: 'RUNNING',
        createdAt: session.createdAt,
        queuedAt: session.createdAt,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt,
        finishedAt: null,
        cancelRequestedAt: null,
        pausedAt: null,
        lastHeartbeatAt: session.lastFrameAt,
        leaseExpiresAt: null,
        recurrenceIntervalMs: null,
        priority: null,
        attemptCount: 1,
        retryCount: 0,
        lastErrorSummary: null,
        lastErrorDetails: session.url,
        userId: session.userId,
        username: session.username,
        agentPermanentId: PAGE_PREVIEW_SESSION_ID_PREFIX,
        agentName: PAGE_PREVIEW_BROWSER_TASK_AGENT_NAME,
        chatId: session.url,
        workerId: session.processId === null ? null : String(session.processId),
        queueName: PAGE_PREVIEW_BROWSER_TASK_QUEUE_NAME,
    }));
}

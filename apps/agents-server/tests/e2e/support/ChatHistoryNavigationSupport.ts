import type { Page, Route } from 'playwright/test';

/**
 * Shared control contract for one deliberately delayed matching network request.
 */
type DelayedRequestControl = {
    /**
     * Resolves once the delayed request has been intercepted.
     *
     * @private internal utility of ChatHistoryNavigationSupport
     */
    readonly waitUntilStarted: Promise<void>;
    /**
     * Resolves once the delayed request has completed after release.
     *
     * @private internal utility of ChatHistoryNavigationSupport
     */
    readonly waitUntilFinished: Promise<void>;
    /**
     * Allows the intercepted request to continue.
     *
     * @private internal utility of ChatHistoryNavigationSupport
     */
    release(): void;
    /**
     * Removes the route interception.
     *
     * @private internal utility of ChatHistoryNavigationSupport
     */
    dispose(): Promise<void>;
};

/**
 * Input options for delaying one matching request.
 */
type DelayNextMatchingRequestOptions = {
    /**
     * Expected request method.
     *
     * @private internal utility of ChatHistoryNavigationSupport
     */
    readonly method: 'GET' | 'POST';
    /**
     * URL matcher for one targeted request.
     *
     * @private internal utility of ChatHistoryNavigationSupport
     */
    readonly isMatchingUrl: (url: string) => boolean;
};

/**
 * Minimal management-agent payload needed by chat history navigation tests.
 */
type ManagedAgentLike = {
    /**
     * Canonical browser-route slug and user-chat API identifier.
     *
     * @private internal utility of ChatHistoryNavigationSupport
     */
    readonly agentName: string;
    /**
     * Stable standalone chat route returned by the management API.
     *
     * @private internal utility of ChatHistoryNavigationSupport
     */
    readonly managementChatUrl: string;
};

/**
 * Maximum wait after releasing one delayed network request in navigation tests.
 */
const DELAYED_REQUEST_RELEASE_TIMEOUT_MS = 20_000;

/**
 * Escapes one literal string so it can be matched exactly inside a `RegExp`.
 *
 * @param value - Literal text that should be treated as plain content.
 * @returns Escaped text safe to interpolate into a regular expression.
 */
function escapeForRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds the current browser-facing standalone chat route for one agent.
 *
 * @param agentName - Canonical browser-route slug.
 * @param options - Optional query parameters.
 * @returns Relative chat URL used by the browser app.
 */
function buildAgentBrowserChatUrl(
    agentName: string,
    options: { chatId?: string; forceNewChat?: boolean } = {},
): string {
    const params = new URLSearchParams();
    if (options.forceNewChat) {
        params.set('chat', 'new');
    } else if (options.chatId !== undefined) {
        params.set('chat', options.chatId);
    }

    const pathname = `/agents/${encodeURIComponent(agentName)}/chat`;
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
}

/**
 * Returns the current `chat` query parameter from one URL string.
 *
 * @param url - Absolute page URL.
 * @returns Selected chat id or `null` when absent.
 */
function readChatIdFromUrl(url: string): string | null {
    return new URL(url).searchParams.get('chat');
}

/**
 * Checks whether one browser URL points to a selected durable chat for the target agent.
 *
 * The browser currently navigates using the agent-name route alias, while the management
 * API still returns the durable standalone link. Accepting both path shapes keeps this
 * regression focused on "chat selected" behavior instead of one specific alias.
 *
 * @param url - Absolute page URL.
 * @param agent - Targeted management-agent payload.
 * @returns `true` when the URL represents a selected durable chat for the agent.
 */
function isSelectedDurableAgentChatUrl(url: string, agent: ManagedAgentLike): boolean {
    const parsedUrl = new URL(url);
    const selectedChatId = parsedUrl.searchParams.get('chat');

    if (!selectedChatId) {
        return false;
    }

    const candidatePathnames = new Set([
        buildAgentBrowserChatUrl(agent.agentName),
        new URL(agent.managementChatUrl).pathname,
    ]);

    return candidatePathnames.has(parsedUrl.pathname);
}

/**
 * Checks whether one network URL matches the targeted user-chat snapshot request.
 *
 * @param url - Network URL reported by Playwright.
 * @param agentName - Canonical agent slug.
 * @param chatId - Expected selected chat id.
 * @returns `true` when the URL represents `GET /agents/[agent]/api/user-chats?chat=[chatId]`.
 * @private internal utility of ChatHistoryNavigationSupport
 */
function isMatchingUserChatSnapshotRequest(url: string, agentName: string, chatId: string): boolean {
    const parsedUrl = new URL(url);
    const canonicalAgentPath = `/agents/${encodeURIComponent(agentName)}/api/user-chats`;
    const isUserChatsPath =
        parsedUrl.pathname === canonicalAgentPath || /^\/agents\/[^/]+\/api\/user-chats$/.test(parsedUrl.pathname);

    return isUserChatsPath && parsedUrl.searchParams.get('chat') === chatId;
}

/**
 * Checks whether one network URL matches the public agent profile endpoint.
 *
 * @param url - Network URL reported by Playwright.
 * @param agentName - Canonical agent slug.
 * @returns `true` when the URL represents `GET /agents/[agent]/api/profile`.
 * @private internal utility of ChatHistoryNavigationSupport
 */
function isMatchingAgentProfileRequest(url: string, agentName: string): boolean {
    const parsedUrl = new URL(url);
    const canonicalPath = `/agents/${encodeURIComponent(agentName)}/api/profile`;

    return parsedUrl.pathname === canonicalPath || /^\/agents\/[^/]+\/api\/profile$/.test(parsedUrl.pathname);
}

/**
 * Checks whether one network URL matches the durable user-message creation endpoint.
 *
 * @param url - Network URL reported by Playwright.
 * @param agentName - Canonical agent slug.
 * @returns `true` when the URL represents `POST /agents/[agent]/api/user-chats/[chatId]/messages`.
 * @private internal utility of ChatHistoryNavigationSupport
 */
function isMatchingUserChatMessageCreateRequest(url: string, agentName: string): boolean {
    const parsedUrl = new URL(url);
    const canonicalPrefix = `/agents/${encodeURIComponent(agentName)}/api/user-chats/`;
    const isCanonicalPath = parsedUrl.pathname.startsWith(canonicalPrefix) && parsedUrl.pathname.endsWith('/messages');
    const isFallbackPath = /^\/agents\/[^/]+\/api\/user-chats\/[^/]+\/messages$/.test(parsedUrl.pathname);

    return isCanonicalPath || isFallbackPath;
}

/**
 * Delays the next matching request until the test explicitly releases it.
 *
 * The completion promise is resolved from the intercepted request itself to avoid
 * response-predicate races when app navigation and request timing overlap.
 *
 * @param page - Current Playwright page.
 * @param options - Method and URL matcher for the targeted request.
 * @returns Control handle for the delayed request.
 * @private internal utility of ChatHistoryNavigationSupport
 */
async function delayNextMatchingRequest(
    page: Page,
    options: DelayNextMatchingRequestOptions,
): Promise<DelayedRequestControl> {
    let hasInterceptedTargetRequest = false;
    let releaseRequest: (() => void) | null = null;
    let markStarted: (() => void) | null = null;
    let markFinished: (() => void) | null = null;

    const waitUntilStarted = new Promise<void>((resolve) => {
        markStarted = resolve;
    });
    const waitUntilFinished = new Promise<void>((resolve) => {
        markFinished = resolve;
    });

    const routeHandler = async (route: Route) => {
        const request = route.request();
        if (
            hasInterceptedTargetRequest ||
            request.method() !== options.method ||
            !options.isMatchingUrl(request.url())
        ) {
            await route.continue();
            return;
        }

        hasInterceptedTargetRequest = true;
        markStarted?.();

        await new Promise<void>((resolve) => {
            releaseRequest = resolve;
        });

        try {
            await route.continue();
            await request.response().catch(() => null);
        } finally {
            markFinished?.();
        }
    };

    await page.route('**/*', routeHandler);

    return {
        waitUntilStarted,
        waitUntilFinished,
        release() {
            releaseRequest?.();
        },
        async dispose() {
            await page.unroute('**/*', routeHandler);
        },
    };
}

/**
 * Delays the next targeted public agent-profile request until the test explicitly releases it.
 *
 * @param page - Current Playwright page.
 * @param agentName - Canonical agent slug.
 * @returns Control handle for the delayed request.
 */
async function delayNextAgentProfileRequest(page: Page, agentName: string) {
    return delayNextMatchingRequest(page, {
        method: 'GET',
        isMatchingUrl: (url) => isMatchingAgentProfileRequest(url, agentName),
    });
}

/**
 * Delays the next targeted user-chat snapshot request until the test explicitly releases it.
 *
 * @param page - Current Playwright page.
 * @param agentName - Canonical agent slug.
 * @param chatId - Targeted selected chat id.
 * @returns Control handle for the delayed request.
 */
async function delayNextUserChatSnapshotRequest(page: Page, agentName: string, chatId: string) {
    return delayNextMatchingRequest(page, {
        method: 'GET',
        isMatchingUrl: (url) => isMatchingUserChatSnapshotRequest(url, agentName, chatId),
    });
}

/**
 * Delays the next durable user-message creation request until the test explicitly releases it.
 *
 * @param page - Current Playwright page.
 * @param agentName - Canonical agent slug.
 * @returns Control handle for the delayed request.
 */
async function delayNextUserChatMessageCreateRequest(page: Page, agentName: string) {
    return delayNextMatchingRequest(page, {
        method: 'POST',
        isMatchingUrl: (url) => isMatchingUserChatMessageCreateRequest(url, agentName),
    });
}

/**
 * Releases one delayed request and fails if it does not finish promptly afterward.
 *
 * @param page - Current Playwright page.
 * @param delayedRequest - Request control returned by a delay helper.
 * @param failureMessage - Error message used when completion does not arrive.
 */
async function releaseDelayedRequestOrFail(
    page: Page,
    delayedRequest: DelayedRequestControl,
    failureMessage: string,
): Promise<void> {
    delayedRequest.release();
    await Promise.race([
        delayedRequest.waitUntilFinished,
        page.waitForTimeout(DELAYED_REQUEST_RELEASE_TIMEOUT_MS).then(() => {
            throw new Error(failureMessage);
        }),
    ]);
    await delayedRequest.dispose();
}

/**
 * Chat-history-specific routing and delayed-request helpers for Playwright coverage.
 */
export const ChatHistoryNavigationSupport = {
    escapeForRegExp,
    buildAgentBrowserChatUrl,
    readChatIdFromUrl,
    isSelectedDurableAgentChatUrl,
    isMatchingUserChatMessageCreateRequest,
    delayNextAgentProfileRequest,
    delayNextUserChatSnapshotRequest,
    delayNextUserChatMessageCreateRequest,
    releaseDelayedRequestOrFail,
};

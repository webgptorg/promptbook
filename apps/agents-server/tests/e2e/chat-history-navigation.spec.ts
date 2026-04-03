import { expect, test, type Page, type Route } from 'playwright/test';
import { loginAsAdmin } from './support/auth';

/**
 * Shared control contract for one deliberately delayed matching network request.
 */
type DelayedRequestControl = {
    /**
     * Resolves once the delayed request has been intercepted.
     */
    readonly waitUntilStarted: Promise<void>;
    /**
     * Resolves once the delayed request has completed after release.
     */
    readonly waitUntilFinished: Promise<void>;
    /**
     * Allows the intercepted request to continue.
     */
    release(): void;
    /**
     * Removes the route interception.
     */
    dispose(): Promise<void>;
};

/**
 * Input options for delaying one matching request.
 */
type DelayNextMatchingRequestOptions = {
    /**
     * Expected request method.
     */
    readonly method: 'GET' | 'POST';
    /**
     * URL matcher for one targeted request.
     */
    readonly isMatchingUrl: (url: string) => boolean;
};

/**
 * Minimal management-agent payload needed by chat history navigation tests.
 */
type ManagementAgent = {
    /**
     * Canonical agent slug used in URLs and user-chat API routes.
     */
    readonly agentName: string;
    /**
     * Standalone chat route returned by the management API.
     */
    readonly chatUrl: string;
};

/**
 * Minimal seeded chat payload used by chat history navigation tests.
 */
type SeededChat = {
    /**
     * Durable user-chat identifier.
     */
    readonly id: string;
};

/**
 * Handle for one deliberately delayed `GET /api/user-chats?chat=...` request.
 */
type DelayedUserChatRequest = DelayedRequestControl;

/**
 * Handle for one deliberately delayed `POST /api/user-chats/[chatId]/messages` request.
 */
type DelayedUserChatMessageCreateRequest = DelayedRequestControl;

/**
 * Visible label used by the default profile/chat quick button fixture.
 */
const DEFAULT_QUICK_BUTTON_LABEL = 'Hello';

/**
 * Message payload emitted by the default profile/chat quick button fixture.
 */
const DEFAULT_QUICK_BUTTON_MESSAGE = 'Hello, can you tell me about yourself?';

/**
 * Deterministic composer message used by profile-to-chat routing coverage.
 */
const PROFILE_COMPOSER_MESSAGE = 'Hello from profile composer';

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
 * Creates one management API token for the authenticated browser session.
 *
 * @param page - Current Playwright page.
 * @returns Raw bearer token.
 */
async function createManagementApiToken(page: Page): Promise<string> {
    return page.evaluate(async () => {
        const response = await fetch('/api/api-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                note: 'E2E chat history navigation',
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to create management API token: ${response.status}`);
        }

        const payload = (await response.json()) as { token?: string };
        if (!payload.token) {
            throw new Error('Management API token response did not include `token`.');
        }

        return payload.token;
    });
}

/**
 * Creates one deterministic test agent through the management API.
 *
 * @param page - Current Playwright page.
 * @param apiKey - Bearer token used for the management API call.
 * @param label - Human-readable label used in the agent source.
 * @returns Canonical agent routing data.
 */
async function createTestAgent(page: Page, apiKey: string, label: string): Promise<ManagementAgent> {
    return page.evaluate(
        async ({ apiKey: token, label: displayName }) => {
            const source = `${displayName}\nPERSONA You help with regression tests.\nRULE Keep replies concise.`;
            const response = await fetch('/api/v1/agents', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source,
                    visibility: 'UNLISTED',
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create test agent: ${response.status}`);
            }

            const payload = (await response.json()) as {
                agent?: {
                    agentName?: string;
                    links?: {
                        chatUrl?: string;
                    };
                };
            };

            if (!payload.agent?.agentName || !payload.agent.links?.chatUrl) {
                throw new Error('Test agent response did not include chat routing data.');
            }

            return {
                agentName: payload.agent.agentName,
                chatUrl: payload.agent.links.chatUrl,
            };
        },
        { apiKey, label },
    );
}

/**
 * Creates one durable seeded chat with stable user/agent messages.
 *
 * @param page - Current Playwright page.
 * @param agentName - Canonical agent slug.
 * @param title - First user message used as chat title.
 * @returns Newly created chat identifier.
 */
async function createSeededChat(page: Page, agentName: string, title: string): Promise<SeededChat> {
    return page.evaluate(
        async ({ agentName: currentAgentName, title: currentTitle }) => {
            const now = new Date().toISOString();
            const safeId = currentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const payload = {
                messages: [
                    {
                        id: `user-${safeId}`,
                        sender: 'USER',
                        content: currentTitle,
                        createdAt: now,
                        isComplete: true,
                    },
                    {
                        id: `agent-${safeId}`,
                        sender: 'AGENT',
                        content: `Reply for ${currentTitle}`,
                        createdAt: now,
                        isComplete: true,
                    },
                ],
            };
            const response = await fetch(`/agents/${encodeURIComponent(currentAgentName)}/api/user-chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Failed to create seeded chat: ${response.status}`);
            }

            const chatDetail = (await response.json()) as { chat?: { id?: string } };
            if (!chatDetail.chat?.id) {
                throw new Error('Seeded chat response did not include `chat.id`.');
            }

            return { id: chatDetail.chat.id };
        },
        { agentName, title },
    );
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
 * Checks whether one network URL matches the targeted user-chat snapshot request.
 *
 * @param url - Network URL reported by Playwright.
 * @param agentName - Canonical agent slug.
 * @param chatId - Expected selected chat id.
 * @returns `true` when the URL represents `GET /agents/[agent]/api/user-chats?chat=[chatId]`.
 */
function isMatchingUserChatSnapshotRequest(url: string, agentName: string, chatId: string): boolean {
    const parsedUrl = new URL(url);
    const canonicalAgentPath = `/agents/${encodeURIComponent(agentName)}/api/user-chats`;
    const isUserChatsPath =
        parsedUrl.pathname === canonicalAgentPath || /^\/agents\/[^/]+\/api\/user-chats$/.test(parsedUrl.pathname);

    return isUserChatsPath && parsedUrl.searchParams.get('chat') === chatId;
}

/**
 * Checks whether one network URL matches the durable user-message creation endpoint.
 *
 * @param url - Network URL reported by Playwright.
 * @param agentName - Canonical agent slug.
 * @returns `true` when the URL represents `POST /agents/[agent]/api/user-chats/[chatId]/messages`.
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
 * Delays the next targeted user-chat snapshot request until the test explicitly releases it.
 *
 * @param page - Current Playwright page.
 * @param agentName - Canonical agent slug.
 * @param chatId - Targeted selected chat id.
 * @returns Control handle for the delayed request.
 */
async function delayNextUserChatSnapshotRequest(
    page: Page,
    agentName: string,
    chatId: string,
): Promise<DelayedUserChatRequest> {
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
async function delayNextUserChatMessageCreateRequest(
    page: Page,
    agentName: string,
): Promise<DelayedUserChatMessageCreateRequest> {
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
 * Chat-history navigation regressions for explicit user-selected chats.
 */
test.describe('Agents Server chat history navigation', () => {
    test('shows the first user message immediately as sending when starting a chat from the profile page', async ({
        page,
    }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await createManagementApiToken(page);
        const agent = await createTestAgent(page, apiKey, 'E2E Optimistic First Message');
        const delayedMessageCreate = await delayNextUserChatMessageCreateRequest(page, agent.agentName);

        await page.goto(
            `/agents/${encodeURIComponent(agent.agentName)}?message=${encodeURIComponent('Hello from profile page')}`,
        );
        const optimisticMessageBubble = page
            .locator('p')
            .filter({ hasText: /^Hello from profile page$/ })
            .first();

        await expect
            .poll(() => page.url(), {
                message: 'Expected profile-page send to navigate to the durable chat route.',
            })
            .toContain(`${agent.chatUrl}?chat=`);

        await expect(optimisticMessageBubble).toBeVisible();
        await expect(page.getByText('Sending', { exact: true })).toBeVisible();
        await expect(page.getByText(/Hello! I am /)).toBeVisible();

        await releaseDelayedRequestOrFail(
            page,
            delayedMessageCreate,
            'Expected delayed message-create request to finish after release.',
        );

        await expect(optimisticMessageBubble).toBeVisible();
        await expect(page.getByText('Sending', { exact: true })).toHaveCount(0, { timeout: 20_000 });
        await expect(page.getByText('Completed', { exact: true })).toBeVisible({ timeout: 20_000 });
    });

    test('navigates from the profile page when opening an existing chat preview card', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await createManagementApiToken(page);
        const agent = await createTestAgent(page, apiKey, 'E2E Profile My Chats Navigation');
        const existingChat = await createSeededChat(page, agent.agentName, 'Alpha seeded chat');

        await page.goto(`/agents/${encodeURIComponent(agent.agentName)}`);
        await expect(page.getByRole('link', { name: /Alpha seeded chat/i })).toBeVisible();

        await page.getByRole('link', { name: /Alpha seeded chat/i }).click();

        await expect
            .poll(() => readChatIdFromUrl(page.url()), {
                message: 'Expected clicking a profile My chats card to open the selected durable chat.',
            })
            .toBe(existingChat.id);
        await expect(page.getByText('Reply for Alpha seeded chat')).toBeVisible();
    });

    test('navigates from the profile page for quick buttons and composer sends', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await createManagementApiToken(page);
        const agent = await createTestAgent(page, apiKey, 'E2E Profile Entry Actions');

        const delayedQuickButtonSend = await delayNextUserChatMessageCreateRequest(page, agent.agentName);

        await page.goto(`/agents/${encodeURIComponent(agent.agentName)}`);
        await expect(page.getByRole('button', { name: DEFAULT_QUICK_BUTTON_LABEL })).toBeVisible();

        await page.getByRole('button', { name: DEFAULT_QUICK_BUTTON_LABEL }).click();

        await expect
            .poll(() => page.url(), {
                message: 'Expected clicking a profile quick button to navigate to the durable chat route.',
            })
            .toContain(`${agent.chatUrl}?chat=`);
        await expect(
            page
                .locator('p')
                .filter({ hasText: new RegExp(`^${escapeForRegExp(DEFAULT_QUICK_BUTTON_MESSAGE)}$`) })
                .first(),
        ).toBeVisible();
        await expect(page.getByText('Sending', { exact: true })).toBeVisible();

        await releaseDelayedRequestOrFail(
            page,
            delayedQuickButtonSend,
            'Expected delayed quick-button message-create request to finish after release.',
        );

        const delayedManualSend = await delayNextUserChatMessageCreateRequest(page, agent.agentName);

        await page.goto(`/agents/${encodeURIComponent(agent.agentName)}`);
        await expect(page.getByPlaceholder('Write a message...')).toBeVisible();
        await page.getByPlaceholder('Write a message...').fill(PROFILE_COMPOSER_MESSAGE);
        await page.locator('button[data-button-type="call-to-action"]').last().click();

        await expect
            .poll(() => page.url(), {
                message: 'Expected sending a profile composer message to navigate to the durable chat route.',
            })
            .toContain(`${agent.chatUrl}?chat=`);
        await expect(
            page.locator('p').filter({ hasText: new RegExp(`^${PROFILE_COMPOSER_MESSAGE}$`) }).first(),
        ).toBeVisible();
        await expect(page.getByText('Sending', { exact: true })).toBeVisible();

        await releaseDelayedRequestOrFail(
            page,
            delayedManualSend,
            'Expected delayed profile-composer message-create request to finish after release.',
        );
    });

    test('sends quick-button prompts from the durable chat page', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await createManagementApiToken(page);
        const agent = await createTestAgent(page, apiKey, 'E2E Chat Quick Button Send');
        const delayedMessageCreate = await delayNextUserChatMessageCreateRequest(page, agent.agentName);

        await page.goto(agent.chatUrl);
        await expect(page.getByRole('button', { name: DEFAULT_QUICK_BUTTON_LABEL })).toBeVisible();
        await expect
            .poll(() => page.url(), {
                message: 'Expected the durable chat page to select or create an active chat before sending.',
            })
            .toContain(`${agent.chatUrl}?chat=`);

        await page.getByRole('button', { name: DEFAULT_QUICK_BUTTON_LABEL }).click();

        await expect(
            page
                .locator('p')
                .filter({ hasText: new RegExp(`^${escapeForRegExp(DEFAULT_QUICK_BUTTON_MESSAGE)}$`) })
                .first(),
        ).toBeVisible();
        await expect(page.getByText('Sending', { exact: true })).toBeVisible();

        await releaseDelayedRequestOrFail(
            page,
            delayedMessageCreate,
            'Expected delayed chat quick-button message-create request to finish after release.',
        );
    });

    test('keeps the newly created chat selected after a delayed stale refresh and does not open a native dialog', async ({
        page,
    }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await createManagementApiToken(page);
        const agent = await createTestAgent(page, apiKey, 'E2E Chat Navigation New Chat');
        const firstChat = await createSeededChat(page, agent.agentName, 'Alpha seeded chat');
        await createSeededChat(page, agent.agentName, 'Bravo seeded chat');

        await page.goto(`${agent.chatUrl}?chat=${encodeURIComponent(firstChat.id)}`);
        await expect(page.getByRole('button', { name: 'New chat' }).nth(1)).toBeVisible();

        let sawNativeDialog = false;
        page.on('dialog', async (dialog) => {
            sawNativeDialog = true;
            await dialog.dismiss();
        });

        const delayedRefresh = await delayNextUserChatSnapshotRequest(page, agent.agentName, firstChat.id);

        await page.evaluate(() => {
            window.dispatchEvent(new Event('focus'));
        });
        await delayedRefresh.waitUntilStarted;

        await page.getByRole('button', { name: 'New chat' }).nth(1).click();

        await expect
            .poll(() => readChatIdFromUrl(page.url()), {
                message: 'Expected New chat to navigate away from the previously selected chat.',
            })
            .not.toBe(firstChat.id);

        const createdChatId = readChatIdFromUrl(page.url());
        expect(createdChatId).toBeTruthy();

        delayedRefresh.release();
        await delayedRefresh.waitUntilFinished;
        await delayedRefresh.dispose();

        await expect
            .poll(() => readChatIdFromUrl(page.url()), {
                message: 'Expected the delayed stale refresh to be ignored after New chat.',
            })
            .toBe(createdChatId);
        expect(sawNativeDialog).toBe(false);
    });

    test('keeps the last clicked chat selected when an earlier navigation response finishes later', async ({
        page,
    }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await createManagementApiToken(page);
        const agent = await createTestAgent(page, apiKey, 'E2E Chat Navigation Last Click Wins');
        const alphaChat = await createSeededChat(page, agent.agentName, 'Alpha history chat');
        const bravoChat = await createSeededChat(page, agent.agentName, 'Bravo history chat');
        const charlieChat = await createSeededChat(page, agent.agentName, 'Charlie history chat');

        await page.goto(`${agent.chatUrl}?chat=${encodeURIComponent(alphaChat.id)}`);
        await expect(page.getByRole('button', { name: /Bravo history chat/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Charlie history chat/i })).toBeVisible();

        const delayedBravoNavigation = await delayNextUserChatSnapshotRequest(page, agent.agentName, bravoChat.id);

        await page.getByRole('button', { name: /Bravo history chat/i }).click();
        await delayedBravoNavigation.waitUntilStarted;

        await page.getByRole('button', { name: /Charlie history chat/i }).click();
        await expect
            .poll(() => readChatIdFromUrl(page.url()), {
                message: 'Expected the second click to navigate to the later selected chat.',
            })
            .toBe(charlieChat.id);

        delayedBravoNavigation.release();
        await delayedBravoNavigation.waitUntilFinished;
        await delayedBravoNavigation.dispose();

        await expect
            .poll(() => readChatIdFromUrl(page.url()), {
                message: 'Expected the delayed earlier navigation to be discarded.',
            })
            .toBe(charlieChat.id);
    });
});

import { expect, test, type Page, type Route } from 'playwright/test';
import { loginAsAdmin } from './support/auth';

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
type DelayedUserChatRequest = {
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

    return (
        isUserChatsPath &&
        parsedUrl.searchParams.get('chat') === chatId
    );
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
    let hasInterceptedTargetRequest = false;
    let releaseRequest: (() => void) | null = null;
    let markStarted: (() => void) | null = null;

    const waitUntilStarted = new Promise<void>((resolve) => {
        markStarted = resolve;
    });
    const waitUntilFinished = page
        .waitForResponse((response) => {
            return (
                response.request().method() === 'GET' &&
                isMatchingUserChatSnapshotRequest(response.url(), agentName, chatId)
            );
        })
        .then(() => undefined);

    const routeHandler = async (route: Route) => {
        const request = route.request();
        if (
            hasInterceptedTargetRequest ||
            request.method() !== 'GET' ||
            !isMatchingUserChatSnapshotRequest(request.url(), agentName, chatId)
        ) {
            await route.continue();
            return;
        }

        hasInterceptedTargetRequest = true;
        markStarted?.();

        await new Promise<void>((resolve) => {
            releaseRequest = resolve;
        });

        await route.continue();
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
 * Chat-history navigation regressions for explicit user-selected chats.
 */
test.describe('Agents Server chat history navigation', () => {
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

    test('keeps the last clicked chat selected when an earlier navigation response finishes later', async ({ page }) => {
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

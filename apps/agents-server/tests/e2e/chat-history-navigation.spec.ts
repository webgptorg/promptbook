import { expect, test, type Page } from 'playwright/test';
import { loginAsAdmin } from './support/auth';
import { AgentManagementApi } from './support/AgentManagementApi';
import { ChatHistoryNavigationExpectation } from './support/ChatHistoryNavigationExpectation';
import { ChatHistoryNavigationSupport } from './support/ChatHistoryNavigationSupport';

/**
 * Note stored with management API tokens created for chat history navigation coverage.
 */
const CHAT_HISTORY_API_TOKEN_NOTE = 'E2E chat history navigation';

/**
 * Persona used by deterministic chat-history test agents.
 */
const CHAT_HISTORY_TEST_AGENT_PERSONA = 'You help with regression tests.';

/**
 * Rule used by deterministic chat-history test agents.
 */
const CHAT_HISTORY_TEST_AGENT_RULE = 'Keep replies concise.';

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
 * Expected HTTP status returned by accepted async message-create requests.
 */
const ACCEPTED_MESSAGE_CREATE_STATUS = 202;

/**
 * Creates one deterministic agent tailored for chat-history navigation coverage.
 *
 * @param page - Current Playwright page.
 * @param label - Human-readable label used in the agent source.
 * @param initialMessage - Optional configured initial message.
 * @returns Canonical agent routing data.
 */
async function createChatHistoryTestAgent(page: Page, label: string, initialMessage?: string) {
    const apiKey = await AgentManagementApi.createManagementApiToken(page, CHAT_HISTORY_API_TOKEN_NOTE);

    return AgentManagementApi.createTestAgent(page, apiKey, {
        label,
        persona: CHAT_HISTORY_TEST_AGENT_PERSONA,
        rule: CHAT_HISTORY_TEST_AGENT_RULE,
        initialMessage,
    });
}

/**
 * Chat-history navigation regressions for explicit user-selected chats.
 */
test.describe('Agents Server chat history navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);
    });

    test('renders the configured initial message on the profile page without a temporary hello fallback, even while profile loading is delayed', async ({
        page,
    }) => {
        const configuredInitialMessage = 'Configured initial message for delayed profile loading.';
        const agent = await createChatHistoryTestAgent(
            page,
            'E2E Profile Initial Message No Blink',
            configuredInitialMessage,
        );
        const delayedProfileRequest = await ChatHistoryNavigationSupport.delayNextAgentProfileRequest(
            page,
            agent.agentName,
        );

        await page.goto(`/agents/${encodeURIComponent(agent.agentName)}`, {
            waitUntil: 'domcontentloaded',
        });
        await delayedProfileRequest.waitUntilStarted;

        await expect(page.getByText(configuredInitialMessage, { exact: true })).toBeVisible();
        await expect(page.getByText(/Hello! I am /)).toHaveCount(0);

        await ChatHistoryNavigationSupport.releaseDelayedRequestOrFail(
            page,
            delayedProfileRequest,
            'Expected delayed agent-profile request to finish after release.',
        );

        await expect(page.getByText(configuredInitialMessage, { exact: true })).toBeVisible();
        await expect(page.getByText(/Hello! I am /)).toHaveCount(0);
    });

    test('shows the first user message immediately as sending when starting a chat from the profile page', async ({
        page,
    }) => {
        const agent = await createChatHistoryTestAgent(page, 'E2E Optimistic First Message');
        const delayedMessageCreate = await ChatHistoryNavigationSupport.delayNextUserChatMessageCreateRequest(
            page,
            agent.agentName,
        );

        await page.goto(
            `/agents/${encodeURIComponent(agent.agentName)}?message=${encodeURIComponent('Hello from profile page')}`,
        );
        const optimisticMessageBubble = page
            .locator('p')
            .filter({ hasText: /^Hello from profile page$/ })
            .first();

        await ChatHistoryNavigationExpectation.expectSelectedDurableChatUrl(
            page,
            agent,
            'Expected profile-page send to navigate to the durable chat route.',
        );

        await expect(optimisticMessageBubble).toBeVisible();
        await expect(page.getByText('Sending', { exact: true })).toBeVisible();
        await expect(page.getByText(/Hello! I am /)).toBeVisible();

        await ChatHistoryNavigationSupport.releaseDelayedRequestOrFail(
            page,
            delayedMessageCreate,
            'Expected delayed message-create request to finish after release.',
        );

        await expect(optimisticMessageBubble).toBeVisible();
        await expect(page.getByText('Sending', { exact: true })).toHaveCount(0, { timeout: 20_000 });
    });

    test('processes two rapid sends on a freshly created chat without a chat-not-found failure', async ({ page }) => {
        const agent = await createChatHistoryTestAgent(page, 'E2E Rapid Consecutive Sends');
        const delayedFirstMessageCreate = await ChatHistoryNavigationSupport.delayNextUserChatMessageCreateRequest(
            page,
            agent.agentName,
        );
        const dialogMessages: Array<string> = [];
        const messageCreateStatuses: Array<number> = [];

        page.on('dialog', async (dialog) => {
            dialogMessages.push(dialog.message());
            await dialog.dismiss();
        });
        page.on('response', (response) => {
            if (
                response.request().method() === 'POST' &&
                ChatHistoryNavigationSupport.isMatchingUserChatMessageCreateRequest(response.url(), agent.agentName)
            ) {
                messageCreateStatuses.push(response.status());
            }
        });

        await page.goto(
            `/agents/${encodeURIComponent(agent.agentName)}?message=${encodeURIComponent('First rapid message')}`,
        );
        await delayedFirstMessageCreate.waitUntilStarted;

        await ChatHistoryNavigationExpectation.expectPageUrlToContain(
            page,
            '/chat?chat=',
            'Expected the rapid-send regression to navigate to the durable chat route before the second send.',
        );

        const composer = page.locator('textarea.chat-input-textarea');
        await expect(composer).toBeVisible();
        await composer.fill('Second rapid message');
        await page.locator('button.chat-input-send-button').click({ force: true });

        await expect(
            page
                .locator('p')
                .filter({ hasText: /^Second rapid message$/ })
                .first(),
        ).toBeVisible();

        await ChatHistoryNavigationSupport.releaseDelayedRequestOrFail(
            page,
            delayedFirstMessageCreate,
            'Expected the delayed first message-create request to finish after release in the rapid-send regression.',
        );

        await expect
            .poll(() => messageCreateStatuses.length, {
                message: 'Expected both rapid-send message-create requests to complete.',
            })
            .toBe(2);

        expect(messageCreateStatuses).toEqual([ACCEPTED_MESSAGE_CREATE_STATUS, ACCEPTED_MESSAGE_CREATE_STATUS]);
        expect(dialogMessages).toEqual([]);
        await expect(page.getByText('Failed', { exact: true })).toHaveCount(0);
    });

    test('navigates from the profile page when opening an existing chat preview card', async ({ page }) => {
        const agent = await createChatHistoryTestAgent(page, 'E2E Profile My Chats Navigation');
        const existingChat = await AgentManagementApi.createSeededChat(page, agent.agentName, 'Alpha seeded chat');

        await page.goto(`/agents/${encodeURIComponent(agent.agentName)}`);
        await expect(page.getByRole('link', { name: /Alpha seeded chat/i })).toBeVisible();

        await page.getByRole('link', { name: /Alpha seeded chat/i }).click();

        await ChatHistoryNavigationExpectation.expectSelectedChatId(
            page,
            existingChat.id,
            'Expected clicking a profile My chats card to open the selected durable chat.',
        );
        await expect(
            page
                .locator('p')
                .filter({ hasText: /^Reply for Alpha seeded chat$/ })
                .first(),
        ).toBeVisible();
    });

    test('navigates from the profile page for quick buttons and composer sends', async ({ page }) => {
        const agent = await createChatHistoryTestAgent(page, 'E2E Profile Entry Actions');

        const delayedQuickButtonSend = await ChatHistoryNavigationSupport.delayNextUserChatMessageCreateRequest(
            page,
            agent.agentName,
        );

        await page.goto(`/agents/${encodeURIComponent(agent.agentName)}`);
        await expect(page.getByRole('button', { name: DEFAULT_QUICK_BUTTON_LABEL })).toBeVisible();

        await page.getByRole('button', { name: DEFAULT_QUICK_BUTTON_LABEL }).click();

        await ChatHistoryNavigationExpectation.expectSelectedDurableChatUrl(
            page,
            agent,
            'Expected clicking a profile quick button to navigate to the durable chat route.',
        );
        await expect(
            page
                .locator('p')
                .filter({
                    hasText: new RegExp(
                        `^${ChatHistoryNavigationSupport.escapeForRegExp(DEFAULT_QUICK_BUTTON_MESSAGE)}$`,
                    ),
                })
                .first(),
        ).toBeVisible();
        await expect(page.getByText('Sending', { exact: true })).toBeVisible();

        await ChatHistoryNavigationSupport.releaseDelayedRequestOrFail(
            page,
            delayedQuickButtonSend,
            'Expected delayed quick-button message-create request to finish after release.',
        );

        const delayedManualSend = await ChatHistoryNavigationSupport.delayNextUserChatMessageCreateRequest(
            page,
            agent.agentName,
        );

        await page.goto(`/agents/${encodeURIComponent(agent.agentName)}`);
        await expect(page.getByPlaceholder('Write a message...')).toBeVisible();
        await page.getByPlaceholder('Write a message...').fill(PROFILE_COMPOSER_MESSAGE);
        await page.locator('button[data-button-type="call-to-action"]').last().click();

        await ChatHistoryNavigationExpectation.expectSelectedDurableChatUrl(
            page,
            agent,
            'Expected sending a profile composer message to navigate to the durable chat route.',
        );
        await expect(
            page
                .locator('p')
                .filter({ hasText: new RegExp(`^${PROFILE_COMPOSER_MESSAGE}$`) })
                .first(),
        ).toBeVisible();
        await expect(page.getByText('Sending', { exact: true })).toBeVisible();

        await ChatHistoryNavigationSupport.releaseDelayedRequestOrFail(
            page,
            delayedManualSend,
            'Expected delayed profile-composer message-create request to finish after release.',
        );
    });

    test('sends quick-button prompts from the durable chat page', async ({ page }) => {
        const agent = await createChatHistoryTestAgent(page, 'E2E Chat Quick Button Send');
        const delayedMessageCreate = await ChatHistoryNavigationSupport.delayNextUserChatMessageCreateRequest(
            page,
            agent.agentName,
        );

        await page.goto(ChatHistoryNavigationSupport.buildAgentBrowserChatUrl(agent.agentName));
        await expect(page.getByRole('button', { name: DEFAULT_QUICK_BUTTON_LABEL })).toBeVisible();
        await ChatHistoryNavigationExpectation.expectSelectedDurableChatUrl(
            page,
            agent,
            'Expected the durable chat page to select or create an active chat before sending.',
        );

        await page.getByRole('button', { name: DEFAULT_QUICK_BUTTON_LABEL }).click();

        await expect(
            page
                .locator('p')
                .filter({
                    hasText: new RegExp(
                        `^${ChatHistoryNavigationSupport.escapeForRegExp(DEFAULT_QUICK_BUTTON_MESSAGE)}$`,
                    ),
                })
                .first(),
        ).toBeVisible();
        await expect(page.getByText('Sending', { exact: true })).toBeVisible();

        await ChatHistoryNavigationSupport.releaseDelayedRequestOrFail(
            page,
            delayedMessageCreate,
            'Expected delayed chat quick-button message-create request to finish after release.',
        );
    });

    test('keeps the newly created chat selected after a delayed stale refresh and does not open a native dialog', async ({
        page,
    }) => {
        const agent = await createChatHistoryTestAgent(page, 'E2E Chat Navigation New Chat');
        const firstChat = await AgentManagementApi.createSeededChat(page, agent.agentName, 'Alpha seeded chat');
        const secondChat = await AgentManagementApi.createSeededChat(page, agent.agentName, 'Bravo seeded chat');

        await page.goto(
            ChatHistoryNavigationSupport.buildAgentBrowserChatUrl(agent.agentName, { chatId: firstChat.id }),
        );
        const newChatLink = page.getByRole('link', { name: 'New chat' }).first();
        await expect(newChatLink).toBeVisible();

        let sawNativeDialog = false;
        page.on('dialog', async (dialog) => {
            sawNativeDialog = true;
            await dialog.dismiss();
        });

        const delayedRefresh = await ChatHistoryNavigationSupport.delayNextUserChatSnapshotRequest(
            page,
            agent.agentName,
            firstChat.id,
        );

        await ChatHistoryNavigationExpectation.dispatchWindowFocus(page);
        await delayedRefresh.waitUntilStarted;

        await newChatLink.click();

        await ChatHistoryNavigationExpectation.expectDifferentSelectedChatId(
            page,
            firstChat.id,
            'Expected New chat to navigate away from the previously selected chat.',
        );

        const createdChatId = ChatHistoryNavigationSupport.readChatIdFromUrl(page.url());
        expect(createdChatId).toBeTruthy();
        if (!createdChatId) {
            throw new Error('Expected New chat navigation to select a chat id.');
        }
        const createdChatWasInitiallyOptimistic = createdChatId?.startsWith('optimistic-user-chat:') === true;

        delayedRefresh.release();
        await delayedRefresh.waitUntilFinished;
        await delayedRefresh.dispose();

        if (createdChatWasInitiallyOptimistic) {
            await ChatHistoryNavigationExpectation.expectSelectedChatIdNotIn(
                page,
                [firstChat.id, secondChat.id],
                'Expected the delayed stale refresh to keep a newly created chat selected instead of any existing seeded chat.',
            );
        } else {
            await ChatHistoryNavigationExpectation.expectSelectedChatId(
                page,
                createdChatId,
                'Expected the delayed stale refresh to preserve the selected newly created chat.',
            );
        }
        expect(sawNativeDialog).toBe(false);
    });

    test('creates a fresh chat when the durable route is opened directly with ?chat=new', async ({ page }) => {
        const agent = await createChatHistoryTestAgent(page, 'E2E Chat Direct New Route');
        const firstChat = await AgentManagementApi.createSeededChat(page, agent.agentName, 'Alpha seeded chat');
        const secondChat = await AgentManagementApi.createSeededChat(page, agent.agentName, 'Bravo seeded chat');

        await page.goto(
            ChatHistoryNavigationSupport.buildAgentBrowserChatUrl(agent.agentName, { forceNewChat: true }),
            {
                waitUntil: 'domcontentloaded',
            },
        );

        const createdChatId = await ChatHistoryNavigationExpectation.expectFreshlyCreatedChatId(
            page,
            'Expected loading /chat?chat=new to create and select a fresh chat.',
        );

        expect(createdChatId).toBeTruthy();
        expect(createdChatId).not.toBe('new');
        expect(createdChatId).not.toBe(firstChat.id);
        expect(createdChatId).not.toBe(secondChat.id);
    });

    test('keeps the last clicked chat selected when an earlier navigation response finishes later', async ({
        page,
    }) => {
        const agent = await createChatHistoryTestAgent(page, 'E2E Chat Navigation Last Click Wins');
        const alphaChat = await AgentManagementApi.createSeededChat(page, agent.agentName, 'Alpha history chat');
        const bravoChat = await AgentManagementApi.createSeededChat(page, agent.agentName, 'Bravo history chat');
        const charlieChat = await AgentManagementApi.createSeededChat(page, agent.agentName, 'Charlie history chat');

        await page.goto(
            ChatHistoryNavigationSupport.buildAgentBrowserChatUrl(agent.agentName, { chatId: alphaChat.id }),
        );
        await expect(page.getByRole('button', { name: /Bravo history chat/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Charlie history chat/i })).toBeVisible();

        const delayedBravoNavigation = await ChatHistoryNavigationSupport.delayNextUserChatSnapshotRequest(
            page,
            agent.agentName,
            bravoChat.id,
        );

        await page.getByRole('button', { name: /Bravo history chat/i }).click();
        await delayedBravoNavigation.waitUntilStarted;

        await page.getByRole('button', { name: /Charlie history chat/i }).click();
        await ChatHistoryNavigationExpectation.expectSelectedChatId(
            page,
            charlieChat.id,
            'Expected the second click to navigate to the later selected chat.',
        );

        delayedBravoNavigation.release();
        await delayedBravoNavigation.waitUntilFinished;
        await delayedBravoNavigation.dispose();

        await ChatHistoryNavigationExpectation.expectSelectedChatId(
            page,
            charlieChat.id,
            'Expected the delayed earlier navigation to be discarded.',
        );
    });
});

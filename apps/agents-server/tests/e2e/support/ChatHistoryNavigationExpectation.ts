import { expect, type Page } from 'playwright/test';
import { ChatHistoryNavigationSupport } from './ChatHistoryNavigationSupport';

/**
 * Minimal management-agent payload needed by chat history navigation expectations.
 */
type ManagedAgentLike = {
    /**
     * Canonical browser-route slug and user-chat API identifier.
     *
     * @private internal utility of ChatHistoryNavigationExpectation
     */
    readonly agentName: string;
    /**
     * Stable standalone chat route returned by the management API.
     *
     * @private internal utility of ChatHistoryNavigationExpectation
     */
    readonly managementChatUrl: string;
};

/**
 * Waits until the current page URL contains one expected fragment.
 *
 * @param page - Current Playwright page.
 * @param urlFragment - URL fragment that should appear in the current page URL.
 * @param failureMessage - Error message used when the expected fragment never appears.
 */
async function expectPageUrlToContain(page: Page, urlFragment: string, failureMessage: string): Promise<void> {
    await expect
        .poll(() => page.url(), {
            message: failureMessage,
        })
        .toContain(urlFragment);
}

/**
 * Waits until the current page URL represents a selected durable chat for the target agent.
 *
 * @param page - Current Playwright page.
 * @param agent - Targeted management-agent payload.
 * @param failureMessage - Error message used when the durable chat route is never selected.
 */
async function expectSelectedDurableChatUrl(
    page: Page,
    agent: ManagedAgentLike,
    failureMessage: string,
): Promise<void> {
    await expect
        .poll(() => ChatHistoryNavigationSupport.isSelectedDurableAgentChatUrl(page.url(), agent), {
            message: failureMessage,
        })
        .toBe(true);
}

/**
 * Waits until the current page selects one expected chat id.
 *
 * @param page - Current Playwright page.
 * @param chatId - Expected durable chat identifier.
 * @param failureMessage - Error message used when the expected chat is never selected.
 */
async function expectSelectedChatId(page: Page, chatId: string, failureMessage: string): Promise<void> {
    await expect
        .poll(() => ChatHistoryNavigationSupport.readChatIdFromUrl(page.url()), {
            message: failureMessage,
        })
        .toBe(chatId);
}

/**
 * Waits until the current page stops selecting one chat id.
 *
 * @param page - Current Playwright page.
 * @param chatId - Durable chat identifier that should no longer be selected.
 * @param failureMessage - Error message used when the old chat remains selected.
 */
async function expectDifferentSelectedChatId(page: Page, chatId: string, failureMessage: string): Promise<void> {
    await expect
        .poll(() => ChatHistoryNavigationSupport.readChatIdFromUrl(page.url()), {
            message: failureMessage,
        })
        .not.toBe(chatId);
}

/**
 * Waits until the current page selects a chat id that is not in the excluded set.
 *
 * @param page - Current Playwright page.
 * @param chatIds - Durable chat identifiers that must not remain selected.
 * @param failureMessage - Error message used when the page keeps one of the excluded chat ids selected.
 */
async function expectSelectedChatIdNotIn(
    page: Page,
    chatIds: ReadonlyArray<string>,
    failureMessage: string,
): Promise<void> {
    await expect
        .poll(
            () => {
                const currentChatId = ChatHistoryNavigationSupport.readChatIdFromUrl(page.url());
                return currentChatId !== null && !chatIds.includes(currentChatId);
            },
            {
                message: failureMessage,
            },
        )
        .toBe(true);
}

/**
 * Waits until the current page creates and selects a durable chat instead of `?chat=new`.
 *
 * @param page - Current Playwright page.
 * @param failureMessage - Error message used when the durable chat id never appears.
 * @returns Newly selected durable chat id.
 */
async function expectFreshlyCreatedChatId(page: Page, failureMessage: string): Promise<string> {
    await expect
        .poll(
            () => {
                const currentChatId = ChatHistoryNavigationSupport.readChatIdFromUrl(page.url());
                return currentChatId && currentChatId !== 'new' ? currentChatId : null;
            },
            {
                message: failureMessage,
            },
        )
        .not.toBeNull();

    const createdChatId = ChatHistoryNavigationSupport.readChatIdFromUrl(page.url());
    if (!createdChatId || createdChatId === 'new') {
        throw new Error('Expected a durable chat id after creating a fresh chat.');
    }

    return createdChatId;
}

/**
 * Dispatches the window `focus` event from the current browser page.
 *
 * @param page - Current Playwright page.
 */
async function dispatchWindowFocus(page: Page): Promise<void> {
    await page.evaluate(() => {
        window.dispatchEvent(new Event('focus'));
    });
}

/**
 * Shared expectation helpers for chat-history navigation coverage.
 */
export const ChatHistoryNavigationExpectation = {
    expectPageUrlToContain,
    expectSelectedDurableChatUrl,
    expectSelectedChatId,
    expectDifferentSelectedChatId,
    expectSelectedChatIdNotIn,
    expectFreshlyCreatedChatId,
    dispatchWindowFocus,
};

import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import { join, relative } from 'path';
import type { Page } from 'playwright';
import { spaceTrim } from 'spacetrim';
import { REMOTE_BROWSER_URL } from '../../config';
import { $provideBrowserForServer } from './$provideBrowserForServer';

/**
 * Default browser session prefix used by the `run_browser` tool.
 */
const RUN_BROWSER_SESSION_PREFIX = 'agents-server-run-browser';

/**
 * Directory where browser snapshot artifacts are stored.
 */
const RUN_BROWSER_SNAPSHOT_DIRECTORY = '.playwright-cli';

/**
 * Default wait duration in milliseconds for `wait` actions.
 */
const DEFAULT_WAIT_MS = 1000;

/**
 * Maximum allowed wait duration in milliseconds.
 */
const MAX_WAIT_MS = 60000;

/**
 * Default scroll distance in pixels.
 */
const DEFAULT_SCROLL_PIXELS = 800;

/**
 * Supported action names for the `run_browser` tool.
 */
export type RunBrowserActionType = 'navigate' | 'click' | 'scroll' | 'type' | 'wait';

/**
 * Action payload accepted by the `run_browser` tool.
 */
export type RunBrowserAction = {
    /**
     * Action discriminator.
     */
    readonly type: RunBrowserActionType;

    /**
     * CSS selector for actions that target a DOM element.
     */
    readonly selector?: string;

    /**
     * Action-specific value:
     * - navigate: destination URL
     * - type: text
     * - wait: milliseconds
     * - scroll: pixel delta
     */
    readonly value?: string | number;
};

/**
 * Arguments accepted by the `run_browser` tool.
 */
export type RunBrowserArgs = {
    /**
     * Initial URL that the browser should open.
     */
    readonly url: string;

    /**
     * Optional list of browser actions.
     */
    readonly actions?: Array<RunBrowserAction>;
};

/**
 * Internal normalized action representation with validated fields.
 */
type NormalizedRunBrowserAction =
    | { readonly type: 'navigate'; readonly url: string }
    | { readonly type: 'click'; readonly selector: string }
    | { readonly type: 'scroll'; readonly selector: string | null; readonly pixels: number }
    | { readonly type: 'type'; readonly selector: string; readonly text: string }
    | { readonly type: 'wait'; readonly milliseconds: number };

/**
 * Execution mode used by the browser tool.
 */
type RunBrowserExecutionMode = 'local' | 'remote';

/**
 * Creates a dedicated session id for one tool invocation.
 */
function createRunBrowserSessionId(): string {
    return `${RUN_BROWSER_SESSION_PREFIX}-${randomUUID()}`;
}

/**
 * Determines whether the browser tool is running in local or remote mode.
 */
function resolveExecutionMode(): RunBrowserExecutionMode {
    return REMOTE_BROWSER_URL && REMOTE_BROWSER_URL.trim().length > 0 ? 'remote' : 'local';
}

/**
 * Converts the execution mode into a human-readable label.
 */
function formatExecutionMode(mode: RunBrowserExecutionMode): string {
    return mode === 'remote' ? 'remote-browser' : 'local-browser';
}

/**
 * Returns a POSIX-compatible relative path.
 */
function toPosixPath(pathname: string): string {
    return pathname.split('\\').join('/');
}

/**
 * Opens a new browser page and navigates to the requested URL.
 */
async function openPageWithUrl(url: string): Promise<Page> {
    const browserContext = await $provideBrowserForServer();
    const page = await browserContext.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    return page;
}

/**
 * Validates and normalizes browser actions received from the model.
 */
function normalizeActions(actions: ReadonlyArray<RunBrowserAction> | undefined): Array<NormalizedRunBrowserAction> {
    if (!actions || actions.length === 0) {
        return [];
    }

    return actions.map((action, index) => normalizeAction(action, index));
}

/**
 * Validates and normalizes a single action.
 */
function normalizeAction(action: RunBrowserAction, index: number): NormalizedRunBrowserAction {
    switch (action.type) {
        case 'navigate': {
            const url = String(action.value || '').trim();
            if (!url) {
                throw new Error(`Action ${index + 1}: "navigate" requires non-empty "value" URL.`);
            }
            return { type: 'navigate', url };
        }

        case 'click': {
            const selector = String(action.selector || '').trim();
            if (!selector) {
                throw new Error(`Action ${index + 1}: "click" requires non-empty "selector".`);
            }
            return { type: 'click', selector };
        }

        case 'type': {
            const selector = String(action.selector || '').trim();
            if (!selector) {
                throw new Error(`Action ${index + 1}: "type" requires non-empty "selector".`);
            }
            const text = String(action.value ?? '');
            return { type: 'type', selector, text };
        }

        case 'wait': {
            const requestedValue = Number.parseInt(String(action.value ?? DEFAULT_WAIT_MS), 10);
            const milliseconds = Number.isFinite(requestedValue)
                ? Math.min(Math.max(requestedValue, 1), MAX_WAIT_MS)
                : DEFAULT_WAIT_MS;
            return { type: 'wait', milliseconds };
        }

        case 'scroll': {
            const requestedValue = Number.parseInt(String(action.value ?? DEFAULT_SCROLL_PIXELS), 10);
            const pixels = Number.isFinite(requestedValue) ? requestedValue : DEFAULT_SCROLL_PIXELS;
            const rawSelector = String(action.selector || '').trim();
            return { type: 'scroll', selector: rawSelector || null, pixels };
        }
    }
}

/**
 * Executes one normalized browser action on a Playwright page.
 */
async function executeAction(page: Page, action: NormalizedRunBrowserAction): Promise<void> {
    switch (action.type) {
        case 'navigate':
            await page.goto(action.url, { waitUntil: 'domcontentloaded' });
            return;

        case 'click':
            await page.locator(action.selector).first().click();
            return;

        case 'type':
            await page.locator(action.selector).first().fill(action.text);
            return;

        case 'wait':
            await page.waitForTimeout(action.milliseconds);
            return;

        case 'scroll':
            if (action.selector) {
                await page.locator(action.selector).first().scrollIntoViewIfNeeded();
            }
            await page.mouse.wheel(0, action.pixels);
            return;
    }
}

/**
 * Captures a screenshot artifact for the current page and returns relative path.
 */
async function captureSnapshot(page: Page, sessionId: string): Promise<string | null> {
    const snapshotDirectoryPath = join(process.cwd(), RUN_BROWSER_SNAPSHOT_DIRECTORY);
    const snapshotPath = join(snapshotDirectoryPath, `${sessionId}.png`);

    try {
        await mkdir(snapshotDirectoryPath, { recursive: true });
        await page.screenshot({ path: snapshotPath, fullPage: true });
        return toPosixPath(relative(process.cwd(), snapshotPath));
    } catch (error) {
        console.error('[run_browser] Failed to capture snapshot', {
            sessionId,
            error: error instanceof Error ? error.message : String(error),
        });

        return null;
    }
}

/**
 * Safely retrieves page title from current browser page.
 */
async function getPageTitle(page: Page): Promise<string | null> {
    try {
        return await page.title();
    } catch {
        return null;
    }
}

/**
 * Closes browser page and logs non-fatal cleanup errors.
 */
async function cleanupPage(page: Page | null, sessionId: string): Promise<void> {
    if (!page) {
        return;
    }

    try {
        await page.close();
    } catch (error) {
        console.error('[run_browser] Failed to cleanup browser page', {
            sessionId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Produces a model-friendly markdown summary from browser execution artifacts.
 */
function formatSuccessResult(options: {
    readonly initialUrl: string;
    readonly sessionId: string;
    readonly mode: RunBrowserExecutionMode;
    readonly executedActions: ReadonlyArray<NormalizedRunBrowserAction>;
    readonly finalUrl: string | null;
    readonly finalTitle: string | null;
    readonly snapshotPath: string | null;
}): string {
    const { initialUrl, sessionId, mode, executedActions, finalUrl, finalTitle, snapshotPath } = options;

    return spaceTrim(
        (block) => `
            # Browser run completed

            **Session:** ${sessionId}
            **Mode:** ${formatExecutionMode(mode)}
            **Initial URL:** ${initialUrl}
            **Executed actions:** ${executedActions.length}

            ## Final page

            - URL: ${finalUrl || 'Unknown'}
            - Title: ${finalTitle || 'Unknown'}

            ${
                !snapshotPath
                    ? ''
                    : `
                    ## Final snapshot

                    ${snapshotPath}
                `
            }

            ${block(
                executedActions.length === 0
                    ? ''
                    : `
                    ## Action log

                    ${executedActions
                        .map((action, index) => `- ${index + 1}. ${JSON.stringify(action)}`)
                        .join('\n')}
                `,
            )}

            Note: Browser page has been automatically closed to free up resources.
        `,
    );
}

/**
 * Produces a model-friendly markdown error payload from browser execution failures.
 */
function formatErrorResult(options: {
    readonly url: string;
    readonly sessionId: string;
    readonly mode: RunBrowserExecutionMode;
    readonly error: unknown;
}): string {
    const { url, sessionId, error } = options;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;
    const remoteBrowserUrl = REMOTE_BROWSER_URL && REMOTE_BROWSER_URL.trim().length ? REMOTE_BROWSER_URL.trim() : 'not configured';

    return spaceTrim(`
        # Browser run failed

        **URL:** ${url}
        **Session:** ${sessionId}
        **Mode:** ${formatExecutionMode(options.mode)}
        **Environment:** Node ${process.version} (${process.platform}/${process.arch})${process.env.NODE_ENV ? ` • ${process.env.NODE_ENV}` : ''}
        **Remote browser URL:** ${remoteBrowserUrl}
        **Error:** ${errorMessage}

        ${
            errorStack
                ? `
                ## Error details

                ${errorStack}
            `
                : ''
        }

        The browser tool could not complete the requested actions.
        Please verify action arguments (selectors/values) or try a simpler interaction sequence.
    `);
}

/**
 * Runs interactive browser automation through Playwright.
 *
 * @param args Tool arguments provided by the model.
 * @returns Markdown summary with final page details and snapshot path.
 */
export async function run_browser(args: RunBrowserArgs): Promise<string> {
    const sessionId = createRunBrowserSessionId();
    const initialUrl = String(args.url || '').trim();
    const mode = resolveExecutionMode();

    if (!initialUrl) {
        return spaceTrim(`
            # Browser run failed

            **Error:** Missing required URL.
        `);
    }

    let page: Page | null = null;

    try {
        const normalizedActions = normalizeActions(args.actions);
        page = await openPageWithUrl(initialUrl);

        for (const action of normalizedActions) {
            await executeAction(page, action);
        }

        const snapshotPath = await captureSnapshot(page, sessionId);
        const finalUrl = page.url();
        const finalTitle = await getPageTitle(page);

        return formatSuccessResult({
            initialUrl,
            sessionId,
            mode,
            executedActions: normalizedActions,
            finalUrl,
            finalTitle,
            snapshotPath,
        });
    } catch (error) {
        return formatErrorResult({
            url: initialUrl,
            sessionId,
            mode,
            error,
        });
    } finally {
        await cleanupPage(page, sessionId);
    }
}

import { randomUUID } from 'crypto';
import { spaceTrim } from 'spacetrim';
import { $execCommand } from '../../../../src/utils/execCommand/$execCommand';

/**
 * Default browser session prefix used by the `run_browser` tool.
 */
const RUN_BROWSER_SESSION_PREFIX = 'agents-server-run-browser';

/**
 * Package used for invoking Playwright CLI commands.
 */
const PLAYWRIGHT_CLI_PACKAGE = '@playwright/cli';

/**
 * Command used to execute Playwright CLI.
 */
const PLAYWRIGHT_CLI_COMMAND = 'npx';

/**
 * Timeout for one Playwright CLI command in milliseconds.
 */
const PLAYWRIGHT_CLI_TIMEOUT_MS = 120000;

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
 * Creates a dedicated Playwright CLI session id for one tool invocation.
 */
function createRunBrowserSessionId(): string {
    return `${RUN_BROWSER_SESSION_PREFIX}-${randomUUID()}`;
}

/**
 * Executes one Playwright CLI command in a named session.
 */
async function runPlaywrightCli(sessionId: string, args: ReadonlyArray<string>): Promise<string> {
    return await $execCommand({
        command: PLAYWRIGHT_CLI_COMMAND,
        args: ['--no-install', PLAYWRIGHT_CLI_PACKAGE, `-s=${sessionId}`, ...args],
        timeout: PLAYWRIGHT_CLI_TIMEOUT_MS,
        isVerbose: false,
    });
}

/**
 * Returns first markdown snapshot link path from Playwright CLI output.
 */
function extractSnapshotPath(output: string): string | null {
    const match = output.match(/\[Snapshot\]\(([^)]+)\)/i);
    return match?.[1] ?? null;
}

/**
 * Returns page URL from Playwright CLI output when present.
 */
function extractPageUrl(output: string): string | null {
    const match = output.match(/- Page URL:\s*(.+)/i);
    return match?.[1]?.trim() ?? null;
}

/**
 * Returns page title from Playwright CLI output when present.
 */
function extractPageTitle(output: string): string | null {
    const match = output.match(/- Page Title:\s*(.+)/i);
    return match?.[1]?.trim() ?? null;
}

/**
 * Opens a headed browser session and navigates to the requested URL.
 */
async function ensureSessionAndOpenUrl(sessionId: string, url: string): Promise<string> {
    return await runPlaywrightCli(sessionId, ['open', url, '--headed']);
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
 * Encodes action payload for safe transport through a single CLI argument.
 */
function encodeAction(action: NormalizedRunBrowserAction): string {
    return Buffer.from(JSON.stringify(action), 'utf8').toString('base64');
}

/**
 * Builds Playwright `run-code` snippet for one normalized action.
 */
function createRunCodeForAction(action: NormalizedRunBrowserAction): string {
    const encodedAction = encodeAction(action);

    return [
        `const action=JSON.parse(Buffer.from('${encodedAction}','base64').toString('utf8'));`,
        `if(action.type==='navigate'){await page.goto(action.url,{waitUntil:'domcontentloaded'});}`,
        `else if(action.type==='click'){await page.locator(action.selector).first().click();}`,
        `else if(action.type==='type'){await page.locator(action.selector).first().fill(action.text);}`,
        `else if(action.type==='wait'){await page.waitForTimeout(action.milliseconds);}`,
        `else if(action.type==='scroll'){`,
        `if(action.selector){await page.locator(action.selector).first().scrollIntoViewIfNeeded();}`,
        `await page.mouse.wheel(0,action.pixels);`,
        `}`,
    ].join('');
}

/**
 * Executes one action in Playwright CLI session.
 */
async function executeAction(sessionId: string, action: NormalizedRunBrowserAction): Promise<string> {
    return await runPlaywrightCli(sessionId, ['run-code', createRunCodeForAction(action)]);
}

/**
 * Produces a model-friendly markdown summary from browser execution artifacts.
 */
function formatSuccessResult(options: {
    readonly initialUrl: string;
    readonly sessionId: string;
    readonly executedActions: ReadonlyArray<NormalizedRunBrowserAction>;
    readonly finalOutput: string;
    readonly snapshotPath: string | null;
}): string {
    const { initialUrl, sessionId, executedActions, finalOutput, snapshotPath } = options;
    const finalUrl = extractPageUrl(finalOutput);
    const finalTitle = extractPageTitle(finalOutput);

    return spaceTrim(
        (block) => `
            # Browser run completed

            **Session:** ${sessionId}
            **Mode:** headed
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

            Note: This browser session remains open for debugging.
            If needed, close it with:
            \`npx @playwright/cli -s=${sessionId} close\`
        `,
    );
}

/**
 * Produces a model-friendly markdown error payload from browser execution failures.
 */
function formatErrorResult(options: {
    readonly url: string;
    readonly sessionId: string;
    readonly error: unknown;
}): string {
    const { url, sessionId, error } = options;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return spaceTrim(`
        # Browser run failed

        **URL:** ${url}
        **Session:** ${sessionId}
        **Error:** ${errorMessage}

        The browser tool could not complete the requested actions.
        Please verify action arguments (selectors/values) or try a simpler interaction sequence.
    `);
}

/**
 * Runs interactive browser automation through Playwright CLI in headed mode.
 *
 * @param args Tool arguments provided by the model.
 * @returns Markdown summary with final page details and snapshot path.
 */
export async function run_browser(args: RunBrowserArgs): Promise<string> {
    const sessionId = createRunBrowserSessionId();
    const initialUrl = String(args.url || '').trim();

    if (!initialUrl) {
        return spaceTrim(`
            # Browser run failed

            **Error:** Missing required URL.
        `);
    }

    try {
        const normalizedActions = normalizeActions(args.actions);

        await ensureSessionAndOpenUrl(sessionId, initialUrl);

        for (const action of normalizedActions) {
            await executeAction(sessionId, action);
        }

        const finalOutput = await runPlaywrightCli(sessionId, ['snapshot']);
        const snapshotPath = extractSnapshotPath(finalOutput);

        return formatSuccessResult({
            initialUrl,
            sessionId,
            executedActions: normalizedActions,
            finalOutput,
            snapshotPath,
        });
    } catch (error) {
        return formatErrorResult({
            url: initialUrl,
            sessionId,
            error,
        });
    }
}

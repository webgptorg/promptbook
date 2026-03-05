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
 * Schema marker embedded into `run_browser` successful payloads.
 */
const RUN_BROWSER_RESULT_SCHEMA = 'promptbook/run-browser@1';

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
 * Browser artifact kind captured during one run.
 */
type RunBrowserArtifactKind = 'screenshot' | 'video';

/**
 * One captured visual artifact with context for replay in UI.
 */
type RunBrowserArtifact = {
    readonly kind: RunBrowserArtifactKind;
    readonly label: string;
    readonly path: string;
    readonly capturedAt: string;
    readonly url: string | null;
    readonly title: string | null;
    readonly actionIndex?: number;
    readonly actionSummary?: string;
};

/**
 * Structured playback payload embedded in successful tool result markdown.
 */
type RunBrowserSuccessPayload = {
    readonly schema: typeof RUN_BROWSER_RESULT_SCHEMA;
    readonly sessionId: string;
    readonly mode: RunBrowserExecutionMode;
    readonly initialUrl: string;
    readonly finalUrl: string | null;
    readonly finalTitle: string | null;
    readonly executedActions: ReadonlyArray<NormalizedRunBrowserAction>;
    readonly artifacts: ReadonlyArray<RunBrowserArtifact>;
};

/**
 * Options for capturing one screenshot artifact.
 */
type CaptureSnapshotArtifactOptions = {
    readonly page: Page;
    readonly sessionId: string;
    readonly label: string;
    readonly fileSuffix?: string;
    readonly actionIndex?: number;
    readonly action?: NormalizedRunBrowserAction;
};

/**
 * Matches unsupported characters in snapshot file suffixes.
 */
const SNAPSHOT_FILE_SUFFIX_UNSAFE_CHARACTER_PATTERN = /[^a-z0-9-]/g;

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
 * Creates one filesystem-safe optional filename suffix for a snapshot.
 */
function createSnapshotFileSuffix(rawSuffix?: string): string {
    if (!rawSuffix) {
        return '';
    }

    const normalized = rawSuffix
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(SNAPSHOT_FILE_SUFFIX_UNSAFE_CHARACTER_PATTERN, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return normalized;
}

/**
 * Resolves snapshot filename for one session and optional stage suffix.
 */
function resolveSnapshotFilename(sessionId: string, fileSuffix?: string): string {
    const safeSuffix = createSnapshotFileSuffix(fileSuffix);
    return safeSuffix ? `${sessionId}-${safeSuffix}.png` : `${sessionId}.png`;
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
async function captureSnapshot(page: Page, sessionId: string, fileSuffix?: string): Promise<string | null> {
    const snapshotDirectoryPath = join(process.cwd(), RUN_BROWSER_SNAPSHOT_DIRECTORY);
    const snapshotPath = join(snapshotDirectoryPath, resolveSnapshotFilename(sessionId, fileSuffix));

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
 * Creates one user-facing description for an executed browser action.
 */
function formatActionSummary(action: NormalizedRunBrowserAction): string {
    switch (action.type) {
        case 'navigate':
            return `Navigate to ${action.url}`;
        case 'click':
            return `Click ${action.selector}`;
        case 'type':
            return `Type into ${action.selector}`;
        case 'wait':
            return `Wait ${action.milliseconds}ms`;
        case 'scroll':
            return action.selector
                ? `Scroll ${action.pixels}px in ${action.selector}`
                : `Scroll ${action.pixels}px on page`;
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
 * Captures one screenshot artifact and enriches it with page metadata.
 */
async function captureSnapshotArtifact(options: CaptureSnapshotArtifactOptions): Promise<RunBrowserArtifact | null> {
    const { page, sessionId, label, fileSuffix, actionIndex, action } = options;
    const path = await captureSnapshot(page, sessionId, fileSuffix);
    if (!path) {
        return null;
    }

    const actionSummary = action ? formatActionSummary(action) : undefined;

    return {
        kind: 'screenshot',
        label,
        path,
        capturedAt: new Date().toISOString(),
        url: page.url(),
        title: await getPageTitle(page),
        actionIndex,
        actionSummary,
    };
}

/**
 * Produces one structured success payload consumed by the chat UI replay renderer.
 */
function createSuccessPayload(options: {
    readonly sessionId: string;
    readonly mode: RunBrowserExecutionMode;
    readonly initialUrl: string;
    readonly executedActions: ReadonlyArray<NormalizedRunBrowserAction>;
    readonly finalUrl: string | null;
    readonly finalTitle: string | null;
    readonly artifacts: ReadonlyArray<RunBrowserArtifact>;
}): RunBrowserSuccessPayload {
    return {
        schema: RUN_BROWSER_RESULT_SCHEMA,
        sessionId: options.sessionId,
        mode: options.mode,
        initialUrl: options.initialUrl,
        finalUrl: options.finalUrl,
        finalTitle: options.finalTitle,
        executedActions: options.executedActions,
        artifacts: options.artifacts,
    };
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
    readonly artifacts: ReadonlyArray<RunBrowserArtifact>;
}): string {
    const { initialUrl, sessionId, mode, executedActions, finalUrl, finalTitle, snapshotPath, artifacts } = options;
    const successPayload = createSuccessPayload({
        sessionId,
        mode,
        initialUrl,
        executedActions,
        finalUrl,
        finalTitle,
        artifacts,
    });

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
                artifacts.length === 0
                    ? ''
                    : `
                    ## Visual replay

                    ${artifacts
                        .map((artifact, index) => {
                            const actionPart = artifact.actionSummary ? ` (${artifact.actionSummary})` : '';
                            return `- ${index + 1}. ${artifact.label}${actionPart}: ${artifact.path}`;
                        })
                        .join('\n')}
                `
            }

            ${
                !snapshotPath
                    ? ''
                    : `
                    ## Final snapshot

                    ${snapshotPath}
                `
            }

            ## Playback payload

            \`\`\`json
            ${JSON.stringify(successPayload, null, 2)}
            \`\`\`

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
        const artifacts: Array<RunBrowserArtifact> = [];

        const initialArtifact = await captureSnapshotArtifact({
            page,
            sessionId,
            label: 'Initial page',
            fileSuffix: 'initial',
        });
        if (initialArtifact) {
            artifacts.push(initialArtifact);
        }

        for (const [index, action] of normalizedActions.entries()) {
            await executeAction(page, action);

            const actionArtifact = await captureSnapshotArtifact({
                page,
                sessionId,
                label: `After action ${index + 1}`,
                fileSuffix: `action-${String(index + 1).padStart(3, '0')}-${action.type}`,
                actionIndex: index + 1,
                action,
            });
            if (actionArtifact) {
                artifacts.push(actionArtifact);
            }
        }

        const snapshotPath = await captureSnapshot(page, sessionId);
        const finalUrl = page.url();
        const finalTitle = await getPageTitle(page);
        if (snapshotPath) {
            artifacts.push({
                kind: 'screenshot',
                label: 'Final page',
                path: snapshotPath,
                capturedAt: new Date().toISOString(),
                url: finalUrl,
                title: finalTitle,
            });
        }

        return formatSuccessResult({
            initialUrl,
            sessionId,
            mode,
            executedActions: normalizedActions,
            finalUrl,
            finalTitle,
            snapshotPath,
            artifacts,
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

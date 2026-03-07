import type { Page, Response as PlaywrightResponse } from 'playwright';
import { spaceTrim } from 'spacetrim';
import type {
    NormalizedRunBrowserAction,
    OpenPageWithUrlResult,
    RunBrowserAction,
    RunBrowserTimeoutConfiguration,
} from './RunBrowserArgs';
import { $provideBrowserForServer } from './$provideBrowserForServer';
import { runBrowserConstants } from './runBrowserConstants';
import { runBrowserErrorHandling } from './runBrowserErrorHandling';

/**
 * Attempts to compute time-to-first-byte from Playwright response timing.
 */
function resolveTimeToFirstByteMs(response: PlaywrightResponse | null): number | null {
    if (!response) {
        return null;
    }

    try {
        const timing = response.request().timing();
        if (
            typeof timing?.responseStart === 'number' &&
            typeof timing?.startTime === 'number' &&
            timing.responseStart >= timing.startTime
        ) {
            return Math.round(timing.responseStart - timing.startTime);
        }
    } catch {
        return null;
    }

    return null;
}

/**
 * Page open, action normalization and action execution helpers for `run_browser`.
 *
 * @private function of `run_browser`
 */
export const runBrowserWorkflow = {
    /**
     * Opens a new browser page and navigates to the requested URL.
     */
    async openPageWithUrl(options: {
        readonly url: string;
        readonly sessionId: string;
        readonly timeouts: RunBrowserTimeoutConfiguration;
        readonly signal?: AbortSignal;
    }): Promise<OpenPageWithUrlResult> {
        runBrowserErrorHandling.assertNotAborted(options.signal, options.sessionId);

        const connectStartedAt = Date.now();
        const browserContext = await $provideBrowserForServer({
            signal: options.signal,
            sessionId: options.sessionId,
        });
        const connectDurationMs = Date.now() - connectStartedAt;
        const page = await browserContext.newPage();
        page.setDefaultNavigationTimeout(options.timeouts.navigationTimeoutMs);
        page.setDefaultTimeout(options.timeouts.actionTimeoutMs);

        const navigationStartedAt = Date.now();
        try {
            const navigationResponse = await page.goto(options.url, {
                waitUntil: 'domcontentloaded',
                timeout: options.timeouts.navigationTimeoutMs,
            });

            return {
                page,
                connectDurationMs,
                initialNavigationDurationMs: Date.now() - navigationStartedAt,
                timeToFirstByteMs: resolveTimeToFirstByteMs(navigationResponse),
            };
        } catch (error) {
            throw runBrowserErrorHandling.createRunBrowserNavigationError({
                message: `Failed to navigate to \`${options.url}\`.`,
                debug: {
                    phase: 'initial-navigation',
                    url: options.url,
                    navigationTimeoutMs: options.timeouts.navigationTimeoutMs,
                },
                cause: error,
            });
        }
    },

    /**
     * Validates and normalizes browser actions received from the model.
     */
    normalizeActions(actions: ReadonlyArray<RunBrowserAction> | undefined): Array<NormalizedRunBrowserAction> {
        if (!actions || actions.length === 0) {
            return [];
        }

        return actions.map((action, index) => this.normalizeAction(action, index));
    },

    /**
     * Validates and normalizes a single action.
     */
    normalizeAction(action: RunBrowserAction, index: number): NormalizedRunBrowserAction {
        switch (action.type) {
            case 'navigate': {
                const url = String(action.value || '').trim();
                if (!url) {
                    throw runBrowserErrorHandling.createRunBrowserValidationError({
                        message: spaceTrim(`Action ${index + 1}: \`navigate\` requires non-empty \`value\` URL.`),
                        debug: {
                            actionIndex: index + 1,
                            actionType: action.type,
                        },
                    });
                }
                return { type: 'navigate', url };
            }

            case 'click': {
                const selector = String(action.selector || '').trim();
                if (!selector) {
                    throw runBrowserErrorHandling.createRunBrowserValidationError({
                        message: spaceTrim(`Action ${index + 1}: \`click\` requires non-empty \`selector\`.`),
                        debug: {
                            actionIndex: index + 1,
                            actionType: action.type,
                        },
                    });
                }
                return { type: 'click', selector };
            }

            case 'type': {
                const selector = String(action.selector || '').trim();
                if (!selector) {
                    throw runBrowserErrorHandling.createRunBrowserValidationError({
                        message: spaceTrim(`Action ${index + 1}: \`type\` requires non-empty \`selector\`.`),
                        debug: {
                            actionIndex: index + 1,
                            actionType: action.type,
                        },
                    });
                }
                const text = String(action.value ?? '');
                return { type: 'type', selector, text };
            }

            case 'wait': {
                const requestedValue = Number.parseInt(String(action.value ?? runBrowserConstants.defaultWaitMs), 10);
                const milliseconds = Number.isFinite(requestedValue)
                    ? Math.min(Math.max(requestedValue, 1), runBrowserConstants.maxWaitMs)
                    : runBrowserConstants.defaultWaitMs;
                return { type: 'wait', milliseconds };
            }

            case 'scroll': {
                const requestedValue = Number.parseInt(
                    String(action.value ?? runBrowserConstants.defaultScrollPixels),
                    10,
                );
                const pixels = Number.isFinite(requestedValue) ? requestedValue : runBrowserConstants.defaultScrollPixels;
                const rawSelector = String(action.selector || '').trim();
                return { type: 'scroll', selector: rawSelector || null, pixels };
            }
        }
    },

    /**
     * Executes one normalized browser action on a Playwright page.
     */
    async executeAction(options: {
        readonly page: Page;
        readonly action: NormalizedRunBrowserAction;
        readonly actionIndex: number;
        readonly timeouts: RunBrowserTimeoutConfiguration;
        readonly signal?: AbortSignal;
    }): Promise<void> {
        const { page, action, actionIndex, timeouts, signal } = options;
        runBrowserErrorHandling.assertNotAborted(signal, `action-${actionIndex}`);

        try {
            switch (action.type) {
                case 'navigate':
                    await page.goto(action.url, {
                        waitUntil: 'domcontentloaded',
                        timeout: timeouts.navigationTimeoutMs,
                    });
                    return;

                case 'click':
                    await page.locator(action.selector).first().click({ timeout: timeouts.actionTimeoutMs });
                    return;

                case 'type':
                    await page.locator(action.selector).first().fill(action.text, { timeout: timeouts.actionTimeoutMs });
                    return;

                case 'wait':
                    if (action.milliseconds > timeouts.actionTimeoutMs) {
                        throw runBrowserErrorHandling.createRunBrowserActionError({
                            message: `Action ${actionIndex}: \`wait\` exceeds action timeout (${timeouts.actionTimeoutMs}ms).`,
                            debug: {
                                actionIndex,
                                action,
                                actionTimeoutMs: timeouts.actionTimeoutMs,
                            },
                        });
                    }
                    await page.waitForTimeout(action.milliseconds);
                    return;

                case 'scroll':
                    if (action.selector) {
                        await page
                            .locator(action.selector)
                            .first()
                            .scrollIntoViewIfNeeded({ timeout: timeouts.actionTimeoutMs });
                    }
                    await page.mouse.wheel(0, action.pixels);
                    return;
            }
        } catch (error) {
            if (runBrowserErrorHandling.isTaggedRunBrowserError(error)) {
                throw error;
            }

            if (action.type === 'navigate') {
                throw runBrowserErrorHandling.createRunBrowserNavigationError({
                    message: `Action ${actionIndex}: failed to navigate to \`${action.url}\`.`,
                    debug: {
                        actionIndex,
                        action,
                        navigationTimeoutMs: timeouts.navigationTimeoutMs,
                    },
                    cause: error,
                });
            }

            throw runBrowserErrorHandling.createRunBrowserActionError({
                message: `Action ${actionIndex}: failed to execute \`${action.type}\`.`,
                debug: {
                    actionIndex,
                    action,
                    actionTimeoutMs: timeouts.actionTimeoutMs,
                },
                cause: error,
            });
        }
    },
};

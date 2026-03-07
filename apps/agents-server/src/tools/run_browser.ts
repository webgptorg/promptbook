import { fetchUrlContent } from '../../../../src/commitments/USE_BROWSER/fetchUrlContent';
import type { Page } from 'playwright';
import type { RunBrowserInternalOptions } from './RunBrowserArgs';
import { runBrowserArtifacts } from './runBrowserArtifacts';
import { runBrowserConstants } from './runBrowserConstants';
import { runBrowserErrorHandling } from './runBrowserErrorHandling';
import { runBrowserObservability } from './runBrowserObservability';
import { runBrowserResultFormatting } from './runBrowserResultFormatting';
import { runBrowserRuntime } from './runBrowserRuntime';
import { runBrowserWorkflow } from './runBrowserWorkflow';

export type { RunBrowserActionType, RunBrowserAction, RunBrowserArgs } from './RunBrowserArgs';
import type { RunBrowserArgs, RunBrowserArtifact } from './RunBrowserArgs';

/**
 * Executes non-graphical fallback scraping.
 */
async function runFallbackScrape(url: string): Promise<string> {
    return await fetchUrlContent(url);
}

/**
 * Runs interactive browser automation through Playwright.
 *
 * @param args Tool arguments provided by the model.
 * @param internalOptions Optional runtime options for cancellation.
 * @returns Markdown summary with structured playback payload.
 */
export async function run_browser(args: RunBrowserArgs, internalOptions: RunBrowserInternalOptions = {}): Promise<string> {
    runBrowserObservability.incrementTotalRuns();

    const startedAt = Date.now();
    const sessionId = runBrowserRuntime.createRunBrowserSessionId();
    const initialUrl = String(args.url || '').trim();
    const mode = runBrowserRuntime.resolveExecutionMode();
    const timeoutConfiguration = runBrowserRuntime.resolveTimeoutConfiguration(args.timeouts);

    let page: Page | null = null;
    let connectDurationMs: number | null = null;
    let initialNavigationDurationMs: number | null = null;
    let timeToFirstByteMs: number | null = null;

    try {
        if (!initialUrl) {
            throw runBrowserErrorHandling.createRunBrowserValidationError({
                message: 'Missing required `url` argument.',
                debug: {
                    field: 'url',
                },
            });
        }

        const normalizedActions = runBrowserWorkflow.normalizeActions(args.actions);
        runBrowserErrorHandling.assertNotAborted(internalOptions.signal, sessionId);

        const openedPage = await runBrowserWorkflow.openPageWithUrl({
            url: initialUrl,
            sessionId,
            timeouts: timeoutConfiguration,
            signal: internalOptions.signal,
        });
        page = openedPage.page;
        connectDurationMs = openedPage.connectDurationMs;
        initialNavigationDurationMs = openedPage.initialNavigationDurationMs;
        timeToFirstByteMs = openedPage.timeToFirstByteMs;

        const artifacts: Array<RunBrowserArtifact> = [];

        const initialArtifact = await runBrowserArtifacts.captureSnapshotArtifact({
            page,
            sessionId,
            label: 'Initial page',
            fileSuffix: 'initial',
        });
        if (initialArtifact) {
            artifacts.push(initialArtifact);
        }

        for (const [index, action] of normalizedActions.entries()) {
            runBrowserErrorHandling.assertNotAborted(internalOptions.signal, sessionId);
            await runBrowserWorkflow.executeAction({
                page,
                action,
                actionIndex: index + 1,
                timeouts: timeoutConfiguration,
                signal: internalOptions.signal,
            });

            const actionArtifact = await runBrowserArtifacts.captureSnapshotArtifact({
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

        const snapshotPath = await runBrowserArtifacts.captureSnapshot(page, sessionId);
        const finalUrl = page.url();
        const finalTitle = await runBrowserArtifacts.getPageTitle(page);
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

        const payload = runBrowserResultFormatting.createResultPayload({
            sessionId,
            mode,
            modeUsed: 'remote-browser',
            initialUrl,
            finalUrl,
            finalTitle,
            executedActions: normalizedActions,
            artifacts,
            warning: null,
            error: null,
            fallbackContent: null,
            timing: {
                connectDurationMs,
                initialNavigationDurationMs,
                timeToFirstByteMs,
                totalDurationMs: Date.now() - startedAt,
            },
        });

        runBrowserObservability.logRunBrowserMetric({
            event: 'run_browser_success',
            sessionId,
            mode: 'remote-browser',
            payload: {
                actions: normalizedActions.length,
                connectDurationMs,
                initialNavigationDurationMs,
                timeToFirstByteMs,
            },
        });

        return runBrowserResultFormatting.formatSuccessResult({
            payload,
            snapshotPath,
        });
    } catch (error) {
        const toolError = runBrowserErrorHandling.classifyRunBrowserToolError({
            error,
            sessionId,
            mode,
        });
        const errorCodeCount = runBrowserObservability.incrementRunBrowserErrorCodeCounter(toolError.code);

        if (runBrowserErrorHandling.isRemoteBrowserUnavailableCode(toolError.code) && initialUrl) {
            const fallbackContent = await runFallbackScrape(initialUrl);
            const { fallbackRuns, fallbackRate } = runBrowserObservability.incrementFallbackRunsAndGetMetrics();

            const payload = runBrowserResultFormatting.createResultPayload({
                sessionId,
                mode,
                modeUsed: 'fallback',
                initialUrl,
                finalUrl: null,
                finalTitle: null,
                executedActions: [],
                artifacts: [],
                warning: runBrowserConstants.fallbackDynamicContentWarning,
                error: toolError,
                fallbackContent,
                timing: {
                    connectDurationMs,
                    initialNavigationDurationMs,
                    timeToFirstByteMs,
                    totalDurationMs: Date.now() - startedAt,
                },
            });

            runBrowserObservability.logRunBrowserMetric({
                event: 'run_browser_fallback_used',
                sessionId,
                mode: 'fallback',
                payload: {
                    errorCode: toolError.code,
                    errorCodeCount,
                    fallbackRuns,
                    totalRuns: runBrowserObservability.getTotalRuns(),
                    fallbackRate,
                },
            });

            return runBrowserResultFormatting.formatFallbackResult({
                payload,
                fallbackContent,
                requestedActions: Array.isArray(args.actions) ? args.actions.length : 0,
            });
        }

        const payload = runBrowserResultFormatting.createResultPayload({
            sessionId,
            mode,
            modeUsed: 'remote-browser',
            initialUrl,
            finalUrl: page ? page.url() : null,
            finalTitle: page ? await runBrowserArtifacts.getPageTitle(page) : null,
            executedActions: [],
            artifacts: [],
            warning: null,
            error: toolError,
            fallbackContent: null,
            timing: {
                connectDurationMs,
                initialNavigationDurationMs,
                timeToFirstByteMs,
                totalDurationMs: Date.now() - startedAt,
            },
        });

        runBrowserObservability.logRunBrowserMetric({
            event: 'run_browser_failed',
            sessionId,
            mode: 'remote-browser',
            payload: {
                errorCode: toolError.code,
                errorCodeCount,
                connectDurationMs,
                initialNavigationDurationMs,
                timeToFirstByteMs,
            },
        });

        return runBrowserResultFormatting.formatErrorResult({
            payload,
        });
    } finally {
        await runBrowserArtifacts.cleanupPage(page, sessionId);
    }
}

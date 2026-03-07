import { spaceTrim } from 'spacetrim';
import type {
    NormalizedRunBrowserAction,
    RunBrowserArtifact,
    RunBrowserExecutionMode,
    RunBrowserModeUsed,
    RunBrowserResultPayload,
} from './RunBrowserArgs';
import type { RunBrowserToolError } from './runBrowserErrors';
import { runBrowserConstants } from './runBrowserConstants';
import { runBrowserRuntime } from './runBrowserRuntime';

/**
 * Computes one compact preview of a fallback scrape payload.
 */
function createContentPreview(content: string): string {
    const normalized = content.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 280) {
        return normalized;
    }
    return `${normalized.slice(0, 277)}...`;
}

/**
 * Payload and markdown formatters for `run_browser` outcomes.
 *
 * @private function of `run_browser`
 */
export const runBrowserResultFormatting = {
    /**
     * Produces one structured payload consumed by chat UI browser replay renderers.
     */
    createResultPayload(options: {
        readonly sessionId: string;
        readonly mode: RunBrowserExecutionMode;
        readonly modeUsed: RunBrowserModeUsed;
        readonly initialUrl: string;
        readonly finalUrl: string | null;
        readonly finalTitle: string | null;
        readonly executedActions: ReadonlyArray<NormalizedRunBrowserAction>;
        readonly artifacts: ReadonlyArray<RunBrowserArtifact>;
        readonly warning: string | null;
        readonly error: RunBrowserToolError | null;
        readonly fallbackContent: string | null;
        readonly timing: RunBrowserResultPayload['timing'];
    }): RunBrowserResultPayload {
        return {
            schema: runBrowserConstants.resultSchema,
            sessionId: options.sessionId,
            mode: options.mode,
            modeUsed: options.modeUsed,
            initialUrl: options.initialUrl,
            finalUrl: options.finalUrl,
            finalTitle: options.finalTitle,
            executedActions: options.executedActions,
            artifacts: options.artifacts,
            warning: options.warning,
            error: options.error,
            fallback:
                options.modeUsed === 'fallback' && options.fallbackContent !== null
                    ? {
                          scraper: 'fetch_url_content',
                          contentPreview: createContentPreview(options.fallbackContent),
                      }
                    : null,
            timing: options.timing,
        };
    },

    /**
     * Produces a model-friendly markdown summary from browser execution artifacts.
     */
    formatSuccessResult(options: {
        readonly payload: RunBrowserResultPayload;
        readonly snapshotPath: string | null;
    }): string {
        const { payload, snapshotPath } = options;

        return spaceTrim(
            (block) => `
                # Browser run completed

                **Session:** ${payload.sessionId}
                **Mode requested:** ${runBrowserRuntime.formatExecutionMode(payload.mode)}
                **Mode used:** ${payload.modeUsed}
                **Initial URL:** ${payload.initialUrl}
                **Executed actions:** ${payload.executedActions.length}

                ## Final page

                - URL: ${payload.finalUrl || 'Unknown'}
                - Title: ${payload.finalTitle || 'Unknown'}

                ## Timings

                - Connect: ${payload.timing.connectDurationMs ?? 'Unknown'} ms
                - Initial navigation: ${payload.timing.initialNavigationDurationMs ?? 'Unknown'} ms
                - Time to first byte: ${payload.timing.timeToFirstByteMs ?? 'Unknown'} ms
                - Total: ${payload.timing.totalDurationMs} ms

                ${
                    payload.artifacts.length === 0
                        ? ''
                        : `
                        ## Visual replay

                        ${payload.artifacts
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
                ${JSON.stringify(payload, null, 2)}
                \`\`\`

                ${block(
                    payload.executedActions.length === 0
                        ? ''
                        : `
                        ## Action log

                        ${payload.executedActions
                            .map((action, index) => `- ${index + 1}. ${JSON.stringify(action)}`)
                            .join('\n')}
                    `,
                )}

                Note: Browser page has been automatically closed to free up resources.
            `,
        );
    },

    /**
     * Produces a model-friendly markdown payload when fallback scraping is used.
     */
    formatFallbackResult(options: {
        readonly payload: RunBrowserResultPayload;
        readonly fallbackContent: string;
        readonly requestedActions: number;
    }): string {
        const { payload, fallbackContent, requestedActions } = options;

        return spaceTrim(`
            # Browser run completed with fallback

            **Session:** ${payload.sessionId}
            **Mode requested:** ${runBrowserRuntime.formatExecutionMode(payload.mode)}
            **Mode used:** ${payload.modeUsed}
            **Initial URL:** ${payload.initialUrl}
            **Requested actions:** ${requestedActions}
            **Executed actions:** ${payload.executedActions.length}
            **Warning:** ${payload.warning || runBrowserConstants.fallbackDynamicContentWarning}

            ## Extracted content

            ${fallbackContent}

            ## Playback payload

            \`\`\`json
            ${JSON.stringify(payload, null, 2)}
            \`\`\`
        `);
    },

    /**
     * Produces a model-friendly markdown error payload from browser execution failures.
     */
    formatErrorResult(options: {
        readonly payload: RunBrowserResultPayload;
    }): string {
        const { payload } = options;
        const toolError = payload.error;
        const suggestedNextSteps = toolError?.suggestedNextSteps || [];

        return spaceTrim(`
            # Browser run failed

            **Session:** ${payload.sessionId}
            **Mode requested:** ${runBrowserRuntime.formatExecutionMode(payload.mode)}
            **Mode used:** ${payload.modeUsed}
            **Initial URL:** ${payload.initialUrl}
            **Error code:** ${toolError?.code || runBrowserConstants.unknownErrorCode}
            **Error:** ${toolError?.message || 'Unknown browser tool error'}

            ${
                suggestedNextSteps.length === 0
                    ? ''
                    : `
                    ## Suggested next steps

                    ${suggestedNextSteps.map((step) => `- ${step}`).join('\n')}
                `
            }

            ## Playback payload

            \`\`\`json
            ${JSON.stringify(payload, null, 2)}
            \`\`\`

            The browser tool could not complete the requested actions.
        `);
    },
};

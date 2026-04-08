import { type ReactElement } from 'react';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { classNames } from '../../_common/react-utils/classNames';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import type { ChatMessage } from '../types/ChatMessage';
import {
    parseRunBrowserToolResult,
    resolveRunBrowserArtifactUrl,
} from '../utils/toolCallParsing';
import { resolveToolCallState } from '../utils/resolveToolCallState';
import { renderToolCallProgressPlaceholder } from './renderToolCallProgressPlaceholder';
import { resolveToolCallProgressMessage } from './resolveToolCallProgressMessage';
import styles from './Chat.module.css';

/**
 * Rendering options for the browser replay view.
 *
 * @private function of ChatToolCallModal
 */
type RenderRunBrowserToolCallDetailsOptions = {
    /**
     * Tool call being rendered.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Parsed tool call arguments.
     */
    args: Record<string, TODO_any>;
    /**
     * Parsed tool result payload.
     */
    resultRaw: TODO_any;
};

/**
 * Visual state rendered for one browser action row in the modal.
 *
 * @private function of ChatToolCallModal
 */
type BrowserActionRowState = 'pending' | 'running' | 'complete' | 'error';

/**
 * One browser action row rendered in the simple browser-tool view.
 *
 * @private function of ChatToolCallModal
 */
type BrowserActionRow = {
    /**
     * Stable row key.
     */
    key: string;
    /**
     * Human-readable action summary.
     */
    label: string;
    /**
     * Current action state.
     */
    state: BrowserActionRowState;
};

/**
 * Renders a visual replay view for `run_browser` tool calls.
 *
 * @param options - Parsed browser tool details needed by the modal.
 * @returns Visual browser replay content.
 * @private function of ChatToolCallModal
 */
export function renderRunBrowserToolCallDetails(options: RenderRunBrowserToolCallDetailsOptions): ReactElement {
    const { toolCall, args, resultRaw } = options;
    const parsedResult = parseRunBrowserToolResult(resultRaw);
    const toolCallState = resolveToolCallState(toolCall);
    const initialUrl = parsedResult?.initialUrl || (typeof args.url === 'string' ? args.url : null);
    const finalUrl = parsedResult?.finalUrl || null;
    const finalTitle = parsedResult?.finalTitle || null;
    const mode = parsedResult?.mode || null;
    const modeUsed = parsedResult?.modeUsed || null;
    const warning = parsedResult?.warning || null;
    const fallbackContent = parsedResult?.fallbackContent || null;
    const runBrowserError = parsedResult?.error || null;
    const artifacts = parsedResult?.artifacts || [];
    const actions = parsedResult?.actions || [];
    const actionRows = buildRunBrowserActionRows({
        args,
        toolCall,
        parsedActionSummaries: actions.map((action) => action.summary),
    });
    const browserReadyLog = (toolCall.logs || []).find((logEntry) => logEntry.kind === 'browser-session');
    const shouldShowProgressPlaceholder =
        toolCallState !== 'COMPLETE' && !runBrowserError && artifacts.length === 0 && !fallbackContent;

    return (
        <>
            <div className={classNames(styles.searchModalHeader, styles.browserRunModalHeader)}>
                <span className={styles.searchModalIcon}>🌐</span>
                <div className={styles.browserRunHeaderText}>
                    <span className={styles.browserRunHeaderLabel}>Browser</span>
                    <h3 className={styles.searchModalQuery}>Session replay</h3>
                    <p className={styles.browserRunHeaderStatus}>{resolveToolCallProgressMessage(toolCall)}</p>
                </div>
            </div>

            <div className={styles.searchModalContent}>
                {(initialUrl || finalUrl || finalTitle || mode || modeUsed) && (
                    <div className={styles.browserRunMeta}>
                        {initialUrl && (
                            <div className={styles.emailField}>
                                <strong>Started at:</strong>
                                <span className={styles.emailRecipients}>
                                    <a href={initialUrl} target="_blank" rel="noreferrer">
                                        {initialUrl}
                                    </a>
                                </span>
                            </div>
                        )}
                        {finalUrl && (
                            <div className={styles.emailField}>
                                <strong>Ended at:</strong>
                                <span className={styles.emailRecipients}>
                                    <a href={finalUrl} target="_blank" rel="noreferrer">
                                        {finalUrl}
                                    </a>
                                </span>
                            </div>
                        )}
                        {finalTitle && (
                            <div className={styles.emailField}>
                                <strong>Final page:</strong>
                                <span className={styles.emailRecipients}>{finalTitle}</span>
                            </div>
                        )}
                        {mode && (
                            <div className={styles.emailField}>
                                <strong>Mode requested:</strong>
                                <span className={styles.emailRecipients}>{mode}</span>
                            </div>
                        )}
                        {modeUsed && (
                            <div className={styles.emailField}>
                                <strong>Mode used:</strong>
                                <span className={styles.emailRecipients}>{modeUsed}</span>
                            </div>
                        )}
                    </div>
                )}

                {browserReadyLog && (
                    <div className={styles.browserRunStatusBanner}>
                        <strong>{browserReadyLog.title || 'Browser status'}:</strong> {browserReadyLog.message}
                    </div>
                )}

                {warning && (
                    <div className={styles.browserRunWarning}>
                        <strong>Warning:</strong> {warning}
                    </div>
                )}

                {runBrowserError && (
                    <div className={styles.browserRunError}>
                        <h4 className={styles.browserRunActionLogTitle}>Issue</h4>
                        <p className={styles.browserRunErrorSummary}>
                            <strong>{runBrowserError.code}</strong>: {runBrowserError.message}
                        </p>
                        {runBrowserError.suggestedNextSteps.length > 0 && (
                            <ul className={styles.browserRunErrorSteps}>
                                {runBrowserError.suggestedNextSteps.map((step, index) => (
                                    <li key={`${step}-${index}`}>{step}</li>
                                ))}
                            </ul>
                        )}
                        {runBrowserError.debug && (
                            <details className={styles.browserRunDebugDetails}>
                                <summary>Show debug details</summary>
                                <pre>{JSON.stringify(runBrowserError.debug, null, 2)}</pre>
                            </details>
                        )}
                    </div>
                )}

                {fallbackContent && (
                    <div className={styles.browserRunFallbackContent}>
                        <h4 className={styles.browserRunActionLogTitle}>Fallback extracted content</h4>
                        <MarkdownContent className={styles.searchResultsRaw} content={fallbackContent} />
                    </div>
                )}

                {artifacts.length > 0 ? (
                    <div className={styles.browserRunMediaGrid}>
                        {artifacts.map((artifact, index) => {
                            const mediaUrl = resolveRunBrowserArtifactUrl(artifact.path);
                            const mediaKey = `${artifact.path}-${index}`;
                            const caption = artifact.actionSummary || artifact.label;

                            return (
                                <article key={mediaKey} className={styles.browserRunMediaCard}>
                                    <div className={styles.browserRunMediaCardHeader}>
                                        <h4 className={styles.browserRunMediaTitle}>{artifact.label}</h4>
                                        {caption && <p className={styles.browserRunMediaCaption}>{caption}</p>}
                                    </div>
                                    {artifact.kind === 'video' ? (
                                        <video
                                            className={styles.browserRunMediaVideo}
                                            src={mediaUrl}
                                            controls={true}
                                            playsInline={true}
                                        />
                                    ) : (
                                        <img
                                            className={styles.browserRunMediaImage}
                                            src={mediaUrl}
                                            alt={caption || `Browser artifact ${index + 1}`}
                                            loading="lazy"
                                        />
                                    )}
                                </article>
                            );
                        })}
                    </div>
                ) : shouldShowProgressPlaceholder ? (
                    renderToolCallProgressPlaceholder({
                        title: 'Visual replay pending',
                        message:
                            'The browser session is still running. Screenshots and page state will appear here as they arrive.',
                    })
                ) : !fallbackContent ? (
                    <div className={styles.noResults}>No browser visuals were captured for this action.</div>
                ) : null}

                {actionRows.length > 0 && (
                    <div className={styles.browserRunActionLog}>
                        <h4 className={styles.browserRunActionLogTitle}>Actions</h4>
                        <ol className={styles.browserRunActionList}>
                            {actionRows.map((actionRow) => (
                                <li
                                    key={actionRow.key}
                                    className={classNames(
                                        styles.browserRunActionItem,
                                        actionRow.state === 'running' && styles.browserRunActionRunning,
                                        actionRow.state === 'complete' && styles.browserRunActionComplete,
                                        actionRow.state === 'error' && styles.browserRunActionError,
                                        actionRow.state === 'pending' && styles.browserRunActionPending,
                                    )}
                                >
                                    <span
                                        className={classNames(
                                            styles.browserRunActionState,
                                            actionRow.state === 'running' && styles.browserRunActionStateRunning,
                                            actionRow.state === 'complete' && styles.browserRunActionStateComplete,
                                            actionRow.state === 'error' && styles.browserRunActionStateError,
                                        )}
                                    />
                                    {actionRow.label}
                                    {actionRow.state === 'pending' && (
                                        <span className={styles.browserRunActionMeta}>Pending</span>
                                    )}
                                    {actionRow.state === 'running' && (
                                        <span className={styles.browserRunActionMeta}>Running</span>
                                    )}
                                    {actionRow.state === 'complete' && (
                                        <span className={styles.browserRunActionMeta}>Done</span>
                                    )}
                                    {actionRow.state === 'error' && (
                                        <span className={styles.browserRunActionMeta}>Failed</span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {toolCallState !== 'COMPLETE' && actionRows.length === 0 && (
                    <div className={styles.browserRunActionLog}>
                        <h4 className={styles.browserRunActionLogTitle}>Actions</h4>
                        {renderToolCallProgressPlaceholder({
                            title: 'Actions pending',
                            message: 'The browser action plan will appear here once the session starts streaming it.',
                        })}
                    </div>
                )}

                {runBrowserError && toolCallState !== 'ERROR' && (
                    <div className={styles.browserRunStatusBanner}>
                        <strong>Status:</strong> The browser reported an issue, but the tool call is still streaming
                        final details.
                    </div>
                )}
            </div>
        </>
    );
}

/**
 * Creates a human-readable summary for one requested browser action.
 *
 * @param action - Raw action object from the tool arguments.
 * @param fallbackIndex - Fallback action index for unknown actions.
 * @returns Human-friendly summary of the action.
 * @private function of ChatToolCallModal
 */
function formatRequestedBrowserActionSummary(action: Record<string, TODO_any>, fallbackIndex: number): string {
    const actionType = typeof action.type === 'string' ? action.type : '';

    switch (actionType) {
        case 'navigate':
            return typeof action.value === 'string' && action.value.trim()
                ? `Navigate to ${action.value.trim()}`
                : 'Navigate';
        case 'click':
            return typeof action.selector === 'string' && action.selector.trim()
                ? `Click ${action.selector.trim()}`
                : 'Click';
        case 'type':
            return typeof action.selector === 'string' && action.selector.trim()
                ? `Type into ${action.selector.trim()}`
                : 'Type text';
        case 'wait':
            return typeof action.value === 'number' || typeof action.value === 'string'
                ? `Wait ${String(action.value)}ms`
                : 'Wait';
        case 'scroll':
            return typeof action.selector === 'string' && action.selector.trim()
                ? `Scroll ${String(action.value ?? '')} in ${action.selector.trim()}`.trim()
                : `Scroll ${String(action.value ?? '')}`.trim() || 'Scroll';
        default:
            return `Action ${fallbackIndex}`;
    }
}

/**
 * Builds browser action rows from requested args and streamed browser logs.
 *
 * @param options - Raw action inputs and browser logs.
 * @returns Ordered browser action rows.
 * @private function of ChatToolCallModal
 */
function buildRunBrowserActionRows(options: {
    args: Record<string, TODO_any>;
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    parsedActionSummaries: ReadonlyArray<string>;
}): Array<BrowserActionRow> {
    const { args, toolCall, parsedActionSummaries } = options;
    const requestedActions = Array.isArray(args.actions) ? args.actions : [];
    const rows =
        requestedActions.length > 0
            ? requestedActions.map((action, index) => ({
                  key: `requested-${index + 1}`,
                  label:
                      action && typeof action === 'object'
                          ? formatRequestedBrowserActionSummary(action as Record<string, TODO_any>, index + 1)
                          : `Action ${index + 1}`,
                  state: 'pending' as BrowserActionRowState,
              }))
            : parsedActionSummaries.map((actionSummary, index) => ({
                  key: `parsed-${index + 1}`,
                  label: actionSummary,
                  state: 'complete' as BrowserActionRowState,
              }));

    for (const logEntry of toolCall.logs || []) {
        if (logEntry.kind !== 'browser-action') {
            continue;
        }

        const payload =
            logEntry.payload && typeof logEntry.payload === 'object' && !Array.isArray(logEntry.payload)
                ? (logEntry.payload as Record<string, TODO_any>)
                : null;
        const actionIndex =
            payload && typeof payload.actionIndex === 'number' && payload.actionIndex > 0 ? payload.actionIndex - 1 : -1;
        const phase = typeof payload?.phase === 'string' ? payload.phase : null;
        const nextState: BrowserActionRowState =
            phase === 'error' ? 'error' : phase === 'complete' ? 'complete' : 'running';

        if (actionIndex >= 0 && rows[actionIndex]) {
            rows[actionIndex] = {
                ...rows[actionIndex]!,
                label: logEntry.message || rows[actionIndex]!.label,
                state: nextState,
            };
            continue;
        }

        rows.push({
            key: `logged-${rows.length + 1}`,
            label: logEntry.message || logEntry.title || `Action ${rows.length + 1}`,
            state: nextState,
        });
    }

    if (resolveToolCallState(toolCall) === 'COMPLETE' && parsedActionSummaries.length > rows.length) {
        parsedActionSummaries.slice(rows.length).forEach((actionSummary, index) => {
            rows.push({
                key: `completed-${rows.length + index + 1}`,
                label: actionSummary,
                state: 'complete',
            });
        });
    }

    return rows;
}

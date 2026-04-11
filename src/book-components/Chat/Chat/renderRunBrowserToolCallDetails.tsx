import { type ReactElement } from 'react';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { classNames } from '../../_common/react-utils/classNames';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import type { ChatMessage } from '../types/ChatMessage';
import { resolveRunBrowserArtifactUrl } from '../utils/toolCallParsing';
import { renderToolCallProgressPlaceholder } from './renderToolCallProgressPlaceholder';
import { resolveRunBrowserToolCallDetailsState } from './resolveRunBrowserToolCallDetailsState';
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
 * Derived browser replay state used by the section render helpers.
 *
 * @private type of renderRunBrowserToolCallDetails
 */
type RunBrowserToolCallDetailsState = ReturnType<typeof resolveRunBrowserToolCallDetailsState>;

/**
 * One metadata row rendered in the browser replay summary.
 *
 * @private type of renderRunBrowserToolCallDetails
 */
type RunBrowserMetaItem = RunBrowserToolCallDetailsState['metaItems'][number];

/**
 * One visual browser artifact rendered in the media grid.
 *
 * @private type of renderRunBrowserToolCallDetails
 */
type RunBrowserArtifact = RunBrowserToolCallDetailsState['artifacts'][number];

/**
 * One action row rendered in the browser action log.
 *
 * @private type of renderRunBrowserToolCallDetails
 */
type BrowserActionRow = RunBrowserToolCallDetailsState['actionRows'][number];

/**
 * Structured browser error rendered in the replay view.
 *
 * @private type of renderRunBrowserToolCallDetails
 */
type RunBrowserToolError = NonNullable<RunBrowserToolCallDetailsState['runBrowserError']>;

/**
 * Renders a visual replay view for `run_browser` tool calls.
 *
 * @param options - Parsed browser tool details needed by the modal.
 * @returns Visual browser replay content.
 *
 * @private function of ChatToolCallModal
 */
export function renderRunBrowserToolCallDetails(options: RenderRunBrowserToolCallDetailsOptions): ReactElement {
    const runBrowserState = resolveRunBrowserToolCallDetailsState(options);

    return (
        <>
            {renderRunBrowserHeader(runBrowserState)}

            <div className={styles.searchModalContent}>
                {renderRunBrowserMetadataSection(runBrowserState.metaItems)}
                {renderRunBrowserSessionBanner(runBrowserState)}
                {renderRunBrowserWarningBanner(runBrowserState.warning)}
                {renderRunBrowserErrorSection(runBrowserState.runBrowserError)}
                {renderRunBrowserFallbackContentSection(runBrowserState.fallbackContent)}
                {renderRunBrowserVisualReplaySection(runBrowserState)}
                {renderRunBrowserActionLogSection(runBrowserState)}
                {renderRunBrowserStreamingErrorNotice(runBrowserState)}
            </div>
        </>
    );
}

/**
 * Renders the browser replay header with the current progress message.
 *
 * @param runBrowserState - Derived browser replay state.
 * @returns Header for the browser replay modal.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserHeader(runBrowserState: RunBrowserToolCallDetailsState): ReactElement {
    return (
        <div className={classNames(styles.searchModalHeader, styles.browserRunModalHeader)}>
            <span className={styles.searchModalIcon}>🌐</span>
            <div className={styles.browserRunHeaderText}>
                <span className={styles.browserRunHeaderLabel}>Browser</span>
                <h3 className={styles.searchModalQuery}>Session replay</h3>
                <p className={styles.browserRunHeaderStatus}>
                    {resolveToolCallProgressMessage(runBrowserState.toolCall)}
                </p>
            </div>
        </div>
    );
}

/**
 * Renders the summary metadata block shown above the browser replay content.
 *
 * @param metaItems - Metadata rows to display.
 * @returns Metadata section or `null` when there is nothing to show.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserMetadataSection(metaItems: ReadonlyArray<RunBrowserMetaItem>): ReactElement | null {
    if (metaItems.length === 0) {
        return null;
    }

    return <div className={styles.browserRunMeta}>{metaItems.map(renderRunBrowserMetadataItem)}</div>;
}

/**
 * Renders one browser metadata row, linking URLs when available.
 *
 * @param metaItem - Metadata row to render.
 * @returns One metadata row.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserMetadataItem(metaItem: RunBrowserMetaItem): ReactElement {
    return (
        <div key={metaItem.key} className={styles.emailField}>
            <strong>{metaItem.label}:</strong>
            <span className={styles.emailRecipients}>
                {metaItem.href ? (
                    <a href={metaItem.href} target="_blank" rel="noreferrer">
                        {metaItem.value}
                    </a>
                ) : (
                    metaItem.value
                )}
            </span>
        </div>
    );
}

/**
 * Renders the browser session status banner emitted from streamed browser-session logs.
 *
 * @param runBrowserState - Derived browser replay state.
 * @returns Session status banner or `null`.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserSessionBanner(runBrowserState: RunBrowserToolCallDetailsState): ReactElement | null {
    if (!runBrowserState.browserReadyLog) {
        return null;
    }

    return (
        <div className={styles.browserRunStatusBanner}>
            <strong>{runBrowserState.browserReadyLog.title || 'Browser status'}:</strong>{' '}
            {runBrowserState.browserReadyLog.message}
        </div>
    );
}

/**
 * Renders a browser warning banner when the tool emitted one.
 *
 * @param warning - Warning message emitted by the browser tool.
 * @returns Warning banner or `null`.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserWarningBanner(warning: string | null): ReactElement | null {
    if (!warning) {
        return null;
    }

    return (
        <div className={styles.browserRunWarning}>
            <strong>Warning:</strong> {warning}
        </div>
    );
}

/**
 * Renders the structured browser error details block.
 *
 * @param runBrowserError - Parsed browser error details.
 * @returns Error details block or `null`.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserErrorSection(runBrowserError: RunBrowserToolError | null): ReactElement | null {
    if (!runBrowserError) {
        return null;
    }

    return (
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
    );
}

/**
 * Renders fallback extracted content when the browser tool returned textual output.
 *
 * @param fallbackContent - Markdown fallback content.
 * @returns Fallback content section or `null`.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserFallbackContentSection(fallbackContent: string | null): ReactElement | null {
    if (!fallbackContent) {
        return null;
    }

    return (
        <div className={styles.browserRunFallbackContent}>
            <h4 className={styles.browserRunActionLogTitle}>Fallback extracted content</h4>
            <MarkdownContent className={styles.searchResultsRaw} content={fallbackContent} />
        </div>
    );
}

/**
 * Renders the visual replay area, including artifacts or the relevant empty/pending state.
 *
 * @param runBrowserState - Derived browser replay state.
 * @returns Visual replay section.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserVisualReplaySection(runBrowserState: RunBrowserToolCallDetailsState): ReactElement | null {
    if (runBrowserState.artifacts.length > 0) {
        return (
            <div className={styles.browserRunMediaGrid}>
                {runBrowserState.artifacts.map(renderRunBrowserArtifactCard)}
            </div>
        );
    }

    if (runBrowserState.isVisualReplayPending) {
        return renderToolCallProgressPlaceholder({
            title: 'Visual replay pending',
            message:
                'The browser session is still running. Screenshots and page state will appear here as they arrive.',
        });
    }

    if (runBrowserState.isVisualReplayEmpty) {
        return <div className={styles.noResults}>No browser visuals were captured for this action.</div>;
    }

    return null;
}

/**
 * Renders one visual browser artifact card.
 *
 * @param artifact - Artifact to render.
 * @param index - Artifact index used for stable keys and alt text.
 * @returns Browser artifact card.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserArtifactCard(artifact: RunBrowserArtifact, index: number): ReactElement {
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
                <video className={styles.browserRunMediaVideo} src={mediaUrl} controls={true} playsInline={true} />
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
}

/**
 * Renders the streamed browser action log or its pending placeholder.
 *
 * @param runBrowserState - Derived browser replay state.
 * @returns Action log section or `null`.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserActionLogSection(runBrowserState: RunBrowserToolCallDetailsState): ReactElement | null {
    if (runBrowserState.actionRows.length > 0) {
        return (
            <div className={styles.browserRunActionLog}>
                <h4 className={styles.browserRunActionLogTitle}>Actions</h4>
                <ol className={styles.browserRunActionList}>
                    {runBrowserState.actionRows.map(renderRunBrowserActionRow)}
                </ol>
            </div>
        );
    }

    if (!runBrowserState.isActionPlanPending) {
        return null;
    }

    return (
        <div className={styles.browserRunActionLog}>
            <h4 className={styles.browserRunActionLogTitle}>Actions</h4>
            {renderToolCallProgressPlaceholder({
                title: 'Actions pending',
                message: 'The browser action plan will appear here once the session starts streaming it.',
            })}
        </div>
    );
}

/**
 * Renders one browser action row with the correct state styling and label.
 *
 * @param actionRow - Action row to render.
 * @returns Action row list item.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserActionRow(actionRow: BrowserActionRow): ReactElement {
    return (
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
            <span className={styles.browserRunActionMeta}>{resolveRunBrowserActionStatusLabel(actionRow)}</span>
        </li>
    );
}

/**
 * Resolves the user-facing status label for one browser action row.
 *
 * @param actionRow - Action row being rendered.
 * @returns Localized-like status label shown next to the action.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function resolveRunBrowserActionStatusLabel(actionRow: BrowserActionRow): string {
    switch (actionRow.state) {
        case 'pending':
            return 'Pending';
        case 'running':
            return 'Running';
        case 'complete':
            return 'Done';
        case 'error':
            return 'Failed';
    }
}

/**
 * Renders the notice shown when the browser has reported an issue but the tool call is still streaming.
 *
 * @param runBrowserState - Derived browser replay state.
 * @returns Streaming issue notice or `null`.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
function renderRunBrowserStreamingErrorNotice(runBrowserState: RunBrowserToolCallDetailsState): ReactElement | null {
    if (!runBrowserState.isStreamingErrorNoticeVisible) {
        return null;
    }

    return (
        <div className={styles.browserRunStatusBanner}>
            <strong>Status:</strong> The browser reported an issue, but the tool call is still streaming final
            details.
        </div>
    );
}

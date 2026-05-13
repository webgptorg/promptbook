import { type ReactElement } from 'react';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { buildTimeoutToolPrimarySentence, buildTimeoutToolScheduleSentence, resolveTimeoutToolCallPresentation } from '../utils/timeoutToolCallPresentation';
import styles from './Chat.module.css';
import { renderToolCallClockPanel } from './renderToolCallClockPanel';

/**
 * Default snooze interval used by timeout quick actions.
 *
 * @private function of ChatToolCallModal
 */
const DEFAULT_TIMEOUT_SNOOZE_DURATION_MILLISECONDS = 5 * 60 * 1_000;

/**
 * Translation overrides used by timeout detail rendering.
 *
 * @private function of ChatToolCallModal
 */
type TimeoutToolCallTranslations = import('./ChatProps').ChatUiTranslations;

/**
 * Rendering options for timeout tool calls.
 *
 * @private function of ChatToolCallModal
 */
type RenderTimeoutToolCallDetailsOptions = {
    /**
     * Tool name used to resolve timeout presentation details.
     */
    toolCallName: string;
    /**
     * Parsed tool call arguments.
     */
    args: Record<string, TODO_any>;
    /**
     * Parsed tool result payload.
     */
    resultRaw: TODO_any;
    /**
     * Timestamp of the tool call itself.
     */
    toolCallDate: Date | null;
    /**
     * Optional callback for switching to advanced mode.
     */
    onRequestAdvancedView?: () => void;
    /**
     * Optional locale override used for date formatting.
     */
    locale?: string;
    /**
     * Optional translation overrides.
     */
    chatUiTranslations?: TimeoutToolCallTranslations;
};

/**
 * Resolved labels used by timeout detail rendering.
 *
 * @private function of ChatToolCallModal
 */
type TimeoutToolCallDetailLabels = {
    readonly titleScheduled: string;
    readonly titleCancelled: string;
    readonly titleUpdated: string;
    readonly loadingMessage: string;
    readonly unavailableMessage: string;
    readonly dateLabel: string;
    readonly messageLabel: string;
    readonly timezoneLabel: string;
    readonly actionGroupLabel: string;
    readonly cancelAriaLabel: string;
    readonly cancelButton: string;
    readonly snoozeAriaLabel: string;
    readonly snoozeButton: string;
    readonly viewAdvancedAriaLabel: string;
    readonly viewAdvancedButton: string;
};

/**
 * Prepared values consumed by the timeout details renderer.
 *
 * @private function of ChatToolCallModal
 */
type TimeoutToolCallDetailsViewModel = {
    readonly labels: TimeoutToolCallDetailLabels;
    readonly locale?: string;
    readonly onRequestAdvancedView?: () => void;
    readonly title: string;
    readonly clockDate: Date | null;
    readonly primarySentence: string;
    readonly scheduleSentence: string | null;
    readonly relativeDueLabel: string | null;
    readonly timezoneLine: string | null;
    readonly localDueDateLabel: string | null;
    readonly message: string | null;
    readonly cancelCommand: string | null;
    readonly snoozeCommand: string;
};

/**
 * Renders the timeout-specific tool call detail view.
 *
 * @param options - Timeout tool call data.
 * @returns Timeout visualization UI.
 *
 * @private function of ChatToolCallModal
 */
export function renderTimeoutToolCallDetails(options: RenderTimeoutToolCallDetailsOptions): ReactElement {
    const viewModel = createTimeoutToolCallDetailsViewModel(options);

    return (
        <>
            <div className={styles.searchModalHeader}>
                <span className={styles.searchModalIcon}>⏱️</span>
                <h3 className={styles.searchModalQuery}>{viewModel.title}</h3>
            </div>

            <div className={styles.searchModalContent}>
                {renderTimeoutToolCallClock(viewModel)}
                {renderTimeoutToolCallSummary(viewModel)}
                {renderTimeoutToolCallActions(viewModel)}
            </div>
        </>
    );
}

/**
 * Prepares the values rendered by the timeout detail view.
 *
 * @param options - Raw timeout tool call data.
 * @returns Derived timeout detail view model.
 *
 * @private function of ChatToolCallModal
 */
function createTimeoutToolCallDetailsViewModel(
    options: RenderTimeoutToolCallDetailsOptions,
): TimeoutToolCallDetailsViewModel {
    const { toolCallName, args, resultRaw, toolCallDate, onRequestAdvancedView, locale, chatUiTranslations } = options;
    const timeoutPresentation = resolveTimeoutToolCallPresentation({
        toolCallName,
        args,
        resultRaw,
        currentDate: new Date(),
        locale,
    });
    const labels = resolveTimeoutToolCallDetailLabels(chatUiTranslations);

    return {
        labels,
        locale,
        onRequestAdvancedView,
        title: resolveTimeoutToolCallTitle(timeoutPresentation, labels),
        clockDate: timeoutPresentation?.dueAtDate || toolCallDate,
        primarySentence: timeoutPresentation
            ? buildTimeoutToolPrimarySentence(timeoutPresentation, chatUiTranslations)
            : labels.loadingMessage,
        scheduleSentence: timeoutPresentation
            ? buildTimeoutToolScheduleSentence(timeoutPresentation, chatUiTranslations)
            : null,
        relativeDueLabel: timeoutPresentation?.relativeDueLabel || null,
        timezoneLine: timeoutPresentation?.localTimezone
            ? `${labels.timezoneLabel} ${timeoutPresentation.localTimezone}`
            : null,
        localDueDateLabel: timeoutPresentation?.localDueDateLabel || null,
        message: timeoutPresentation?.message || null,
        cancelCommand:
            timeoutPresentation?.timeoutId && timeoutPresentation.action !== 'cancel'
                ? createCancelTimeoutQuickActionCommand(timeoutPresentation.timeoutId)
                : null,
        snoozeCommand: createSnoozeTimeoutQuickActionCommand(timeoutPresentation?.message || undefined),
    };
}

/**
 * Resolves the timeout detail title for the current presentation state.
 *
 * @param timeoutPresentation - Friendly timeout presentation data.
 * @param labels - Localized labels with fallbacks.
 * @returns One timeout modal title.
 *
 * @private function of ChatToolCallModal
 */
function resolveTimeoutToolCallTitle(
    timeoutPresentation: ReturnType<typeof resolveTimeoutToolCallPresentation>,
    labels: TimeoutToolCallDetailLabels,
): string {
    if (timeoutPresentation?.action !== 'cancel') {
        return labels.titleScheduled;
    }

    return timeoutPresentation.status === 'cancelled' ? labels.titleCancelled : labels.titleUpdated;
}

/**
 * Resolves timeout-detail translations with stable fallback strings.
 *
 * @param chatUiTranslations - Optional translation overrides.
 * @returns Complete timeout detail labels.
 *
 * @private function of ChatToolCallModal
 */
function resolveTimeoutToolCallDetailLabels(
    chatUiTranslations?: TimeoutToolCallTranslations,
): TimeoutToolCallDetailLabels {
    return {
        titleScheduled: chatUiTranslations?.toolCallTimeoutTitle || 'Timeout scheduled',
        titleCancelled: chatUiTranslations?.toolCallTimeoutCancelledTitle || 'Timeout cancelled',
        titleUpdated: chatUiTranslations?.toolCallTimeoutUpdateTitle || 'Timeout update',
        loadingMessage: chatUiTranslations?.toolCallTimeoutLoadingMessage || 'Timeout details are still loading.',
        unavailableMessage: chatUiTranslations?.toolCallTimeoutUnavailableMessage || 'Scheduled time is unavailable.',
        dateLabel: chatUiTranslations?.toolCallTimeoutDateLabel || 'Date:',
        messageLabel: chatUiTranslations?.toolCallTimeoutMessageLabel || 'Message:',
        timezoneLabel: chatUiTranslations?.toolCallTimeoutTimezoneLabel || 'Timezone:',
        actionGroupLabel: chatUiTranslations?.toolCallTimeoutActionGroupLabel || 'Timeout quick actions',
        cancelAriaLabel: chatUiTranslations?.toolCallTimeoutCancelAriaLabel || 'Cancel timeout',
        cancelButton: chatUiTranslations?.toolCallTimeoutCancelButton || 'Cancel',
        snoozeAriaLabel: chatUiTranslations?.toolCallTimeoutSnoozeAriaLabel || 'Snooze timeout',
        snoozeButton: chatUiTranslations?.toolCallTimeoutSnoozeButton || 'Snooze',
        viewAdvancedAriaLabel:
            chatUiTranslations?.toolCallTimeoutViewAdvancedAriaLabel || 'View advanced timeout details',
        viewAdvancedButton: chatUiTranslations?.toolCallTimeoutViewAdvancedButton || 'View advanced',
    };
}

/**
 * Renders the timeout clock panel or its unavailable fallback.
 *
 * @param viewModel - Prepared timeout detail state.
 * @returns Clock section element.
 *
 * @private function of ChatToolCallModal
 */
function renderTimeoutToolCallClock(viewModel: TimeoutToolCallDetailsViewModel): ReactElement {
    if (viewModel.clockDate && !Number.isNaN(viewModel.clockDate.getTime())) {
        return renderToolCallClockPanel({
            date: viewModel.clockDate,
            relativeLabel: viewModel.relativeDueLabel,
            timezoneLabel: viewModel.timezoneLine,
            locale: viewModel.locale,
        });
    }

    return <p className={styles.toolCallEmpty}>{viewModel.labels.unavailableMessage}</p>;
}

/**
 * Renders the timeout summary sentences and optional metadata lines.
 *
 * @param viewModel - Prepared timeout detail state.
 * @returns Summary section element.
 *
 * @private function of ChatToolCallModal
 */
function renderTimeoutToolCallSummary(viewModel: TimeoutToolCallDetailsViewModel): ReactElement {
    return (
        <div className={styles.timeoutToolSummary}>
            <p className={styles.timeoutToolPrimarySentence}>{viewModel.primarySentence}</p>
            {viewModel.scheduleSentence && (
                <p className={styles.timeoutToolSecondarySentence}>{viewModel.scheduleSentence}</p>
            )}
            {viewModel.localDueDateLabel && (
                <p className={styles.timeoutToolSecondarySentence}>
                    {viewModel.labels.dateLabel} {viewModel.localDueDateLabel}
                </p>
            )}
            {viewModel.message && (
                <p className={styles.timeoutToolSecondarySentence}>
                    {viewModel.labels.messageLabel} {viewModel.message}
                </p>
            )}
        </div>
    );
}

/**
 * Renders timeout quick-action buttons.
 *
 * @param viewModel - Prepared timeout detail state.
 * @returns Quick actions element.
 *
 * @private function of ChatToolCallModal
 */
function renderTimeoutToolCallActions(viewModel: TimeoutToolCallDetailsViewModel): ReactElement {
    return (
        <div className={styles.timeoutToolActionRow} role="group" aria-label={viewModel.labels.actionGroupLabel}>
            <button
                type="button"
                className={styles.timeoutToolActionButton}
                onClick={() => {
                    if (!viewModel.cancelCommand) {
                        return;
                    }

                    copyTimeoutQuickActionCommand(viewModel.cancelCommand);
                }}
                disabled={!viewModel.cancelCommand}
                aria-label={viewModel.labels.cancelAriaLabel}
            >
                {viewModel.labels.cancelButton}
            </button>
            <button
                type="button"
                className={styles.timeoutToolActionButton}
                onClick={() => {
                    copyTimeoutQuickActionCommand(viewModel.snoozeCommand);
                }}
                aria-label={viewModel.labels.snoozeAriaLabel}
            >
                {viewModel.labels.snoozeButton}
            </button>
            {viewModel.onRequestAdvancedView && (
                <button
                    type="button"
                    className={styles.timeoutToolActionButton}
                    onClick={viewModel.onRequestAdvancedView}
                    aria-label={viewModel.labels.viewAdvancedAriaLabel}
                >
                    {viewModel.labels.viewAdvancedButton}
                </button>
            )}
        </div>
    );
}

/**
 * Copies one quick action command to clipboard when supported.
 *
 * @param command - Command text copied for the user.
 *
 * @private function of ChatToolCallModal
 */
function copyTimeoutQuickActionCommand(command: string): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        return;
    }

    void navigator.clipboard.writeText(command);
}

/**
 * Builds one `cancel_timeout(...)` helper command for timeout quick actions.
 *
 * @param timeoutId - Timeout identifier to cancel.
 * @returns Helper command text.
 *
 * @private function of ChatToolCallModal
 */
function createCancelTimeoutQuickActionCommand(timeoutId: string): string {
    return `cancel_timeout(${JSON.stringify({ timeoutId })})`;
}

/**
 * Builds one `set_timeout(...)` helper command for timeout snooze quick actions.
 *
 * @param message - Optional timeout wake-up message.
 * @returns Helper command text.
 *
 * @private function of ChatToolCallModal
 */
function createSnoozeTimeoutQuickActionCommand(message?: string): string {
    const payload: Record<string, TODO_any> = {
        milliseconds: DEFAULT_TIMEOUT_SNOOZE_DURATION_MILLISECONDS,
    };

    if (typeof message === 'string' && message.trim()) {
        payload.message = message.trim();
    }

    return `set_timeout(${JSON.stringify(payload)})`;
}

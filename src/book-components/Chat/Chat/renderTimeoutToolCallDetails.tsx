import { type ReactElement } from 'react';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import {
    buildTimeoutToolPrimarySentence,
    buildTimeoutToolScheduleSentence,
    resolveTimeoutToolCallPresentation,
} from '../utils/timeoutToolCallPresentation';
import { renderToolCallClockPanel } from './renderToolCallClockPanel';
import styles from './Chat.module.css';

/**
 * Default snooze interval used by timeout quick actions.
 *
 * @private function of ChatToolCallModal
 */
const DEFAULT_TIMEOUT_SNOOZE_DURATION_MILLISECONDS = 5 * 60 * 1_000;

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
    chatUiTranslations?: import('./ChatProps').ChatUiTranslations;
};

/**
 * View-model used by the friendly timeout detail renderer.
 *
 * @private function of ChatToolCallModal
 */
type TimeoutToolCallDetailsViewModel = {
    /**
     * Header title shown at the top of the modal.
     */
    title: string;
    /**
     * Primary descriptive sentence about the timeout.
     */
    primarySentence: string;
    /**
     * Optional secondary schedule sentence.
     */
    scheduleSentence: string | null;
    /**
     * Clock date rendered in the panel when available.
     */
    clockDate: Date | null;
    /**
     * Indicates whether the clock date is safe to render.
     */
    isClockDateValid: boolean;
    /**
     * Optional timezone line displayed below the clock.
     */
    timezoneLine: string | null;
    /**
     * Optional relative due label shown in the clock panel.
     */
    relativeDueLabel: string | null;
    /**
     * Optional localized due date line.
     */
    localDueDateLabel: string | null;
    /**
     * Optional timeout message line.
     */
    message: string | null;
    /**
     * Optional quick action command for canceling the timeout.
     */
    cancelCommand: string | null;
    /**
     * Quick action command for snoozing the timeout.
     */
    snoozeCommand: string;
};

/**
 * Resolves the friendly timeout detail view-model from tool call data.
 *
 * @param options - Timeout tool call data.
 * @returns Friendly timeout detail view-model.
 *
 * @private function of ChatToolCallModal
 */
function createTimeoutToolCallDetailsViewModel(
    options: RenderTimeoutToolCallDetailsOptions,
): TimeoutToolCallDetailsViewModel {
    const { toolCallName, args, resultRaw, toolCallDate, locale, chatUiTranslations } = options;
    const timeoutPresentation = resolveTimeoutToolCallPresentation({
        toolCallName,
        args,
        resultRaw,
        currentDate: new Date(),
        locale,
    });
    const clockDate = timeoutPresentation?.dueAtDate || toolCallDate;

    return {
        title: resolveTimeoutToolCallDetailsTitle(timeoutPresentation, chatUiTranslations),
        primarySentence: timeoutPresentation
            ? buildTimeoutToolPrimarySentence(timeoutPresentation, chatUiTranslations)
            : chatUiTranslations?.toolCallTimeoutLoadingMessage || 'Timeout details are still loading.',
        scheduleSentence: timeoutPresentation
            ? buildTimeoutToolScheduleSentence(timeoutPresentation, chatUiTranslations)
            : null,
        clockDate,
        isClockDateValid: isTimeoutToolCallDetailsDateValid(clockDate),
        timezoneLine: createTimeoutToolCallTimezoneLine(timeoutPresentation, chatUiTranslations),
        relativeDueLabel: timeoutPresentation?.relativeDueLabel || null,
        localDueDateLabel: timeoutPresentation?.localDueDateLabel || null,
        message: timeoutPresentation?.message || null,
        cancelCommand: createTimeoutToolCancelQuickActionCommand(timeoutPresentation),
        snoozeCommand: createSnoozeTimeoutQuickActionCommand(timeoutPresentation?.message || undefined),
    };
}

/**
 * Resolves the friendly title shown for the timeout detail modal.
 *
 * @param timeoutPresentation - Friendly timeout presentation metadata.
 * @param chatUiTranslations - Optional localized label overrides.
 * @returns Timeout modal title.
 *
 * @private function of ChatToolCallModal
 */
function resolveTimeoutToolCallDetailsTitle(
    timeoutPresentation: ReturnType<typeof resolveTimeoutToolCallPresentation>,
    chatUiTranslations?: import('./ChatProps').ChatUiTranslations,
): string {
    if (timeoutPresentation?.action !== 'cancel') {
        return chatUiTranslations?.toolCallTimeoutTitle || 'Timeout scheduled';
    }

    if (timeoutPresentation.status === 'cancelled') {
        return chatUiTranslations?.toolCallTimeoutCancelledTitle || 'Timeout cancelled';
    }

    return chatUiTranslations?.toolCallTimeoutUpdateTitle || 'Timeout update';
}

/**
 * Determines whether one timeout detail date is safe to render.
 *
 * @param date - Date candidate shown in the clock panel.
 * @returns `true` when the date exists and is valid.
 *
 * @private function of ChatToolCallModal
 */
function isTimeoutToolCallDetailsDateValid(date: Date | null): boolean {
    return !!date && !Number.isNaN(date.getTime());
}

/**
 * Builds the optional timezone line shown below the timeout clock.
 *
 * @param timeoutPresentation - Friendly timeout presentation metadata.
 * @param chatUiTranslations - Optional localized label overrides.
 * @returns Timezone line or `null` when unavailable.
 *
 * @private function of ChatToolCallModal
 */
function createTimeoutToolCallTimezoneLine(
    timeoutPresentation: ReturnType<typeof resolveTimeoutToolCallPresentation>,
    chatUiTranslations?: import('./ChatProps').ChatUiTranslations,
): string | null {
    if (!timeoutPresentation?.localTimezone) {
        return null;
    }

    return `${chatUiTranslations?.toolCallTimeoutTimezoneLabel || 'Timezone:'} ${timeoutPresentation.localTimezone}`;
}

/**
 * Builds the optional cancel quick action command for active timeouts.
 *
 * @param timeoutPresentation - Friendly timeout presentation metadata.
 * @returns Cancel command or `null` when the timeout cannot be cancelled.
 *
 * @private function of ChatToolCallModal
 */
function createTimeoutToolCancelQuickActionCommand(
    timeoutPresentation: ReturnType<typeof resolveTimeoutToolCallPresentation>,
): string | null {
    if (!timeoutPresentation?.timeoutId || timeoutPresentation.action === 'cancel') {
        return null;
    }

    return createCancelTimeoutQuickActionCommand(timeoutPresentation.timeoutId);
}

/**
 * Renders the timeout-specific tool call detail view.
 *
 * @param options - Timeout tool call data.
 * @returns Timeout visualization UI.
 *
 * @private function of ChatToolCallModal
 */
export function renderTimeoutToolCallDetails(options: RenderTimeoutToolCallDetailsOptions): ReactElement {
    const { onRequestAdvancedView, locale, chatUiTranslations } = options;
    const viewModel = createTimeoutToolCallDetailsViewModel(options);

    return (
        <>
            <div className={styles.searchModalHeader}>
                <span className={styles.searchModalIcon}>⏱️</span>
                <h3 className={styles.searchModalQuery}>{viewModel.title}</h3>
            </div>

            <div className={styles.searchModalContent}>
                {renderTimeoutToolCallClockSection(viewModel, locale, chatUiTranslations)}

                <div className={styles.timeoutToolSummary}>
                    {renderTimeoutToolCallSummary(viewModel, chatUiTranslations)}
                </div>

                {renderTimeoutToolCallActionRow(viewModel, onRequestAdvancedView, chatUiTranslations)}
            </div>
        </>
    );
}

/**
 * Renders the clock section of the friendly timeout view.
 *
 * @param viewModel - Friendly timeout detail view-model.
 * @param locale - Optional locale override used for date formatting.
 * @param chatUiTranslations - Optional localized label overrides.
 * @returns Timeout clock section UI.
 *
 * @private function of ChatToolCallModal
 */
function renderTimeoutToolCallClockSection(
    viewModel: TimeoutToolCallDetailsViewModel,
    locale?: string,
    chatUiTranslations?: import('./ChatProps').ChatUiTranslations,
): ReactElement {
    if (viewModel.isClockDateValid && viewModel.clockDate) {
        return renderToolCallClockPanel({
            date: viewModel.clockDate,
            relativeLabel: viewModel.relativeDueLabel,
            timezoneLabel: viewModel.timezoneLine,
            locale,
        });
    }

    return (
        <p className={styles.toolCallEmpty}>
            {chatUiTranslations?.toolCallTimeoutUnavailableMessage || 'Scheduled time is unavailable.'}
        </p>
    );
}

/**
 * Renders the friendly timeout summary sentences.
 *
 * @param viewModel - Friendly timeout detail view-model.
 * @param chatUiTranslations - Optional localized label overrides.
 * @returns Timeout summary UI.
 *
 * @private function of ChatToolCallModal
 */
function renderTimeoutToolCallSummary(
    viewModel: TimeoutToolCallDetailsViewModel,
    chatUiTranslations?: import('./ChatProps').ChatUiTranslations,
): ReactElement {
    return (
        <>
            <p className={styles.timeoutToolPrimarySentence}>{viewModel.primarySentence}</p>
            {viewModel.scheduleSentence && (
                <p className={styles.timeoutToolSecondarySentence}>{viewModel.scheduleSentence}</p>
            )}
            {viewModel.localDueDateLabel && (
                <p className={styles.timeoutToolSecondarySentence}>
                    {chatUiTranslations?.toolCallTimeoutDateLabel || 'Date:'} {viewModel.localDueDateLabel}
                </p>
            )}
            {viewModel.message && (
                <p className={styles.timeoutToolSecondarySentence}>
                    {chatUiTranslations?.toolCallTimeoutMessageLabel || 'Message:'} {viewModel.message}
                </p>
            )}
        </>
    );
}

/**
 * Renders the timeout quick action buttons row.
 *
 * @param viewModel - Friendly timeout detail view-model.
 * @param onRequestAdvancedView - Optional callback for switching to advanced mode.
 * @param chatUiTranslations - Optional localized label overrides.
 * @returns Timeout quick actions UI.
 *
 * @private function of ChatToolCallModal
 */
function renderTimeoutToolCallActionRow(
    viewModel: TimeoutToolCallDetailsViewModel,
    onRequestAdvancedView?: () => void,
    chatUiTranslations?: import('./ChatProps').ChatUiTranslations,
): ReactElement {
    return (
        <div
            className={styles.timeoutToolActionRow}
            role="group"
            aria-label={chatUiTranslations?.toolCallTimeoutActionGroupLabel || 'Timeout quick actions'}
        >
            <button
                type="button"
                className={styles.timeoutToolActionButton}
                onClick={() => {
                    copyTimeoutQuickActionCommand(viewModel.cancelCommand);
                }}
                disabled={!viewModel.cancelCommand}
                aria-label={chatUiTranslations?.toolCallTimeoutCancelAriaLabel || 'Cancel timeout'}
            >
                {chatUiTranslations?.toolCallTimeoutCancelButton || 'Cancel'}
            </button>
            <button
                type="button"
                className={styles.timeoutToolActionButton}
                onClick={() => {
                    copyTimeoutQuickActionCommand(viewModel.snoozeCommand);
                }}
                aria-label={chatUiTranslations?.toolCallTimeoutSnoozeAriaLabel || 'Snooze timeout'}
            >
                {chatUiTranslations?.toolCallTimeoutSnoozeButton || 'Snooze'}
            </button>
            {onRequestAdvancedView && (
                <button
                    type="button"
                    className={styles.timeoutToolActionButton}
                    onClick={onRequestAdvancedView}
                    aria-label={
                        chatUiTranslations?.toolCallTimeoutViewAdvancedAriaLabel || 'View advanced timeout details'
                    }
                >
                    {chatUiTranslations?.toolCallTimeoutViewAdvancedButton || 'View advanced'}
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
function copyTimeoutQuickActionCommand(command: string | null): void {
    if (!command || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
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

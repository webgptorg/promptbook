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
 * Renders the timeout-specific tool call detail view.
 *
 * @param options - Timeout tool call data.
 * @returns Timeout visualization UI.
 * @private function of ChatToolCallModal
 */
export function renderTimeoutToolCallDetails(options: RenderTimeoutToolCallDetailsOptions): ReactElement {
    const { toolCallName, args, resultRaw, toolCallDate, onRequestAdvancedView, locale, chatUiTranslations } = options;
    const timeoutPresentation = resolveTimeoutToolCallPresentation({
        toolCallName,
        args,
        resultRaw,
        currentDate: new Date(),
        locale,
    });
    const clockDate = timeoutPresentation?.dueAtDate || toolCallDate;
    const isValidClockDate = !!clockDate && !Number.isNaN(clockDate.getTime());
    const title =
        timeoutPresentation?.action === 'cancel'
            ? timeoutPresentation.status === 'cancelled'
                ? chatUiTranslations?.toolCallTimeoutCancelledTitle || 'Timeout cancelled'
                : chatUiTranslations?.toolCallTimeoutUpdateTitle || 'Timeout update'
            : chatUiTranslations?.toolCallTimeoutTitle || 'Timeout scheduled';
    const primarySentence = timeoutPresentation
        ? buildTimeoutToolPrimarySentence(timeoutPresentation, chatUiTranslations)
        : chatUiTranslations?.toolCallTimeoutLoadingMessage || 'Timeout details are still loading.';
    const scheduleSentence = timeoutPresentation
        ? buildTimeoutToolScheduleSentence(timeoutPresentation, chatUiTranslations)
        : null;
    const cancelCommand =
        timeoutPresentation?.timeoutId && timeoutPresentation.action !== 'cancel'
            ? createCancelTimeoutQuickActionCommand(timeoutPresentation.timeoutId)
            : null;
    const snoozeCommand = createSnoozeTimeoutQuickActionCommand(timeoutPresentation?.message || undefined);
    const timezoneLine = timeoutPresentation?.localTimezone
        ? `${chatUiTranslations?.toolCallTimeoutTimezoneLabel || 'Timezone:'} ${timeoutPresentation.localTimezone}`
        : null;

    return (
        <>
            <div className={styles.searchModalHeader}>
                <span className={styles.searchModalIcon}>⏱️</span>
                <h3 className={styles.searchModalQuery}>{title}</h3>
            </div>

            <div className={styles.searchModalContent}>
                {isValidClockDate && clockDate ? (
                    renderToolCallClockPanel({
                        date: clockDate,
                        relativeLabel: timeoutPresentation?.relativeDueLabel || null,
                        timezoneLabel: timezoneLine,
                        locale,
                    })
                ) : (
                    <p className={styles.toolCallEmpty}>
                        {chatUiTranslations?.toolCallTimeoutUnavailableMessage || 'Scheduled time is unavailable.'}
                    </p>
                )}

                <div className={styles.timeoutToolSummary}>
                    <p className={styles.timeoutToolPrimarySentence}>{primarySentence}</p>
                    {scheduleSentence && <p className={styles.timeoutToolSecondarySentence}>{scheduleSentence}</p>}
                    {timeoutPresentation?.localDueDateLabel && (
                        <p className={styles.timeoutToolSecondarySentence}>
                            {chatUiTranslations?.toolCallTimeoutDateLabel || 'Date:'} {timeoutPresentation.localDueDateLabel}
                        </p>
                    )}
                    {timeoutPresentation?.message && (
                        <p className={styles.timeoutToolSecondarySentence}>
                            {chatUiTranslations?.toolCallTimeoutMessageLabel || 'Message:'} {timeoutPresentation.message}
                        </p>
                    )}
                </div>

                <div
                    className={styles.timeoutToolActionRow}
                    role="group"
                    aria-label={chatUiTranslations?.toolCallTimeoutActionGroupLabel || 'Timeout quick actions'}
                >
                    <button
                        type="button"
                        className={styles.timeoutToolActionButton}
                        onClick={() => {
                            if (!cancelCommand) {
                                return;
                            }

                            copyTimeoutQuickActionCommand(cancelCommand);
                        }}
                        disabled={!cancelCommand}
                        aria-label={chatUiTranslations?.toolCallTimeoutCancelAriaLabel || 'Cancel timeout'}
                    >
                        {chatUiTranslations?.toolCallTimeoutCancelButton || 'Cancel'}
                    </button>
                    <button
                        type="button"
                        className={styles.timeoutToolActionButton}
                        onClick={() => {
                            copyTimeoutQuickActionCommand(snoozeCommand);
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
            </div>
        </>
    );
}

/**
 * Copies one quick action command to clipboard when supported.
 *
 * @param command - Command text copied for the user.
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

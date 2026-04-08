import { type ReactElement } from 'react';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { formatToolCallDateTime } from '../utils/formatToolCallDateTime';
import { formatToolCallTranslationTemplate } from '../utils/formatToolCallTranslationTemplate';
import { getToolCallResultDate } from '../utils/toolCallParsing';
import { renderToolCallClockPanel } from './renderToolCallClockPanel';
import styles from './Chat.module.css';

/**
 * Rendering options for time tool calls.
 *
 * @private function of ChatToolCallModal
 */
type RenderTimeToolCallDetailsOptions = {
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
     * Optional locale override used for date formatting.
     */
    locale?: string;
    /**
     * Optional translation overrides.
     */
    chatUiTranslations?: import('./ChatProps').ChatUiTranslations;
};

/**
 * Renders the time-specific tool call detail view.
 *
 * @param options - Time tool call data.
 * @returns Time visualization UI.
 *
 * @private function of ChatToolCallModal
 */
export function renderTimeToolCallDetails(options: RenderTimeToolCallDetailsOptions): ReactElement {
    const { args, resultRaw, toolCallDate, locale, chatUiTranslations } = options;
    const timeResultDate = getToolCallResultDate(resultRaw);
    const displayDate = timeResultDate || toolCallDate;
    const isValidDate = !!displayDate && !Number.isNaN(displayDate.getTime());
    const toolCallDateLabels = toolCallDate ? formatToolCallDateTime(toolCallDate, { locale, currentDate: new Date() }) : null;
    const relativeLabel =
        toolCallDateLabels?.relativeTimeLabel && chatUiTranslations?.toolCallTimeRelativeLabel
            ? formatToolCallTranslationTemplate(chatUiTranslations.toolCallTimeRelativeLabel, {
                  relative: toolCallDateLabels.relativeTimeLabel,
              })
            : toolCallDateLabels?.relativeTimeLabel
              ? formatToolCallTranslationTemplate('Called {relative}', {
                    relative: toolCallDateLabels.relativeTimeLabel,
                })
              : null;
    const timezoneArg = typeof args.timezone === 'string' && args.timezone.trim() ? args.timezone.trim() : null;
    const timezoneLabel = timezoneArg
        ? `${chatUiTranslations?.toolCallTimeoutTimezoneLabel || 'Timezone:'} ${timezoneArg}`
        : null;

    return (
        <>
            <div className={styles.searchModalHeader}>
                <span className={styles.searchModalIcon}>⏰</span>
                <h3 className={styles.searchModalQuery}>{chatUiTranslations?.toolCallTimeTitle || 'Time at call'}</h3>
            </div>

            <div className={styles.searchModalContent}>
                {isValidDate && displayDate ? (
                    renderToolCallClockPanel({
                        date: displayDate,
                        relativeLabel,
                        timezoneLabel,
                        locale,
                    })
                ) : (
                    <p className={styles.toolCallEmpty}>{chatUiTranslations?.toolCallTimeUnknown || 'Unknown time'}</p>
                )}
                <div className={styles.toolCallDetails}>
                    <p>
                        <strong>{chatUiTranslations?.toolCallTimeTimestampLabel || 'Timestamp of call:'}</strong>
                    </p>
                    <div className={styles.toolCallDataContainer}>
                        <pre className={styles.toolCallData}>
                            {toolCallDateLabels?.localDateTimeLabel ||
                                chatUiTranslations?.toolCallTimeUnknown ||
                                'Unknown time'}
                        </pre>
                    </div>
                </div>
            </div>
        </>
    );
}

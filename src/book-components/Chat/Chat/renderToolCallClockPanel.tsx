import { type ReactElement } from 'react';
import { formatToolCallDateTime } from '../utils/formatToolCallDateTime';
import { ClockIcon } from './ClockIcon';
import styles from './Chat.module.css';

/**
 * Configuration for the shared clock panel used by time and timeout popups.
 *
 * @private function of ChatToolCallModal
 */
type RenderToolCallClockPanelOptions = {
    /**
     * Date rendered by the analog clock and local labels.
     */
    date: Date;
    /**
     * Optional relative label.
     */
    relativeLabel?: string | null;
    /**
     * Optional timezone label shown below the date.
     */
    timezoneLabel?: string | null;
    /**
     * Optional BCP-47 locale string used to format the local time display.
     */
    locale?: string;
};

/**
 * Renders a shared analog-clock panel used by time and timeout tool views.
 *
 * @param options - Clock panel rendering options.
 * @returns Clock section with local date/time labels.
 * @private function of ChatToolCallModal
 */
export function renderToolCallClockPanel(options: RenderToolCallClockPanelOptions): ReactElement {
    const { date, relativeLabel, timezoneLabel, locale } = options;
    const formattedDateTime = formatToolCallDateTime(date, { locale });

    return (
        <div className={styles.toolCallClockPanel}>
            <ClockIcon date={date} size={150} />
            <div className={styles.toolCallClockLabels}>
                <div className={styles.toolCallClockPrimary}>{formattedDateTime.localTimeLabel}</div>
                <div className={styles.toolCallClockSecondary}>{formattedDateTime.localDateLabel}</div>
                {relativeLabel && <div className={styles.toolCallClockMeta}>({relativeLabel})</div>}
                {timezoneLabel && <div className={styles.toolCallClockMeta}>{timezoneLabel}</div>}
            </div>
        </div>
    );
}

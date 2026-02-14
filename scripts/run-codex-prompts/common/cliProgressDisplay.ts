import colors from 'colors';
import moment from 'moment';
import { clearLine, cursorTo } from 'readline';
import type { PromptStats } from '../prompts/types/PromptStats';

/** Refresh interval for the progress header in milliseconds. */
const PROGRESS_REFRESH_INTERVAL_MS = 1000;

/** Calendar formats used when displaying the estimated completion time. */
const ESTIMATED_DONE_CALENDAR_FORMATS = {
    sameDay: '[Today] h:mm',
    nextDay: '[Tomorrow] h:mm',
    nextWeek: 'dddd h:mm',
    lastDay: '[Yesterday] h:mm',
    lastWeek: 'dddd h:mm',
    sameElse: 'MMM D h:mm',
};

/**
 * Compact CLI progress display that stays pinned at the top of the terminal.
 */
export class CliProgressDisplay {
    private stats: PromptStats = { done: 0, forAgent: 0, toBeWritten: 0 };
    private readonly isInteractive: boolean;
    private interval: NodeJS.Timeout | undefined;

    /**
     * Creates a new display that uses the provided start time when computing estimates.
     */
    public constructor(private readonly startTime: moment.Moment) {
        this.isInteractive = Boolean(process.stdout.isTTY);
        if (!this.isInteractive) {
            return;
        }

        this.render();
        this.interval = setInterval(() => this.render(), PROGRESS_REFRESH_INTERVAL_MS);
    }

    /**
     * Updates the progress statistics shown in the header.
     */
    public update(stats: PromptStats): void {
        this.stats = stats;
        this.render();
    }

    /**
     * Stops the automatic refresh cycle and renders the final header once more.
     */
    public stop(): void {
        if (!this.isInteractive) {
            return;
        }

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }

        this.render();
    }

    /**
     * Repaint the header without disturbing the current cursor position.
     */
    private render(): void {
        if (!this.isInteractive) {
            return;
        }

        const line = this.buildProgressLine();
        process.stdout.write('\x1b[s');
        cursorTo(process.stdout, 0, 0);
        clearLine(process.stdout, 0);
        process.stdout.write(line);
        process.stdout.write('\x1b[u');
    }

    /**
     * Builds the coloured progress text padded to the terminal width.
     */
    private buildProgressLine(): string {
        const totalPrompts = this.stats.done + this.stats.forAgent + this.stats.toBeWritten;
        const completedPrompts = this.stats.done;
        const percentage = totalPrompts > 0 ? Math.round((completedPrompts / totalPrompts) * 100) : 0;
        const elapsed = moment.duration(moment().diff(this.startTime));
        const elapsedText = formatDurationBrief(elapsed);

        let estimatedTotalText = '—';
        let estimatedLabel = 'unknown';

        if (totalPrompts > 0 && completedPrompts > 0) {
            const estimatedTotalMs = (elapsed.asMilliseconds() * totalPrompts) / completedPrompts;
            const estimatedTotalDuration = moment.duration(estimatedTotalMs);
            estimatedTotalText = formatDurationBrief(estimatedTotalDuration);
            const estimatedCompletion = this.startTime.clone().add(estimatedTotalDuration);
            estimatedLabel = estimatedCompletion.calendar(null, ESTIMATED_DONE_CALENDAR_FORMATS);
        }

        const totalLabel = `${completedPrompts}/${totalPrompts} Prompts`;
        const baseLine = `${totalLabel} | ${percentage}% | ${elapsedText}/${estimatedTotalText} | Estimated done ${estimatedLabel}`;
        const columns = process.stdout.columns ?? baseLine.length;
        const padded = baseLine.padEnd(columns > baseLine.length ? columns : baseLine.length);
        return colors.bgWhite(colors.black(padded));
    }
}

/**
 * Formats a duration into a compact string such as "3h 12m" or "45s".
 */
function formatDurationBrief(duration: moment.Duration): string {
    const totalSeconds = Math.max(0, Math.round(duration.asSeconds()));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];

    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (!parts.length && seconds > 0) {
        parts.push(`${seconds}s`);
    }
    if (!parts.length) {
        parts.push('0s');
    }

    return parts.join(' ');
}

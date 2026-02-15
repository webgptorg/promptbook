import colors from 'colors';
import moment from 'moment';
import { clearLine, cursorTo } from 'readline';
import type { PromptStats } from '../prompts/types/PromptStats';

/** Refresh interval for the progress header in milliseconds. */
const PROGRESS_REFRESH_INTERVAL_MS = 1000;

/** Number of terminal lines reserved for the sticky progress header. */
const PROGRESS_HEADER_RESERVED_LINES = 1;

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
 * Computed values used when rendering the progress header.
 */
type ProgressSnapshot = {
    totalPrompts: number;
    completedPrompts: number;
    percentage: number;
    elapsedText: string;
    estimatedTotalText: string;
    estimatedLabel: string;
};

/**
 * Compact CLI progress display that stays pinned at the top of the terminal.
 */
export class CliProgressDisplay {
    private stats: PromptStats = { done: 0, forAgent: 0, belowMinimumPriority: 0, toBeWritten: 0 };
    private readonly isInteractive: boolean;
    private isHeaderReserved = false;
    private interval: NodeJS.Timeout | undefined;

    /**
     * Creates a new display that uses the provided start time when computing estimates.
     */
    public constructor(private readonly startTime: moment.Moment) {
        this.isInteractive = Boolean(process.stdout.isTTY);
        if (!this.isInteractive) {
            return;
        }

        this.reserveHeaderLine();
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
     * Reserves a terminal line so subsequent output stays below the sticky header.
     */
    private reserveHeaderLine(): void {
        if (this.isHeaderReserved) {
            return;
        }

        process.stdout.write('\n'.repeat(PROGRESS_HEADER_RESERVED_LINES));
        this.isHeaderReserved = true;
    }

    /**
     * Builds the coloured progress text padded to the terminal width.
     */
    private buildProgressLine(): string {
        const snapshot = buildProgressSnapshot(this.stats, this.startTime);
        const totalLabel = `${snapshot.completedPrompts}/${snapshot.totalPrompts} Prompts`;
        const baseLine = `${totalLabel} | ${snapshot.percentage}% | ${snapshot.elapsedText}/${snapshot.estimatedTotalText} | Estimated done ${snapshot.estimatedLabel}`;
        const columns = process.stdout.columns ?? baseLine.length;
        const padded = baseLine.padEnd(columns > baseLine.length ? columns : baseLine.length);
        return colors.bgWhite(colors.black(padded));
    }
}

/**
 * Calculates progress metrics shown in the sticky header.
 */
function buildProgressSnapshot(stats: PromptStats, startTime: moment.Moment): ProgressSnapshot {
    const totalPrompts = stats.done + stats.forAgent + stats.toBeWritten;
    const completedPrompts = stats.done;
    const percentage = totalPrompts > 0 ? Math.round((completedPrompts / totalPrompts) * 100) : 0;
    const elapsedDuration = moment.duration(moment().diff(startTime));
    const elapsedText = formatDurationBrief(elapsedDuration);

    let estimatedTotalText = '—';
    let estimatedLabel = 'unknown';

    if (totalPrompts > 0 && completedPrompts > 0) {
        const estimatedTotalMs = (elapsedDuration.asMilliseconds() * totalPrompts) / completedPrompts;
        const estimatedTotalDuration = moment.duration(estimatedTotalMs);
        const estimatedCompletion = startTime.clone().add(estimatedTotalDuration);

        estimatedTotalText = formatDurationBrief(estimatedTotalDuration);
        estimatedLabel = estimatedCompletion.calendar(null, ESTIMATED_DONE_CALENDAR_FORMATS);
    }

    return {
        totalPrompts,
        completedPrompts,
        percentage,
        elapsedText,
        estimatedTotalText,
        estimatedLabel,
    };
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

import colors from 'colors';
import moment from 'moment';
import { clearLine, cursorTo } from 'readline';
import type { PromptStats } from '../prompts/types/PromptStats';
import { buildCoderRunProgressSnapshot } from './buildCoderRunProgressSnapshot';
import { CoderRunTimer } from './CoderRunTimer';

/**
 * Refresh interval for the progress header in milliseconds.
 */
const PROGRESS_REFRESH_INTERVAL_MS = 1000;

/**
 * Number of terminal lines reserved for the sticky progress header.
 */
const PROGRESS_HEADER_RESERVED_LINES = 3;

/**
 * Compact CLI progress display that stays pinned at the top of the terminal.
 */
export class CliProgressDisplay {
    private stats: PromptStats = { done: 0, forAgent: 0, belowMinimumPriority: 0, toBeWritten: 0 };

    /**
     * Initial number of completed prompts when the session started.
     * Used to calculate session progress.
     */
    private initialDone: number | undefined;

    private readonly isInteractive: boolean;
    private readonly timer: CoderRunTimer;
    private isHeaderReserved = false;
    private interval: NodeJS.Timeout | undefined;

    /**
     * Creates a new display that uses the provided start time when computing estimates.
     */
    public constructor(
        startTime: moment.Moment,
        private readonly minimumPriority: number,
    ) {
        this.isInteractive = Boolean(process.stdout.isTTY);
        this.timer = new CoderRunTimer(startTime);
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
        if (
            this.initialDone === undefined &&
            (stats.done > 0 || stats.forAgent > 0 || stats.toBeWritten > 0)
        ) {
            this.initialDone = stats.done;
        }

        this.stats = stats;
        this.render();
    }

    /**
     * Pauses the active timer while the runner is waiting for user input.
     */
    public pauseTimer(): void {
        this.timer.pause();
        this.render();
    }

    /**
     * Resumes the active timer after a pause.
     */
    public resumeTimer(): void {
        this.timer.resume();
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

        const lines = this.buildProgressLines();
        process.stdout.write('\x1b[s');
        for (let lineIndex = 0; lineIndex < PROGRESS_HEADER_RESERVED_LINES; lineIndex++) {
            cursorTo(process.stdout, 0, lineIndex);
            clearLine(process.stdout, 0);
            process.stdout.write(lines[lineIndex] ?? '');
        }
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
     * Builds the colored progress text padded to the terminal width.
     */
    private buildProgressLines(): readonly string[] {
        const snapshot = buildCoderRunProgressSnapshot(
            this.stats,
            this.timer.getElapsedDuration(),
            this.initialDone ?? this.stats.done,
        );
        const columns = Math.max(40, process.stdout.columns ?? 80);
        const workingLine =
            snapshot.sessionTotal > 0
                ? [
                      `Working on ${snapshot.currentPromptIndex}/${snapshot.sessionTotal} prompts`,
                      `Priority >=${this.minimumPriority}`,
                      `Repo total ${snapshot.totalPrompts}`,
                  ].join(' | ')
                : [`No runnable prompts`, `Priority >=${this.minimumPriority}`, `Repo total ${snapshot.totalPrompts}`].join(
                      ' | ',
                  );
        const detailParts = [
            `Done ${snapshot.sessionDone}/${snapshot.sessionTotal} this run`,
            `Elapsed ${snapshot.elapsedText} / ${snapshot.estimatedTotalText}`,
            `Est. done ${snapshot.estimatedLabel}`,
        ];

        if (snapshot.skippedPrompts > 0) {
            detailParts.splice(1, 0, `Skipping ${snapshot.skippedPrompts} prompts with Priority <${this.minimumPriority}`);
        }
        if (snapshot.toBeWrittenPrompts > 0) {
            detailParts.splice(
                detailParts.length - 2,
                0,
                `Write first ${formatPromptCount(snapshot.toBeWrittenPrompts)}`,
            );
        }

        const progressLabel = `${snapshot.percentage}% complete (${snapshot.sessionDone}/${snapshot.sessionTotal} done)`;
        const progressBar = buildProgressBar(snapshot.percentage, progressLabel, columns);

        return [
            colors.bgCyan.black(padPlainText(workingLine, columns)),
            colors.bgBlack.white(padPlainText(detailParts.join(' | '), columns)),
            colors.bgBlack(progressBar),
        ];
    }
}

/**
 * Builds a colored progress bar with an explicit completion label.
 */
function buildProgressBar(percentage: number, label: string, width: number): string {
    const safeLabel = ` ${label}`;
    const barWidth = Math.max(10, width - safeLabel.length);
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = Math.max(0, barWidth - filledWidth);
    return `${colors.green('█'.repeat(filledWidth))}${colors.gray('░'.repeat(emptyWidth))}${safeLabel}`;
}

/**
 * Pads or truncates one plain-text header line to the terminal width.
 */
function padPlainText(text: string, width: number): string {
    if (text.length > width) {
        if (width <= 3) {
            return '.'.repeat(width);
        }

        return `${text.slice(0, width - 3)}...`;
    }

    return text.padEnd(width);
}

/**
 * Formats a prompt count with the correct singular/plural noun.
 */
function formatPromptCount(count: number): string {
    return `${count} prompt${count === 1 ? '' : 's'}`;
}

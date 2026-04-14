import { EventEmitter } from 'events';
import moment from 'moment';
import type { PromptStats } from '../prompts/types/PromptStats';

/**
 * Maximum number of agent output lines kept in the scrolling output area.
 *
 * @private internal constant of coder run UI
 */
const MAX_AGENT_OUTPUT_LINES = 12;

/**
 * Calendar formats used when displaying the estimated completion time.
 *
 * @private internal constant of coder run UI
 */
const ESTIMATED_DONE_CALENDAR_FORMATS = {
    sameDay: '[Today] h:mm',
    nextDay: '[Tomorrow] h:mm',
    nextWeek: 'dddd h:mm',
    lastDay: '[Yesterday] h:mm',
    lastWeek: 'dddd h:mm',
    sameElse: 'MMM D h:mm',
};

/**
 * Execution phase of the coder run process.
 *
 * @private internal type of coder run UI
 */
export type CoderRunPhase = 'initializing' | 'loading' | 'running' | 'verifying' | 'paused' | 'done' | 'error';

/**
 * Configuration display data for the coder run UI header.
 *
 * @private internal type of coder run UI
 */
export type CoderRunConfig = {
    readonly agentName: string;
    readonly modelName?: string;
    readonly thinkingLevel?: string;
    readonly context?: string;
    readonly priority: number;
    readonly testCommand?: string;
};

/**
 * Computed progress snapshot for the coder run UI.
 *
 * @private internal type of coder run UI
 */
export type CoderRunProgressSnapshot = {
    readonly totalPrompts: number;
    readonly sessionDone: number;
    readonly sessionTotal: number;
    readonly percentage: number;
    readonly elapsedText: string;
    readonly estimatedTotalText: string;
    readonly estimatedLabel: string;
};

/**
 * Reactive state manager for the coder run terminal UI.
 *
 * Holds all data the Ink components need and emits `'change'` events
 * whenever any property is updated so the UI can re-render.
 *
 * @private internal utility of coder run UI
 */
export class CoderRunUiState extends EventEmitter {
    public config: CoderRunConfig = { agentName: '', priority: 0 };
    public currentPromptLabel = '';
    public currentAttempt = 1;
    public maxAttempts = 3;
    public agentOutputLines: string[] = [];
    public phase: CoderRunPhase = 'initializing';
    public statusMessage = 'Initializing...';
    public errors: string[] = [];

    private stats: PromptStats = { done: 0, forAgent: 0, belowMinimumPriority: 0, toBeWritten: 0 };
    private readonly startTime: moment.Moment;
    private initialDone: number | undefined;

    /**
     * Total milliseconds the timer was paused/waiting (excluded from elapsed display).
     */
    private pausedMs = 0;

    /**
     * Timestamp when the timer was last paused, or `undefined` when running.
     */
    private pausedSince: moment.Moment | undefined;

    public constructor(startTime: moment.Moment) {
        super();
        this.startTime = startTime;
        // Timer starts paused — callers call `resumeTimer()` when actual work begins.
        this.pausedSince = startTime.clone();
    }

    /**
     * Pauses the elapsed timer (e.g. while waiting for user input or paused state).
     */
    public pauseTimer(): void {
        if (this.pausedSince === undefined) {
            this.pausedSince = moment();
        }
    }

    /**
     * Resumes the elapsed timer after a pause.
     */
    public resumeTimer(): void {
        if (this.pausedSince !== undefined) {
            this.pausedMs += moment().diff(this.pausedSince);
            this.pausedSince = undefined;
        }
    }

    /**
     * Replaces the configuration shown in the UI header.
     */
    public setConfig(config: CoderRunConfig): void {
        this.config = config;
        this.emitChange();
    }

    /**
     * Feeds new prompt statistics from the main loop so the progress bar updates.
     */
    public updateProgress(stats: PromptStats): void {
        if (this.initialDone === undefined && (stats.done > 0 || stats.forAgent > 0 || stats.toBeWritten > 0)) {
            this.initialDone = stats.done;
        }
        this.stats = stats;
        this.emitChange();
    }

    /**
     * Computes a progress snapshot on demand so elapsed time ticks with periodic re-renders.
     */
    public getProgress(): CoderRunProgressSnapshot {
        const stats = this.stats;
        const totalPrompts = stats.done + stats.forAgent + stats.toBeWritten;
        const sessionDone = Math.max(0, stats.done - (this.initialDone ?? stats.done));
        const sessionTotal = sessionDone + stats.forAgent;
        const percentage = totalPrompts > 0 ? Math.round((stats.done / totalPrompts) * 100) : 0;

        const wallMs = moment().diff(this.startTime);
        const currentPauseMs = this.pausedSince !== undefined ? moment().diff(this.pausedSince) : 0;
        const activeMs = Math.max(0, wallMs - this.pausedMs - currentPauseMs);
        const elapsedDuration = moment.duration(activeMs);
        const elapsedText = formatDurationBrief(elapsedDuration);

        let estimatedTotalText = '\u2014';
        let estimatedLabel = 'unknown';

        if (totalPrompts > 0 && stats.done > 0) {
            const estimatedTotalMs = (elapsedDuration.asMilliseconds() * totalPrompts) / stats.done;
            const estimatedRemainingMs = estimatedTotalMs - elapsedDuration.asMilliseconds();
            const estimatedTotalDuration = moment.duration(estimatedTotalMs);
            const estimatedCompletion = moment().add(estimatedRemainingMs, 'milliseconds');
            estimatedTotalText = formatDurationBrief(estimatedTotalDuration);
            estimatedLabel = estimatedCompletion.calendar(null, ESTIMATED_DONE_CALENDAR_FORMATS);
        }

        return {
            totalPrompts,
            sessionDone,
            sessionTotal,
            percentage,
            elapsedText,
            estimatedTotalText,
            estimatedLabel,
        };
    }

    /**
     * Sets the label of the prompt currently being processed and resets per-prompt state.
     */
    public setCurrentPrompt(label: string): void {
        this.currentPromptLabel = label;
        this.agentOutputLines = [];
        this.currentAttempt = 1;
        this.emitChange();
    }

    /**
     * Updates the current retry attempt number.
     */
    public setAttempt(attempt: number): void {
        this.currentAttempt = attempt;
        this.emitChange();
    }

    /**
     * Appends raw agent output text, keeping only the last `MAX_AGENT_OUTPUT_LINES`.
     */
    public addAgentOutput(text: string): void {
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
        if (lines.length === 0) {
            return;
        }
        this.agentOutputLines.push(...lines);
        if (this.agentOutputLines.length > MAX_AGENT_OUTPUT_LINES) {
            this.agentOutputLines = this.agentOutputLines.slice(-MAX_AGENT_OUTPUT_LINES);
        }
        this.emitChange();
    }

    /**
     * Transitions the execution phase shown in the UI.
     */
    public setPhase(phase: CoderRunPhase): void {
        this.phase = phase;
        this.emitChange();
    }

    /**
     * Updates the status message line beneath the current prompt label.
     */
    public setStatusMessage(message: string): void {
        this.statusMessage = message;
        this.emitChange();
    }

    /**
     * Appends an error message to the error list shown in the UI.
     */
    public addError(errorMessage: string): void {
        this.errors.push(errorMessage);
        this.emitChange();
    }

    private emitChange(): void {
        this.emit('change');
    }
}

/**
 * Formats a duration into a compact string such as "3h 12m" or "45s".
 *
 * @private internal utility of coder run UI
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

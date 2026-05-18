import { EventEmitter } from 'events';
import moment from 'moment';
import { buildCoderRunProgressSnapshot, type CoderRunProgressSnapshot } from '../common/buildCoderRunProgressSnapshot';
import type {
    AgentRunMessagePreviewSection,
    AgentRunStatusTableRow,
} from './buildCoderRunUiFrame';
import { CoderRunTimer } from '../common/CoderRunTimer';
import type { PromptStats } from '../prompts/types/PromptStats';

/**
 * Maximum number of agent output lines kept in the scrolling output area.
 *
 * @private internal constant of coder run UI
 */
const MAX_AGENT_OUTPUT_LINES = 12;

/**
 * Execution phase of the coder run process.
 *
 * @private internal type of coder run UI
 */
export type CoderRunPhase =
    | 'initializing'
    | 'loading'
    | 'running'
    | 'verifying'
    | 'waiting'
    | 'paused'
    | 'done'
    | 'error';

/**
 * Configuration display data for the coder run UI header.
 *
 * @private internal type of coder run UI
 */
export type CoderRunConfig = {
    readonly agentName: string;
    readonly localAgentName?: string;
    readonly modelName?: string;
    readonly thinkingLevel?: string;
    readonly context?: string;
    readonly priority: number;
    readonly testCommand?: string;
};

/**
 * Re-exported shared progress snapshot type used by the coder run UI.
 *
 * @private internal type of coder run UI
 */
export type { CoderRunProgressSnapshot };

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
    public detailLines: string[] = [];
    public messagePreviewLines: string[] = [];
    public messagePreviewSections: AgentRunMessagePreviewSection[] = [];
    public agentStatusLines: string[] = [];
    public agentStatusTableRows: AgentRunStatusTableRow[] = [];
    public pendingEnterLabel: string | undefined;
    public agentOutputLines: string[] = [];
    public phase: CoderRunPhase = 'initializing';
    public statusMessage = 'Initializing...';
    public errors: string[] = [];

    private stats: PromptStats = { done: 0, forAgent: 0, belowMinimumPriority: 0, toBeWritten: 0 };
    private readonly timer: CoderRunTimer;
    private initialDone: number | undefined;

    public constructor(startTime: moment.Moment) {
        super();
        // Match the plain CLI progress header and count active run time from startup.
        // Explicit waits/pauses are excluded later through `pauseTimer()` / `resumeTimer()`.
        this.timer = new CoderRunTimer(startTime);
    }

    /**
     * Pauses the elapsed timer (e.g. while waiting for user input or paused state).
     */
    public pauseTimer(): void {
        this.timer.pause();
        this.emitChange();
    }

    /**
     * Resumes the elapsed timer after a pause.
     */
    public resumeTimer(): void {
        this.timer.resume();
        this.emitChange();
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
        return buildCoderRunProgressSnapshot(
            this.stats,
            this.timer.getElapsedDuration(),
            this.initialDone ?? this.stats.done,
        );
    }

    /**
     * Sets the label of the prompt currently being processed and resets per-prompt state.
     */
    public setCurrentPrompt(label: string): void {
        this.currentPromptLabel = label;
        this.detailLines = [];
        this.messagePreviewLines = [];
        this.messagePreviewSections = [];
        this.pendingEnterLabel = undefined;
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
     * Replaces the contextual detail lines shown beneath the current prompt status.
     */
    public setDetailLines(detailLines: string[]): void {
        this.detailLines = detailLines.filter((detailLine) => detailLine.trim() !== '');
        this.emitChange();
    }

    /**
     * Replaces the exact user-message preview lines shown in agent-specific panels.
     */
    public setMessagePreviewLines(messagePreviewLines: string[]): void {
        this.messagePreviewLines = [...messagePreviewLines];
        this.emitChange();
    }

    /**
     * Replaces the structured user-message panels shown in agent-specific dashboards.
     */
    public setMessagePreviewSections(messagePreviewSections: AgentRunMessagePreviewSection[]): void {
        this.messagePreviewSections = [...messagePreviewSections];
        this.emitChange();
    }

    /**
     * Replaces agent status rows shown by agent-specific terminal frames.
     */
    public setAgentStatusLines(agentStatusLines: string[]): void {
        this.agentStatusLines = [...agentStatusLines];
        this.emitChange();
    }

    /**
     * Replaces structured agent status rows shown by agent-specific terminal frames.
     */
    public setAgentStatusTableRows(agentStatusTableRows: AgentRunStatusTableRow[]): void {
        this.agentStatusTableRows = [...agentStatusTableRows];
        this.emitChange();
    }

    /**
     * Sets or clears the Enter-key action label shown in the controls panel.
     */
    public setPendingEnterLabel(pendingEnterLabel: string | undefined): void {
        this.pendingEnterLabel = pendingEnterLabel;
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

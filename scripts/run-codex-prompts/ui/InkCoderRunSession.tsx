import React, { useSyncExternalStore } from 'react';
import { Box, render, Text, useInput } from 'ink';
import type { PromptStats } from '../prompts/types/PromptStats';
import {
    buildProgressSnapshot,
    formatProgressSummary,
    type ProgressSnapshot,
} from '../common/cliProgressDisplay';
import {
    extractThinkingMessageFromOutputLine,
    isImportantCoderRunOutputLine,
    sanitizeCoderRunOutputLine,
} from './CoderRunThinkingMessage';
import {
    buildInitialCoderRunRunnerState,
    type CoderRunLogLevel,
    type CoderRunOutputSource,
    type CoderRunPauseState,
    type CoderRunPromptState,
    type CoderRunRunnerState,
    type CoderRunSession,
    type CoderRunSessionOptions,
} from './CoderRunSession';

/**
 * Maximum number of event-log lines kept in memory.
 */
const MAX_LOG_ENTRIES = 200;

/**
 * Number of recent log lines rendered in the event panel.
 */
const LOG_LINES_VISIBLE = 8;

/**
 * Width of the ASCII loading bar rendered below the summary line.
 */
const LOADING_BAR_WIDTH = 40;

/**
 * One line in the recent event-log panel.
 */
type CoderRunUiLogEntry = {
    id: number;
    level: CoderRunLogLevel;
    message: string;
};

/**
 * Immutable state snapshot consumed by the Ink app.
 */
type InkCoderRunSessionState = {
    startTime: CoderRunSessionOptions['startTime'];
    stats: PromptStats;
    initialDone?: number;
    runnerState: CoderRunRunnerState;
    currentPrompt?: CoderRunPromptState;
    currentThinkingMessage?: string;
    pauseState: CoderRunPauseState;
    waitPrompt?: string;
    logs: ReadonlyArray<CoderRunUiLogEntry>;
};

/**
 * Minimal external store used to bridge imperative runner updates into React rendering.
 */
class InkCoderRunSessionStore {
    private state: InkCoderRunSessionState;
    private readonly listeners = new Set<() => void>();

    /**
     * Creates a new store with one initial UI snapshot.
     */
    public constructor(initialState: InkCoderRunSessionState) {
        this.state = initialState;
    }

    /**
     * Returns the current snapshot for `useSyncExternalStore`.
     */
    public getSnapshot = (): InkCoderRunSessionState => this.state;

    /**
     * Subscribes one listener to future state changes.
     */
    public subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    /**
     * Applies one immutable state update and notifies all subscribers.
     */
    public update(updater: (state: InkCoderRunSessionState) => InkCoderRunSessionState): void {
        this.state = updater(this.state);
        for (const listener of this.listeners) {
            listener();
        }
    }
}

/**
 * Ink-backed coding-run session with pause controls, live thinking updates, and recent logs.
 */
export class InkCoderRunSession implements CoderRunSession {
    public readonly isTerminalUi = true;
    private readonly store: InkCoderRunSessionStore;
    private readonly inkInstance: ReturnType<typeof render>;
    private readonly outputBuffers: Record<CoderRunOutputSource, string> = { stdout: '', stderr: '' };
    private nextLogId = 1;
    private pauseResumeResolver: (() => void) | undefined;
    private enterResolver: (() => void) | undefined;

    /**
     * Logger that routes all workflow messages into the Ink store.
     */
    public readonly logger = {
        info: (message: string): void => {
            this.appendLog('info', message);
        },
        warn: (message: string): void => {
            this.appendLog('warn', message);
        },
        error: (message: string): void => {
            this.appendLog('error', message);
        },
        rawOutput: (chunk: string, source: CoderRunOutputSource): void => {
            this.handleRawOutput(chunk, source);
        },
    };

    /**
     * Creates a new Ink session and mounts the terminal application immediately.
     */
    public constructor(options: CoderRunSessionOptions) {
        this.store = new InkCoderRunSessionStore({
            startTime: options.startTime,
            stats: { done: 0, forAgent: 0, belowMinimumPriority: 0, toBeWritten: 0 },
            runnerState: buildInitialCoderRunRunnerState(options.runOptions),
            pauseState: 'RUNNING',
            logs: [],
        });

        this.inkInstance = render(<PromptbookCoderInkApp store={this.store} session={this} />, {
            exitOnCtrlC: true,
        });
    }

    /**
     * Merges newly resolved runner metadata into the rendered header.
     */
    public setRunnerState(runnerState: Partial<CoderRunRunnerState>): void {
        this.store.update((state) => ({
            ...state,
            runnerState: {
                ...state.runnerState,
                ...runnerState,
            },
        }));
    }

    /**
     * Updates progress stats and preserves the initial completed-count baseline for session progress.
     */
    public updateStats(stats: PromptStats): void {
        this.store.update((state) => ({
            ...state,
            stats,
            initialDone:
                state.initialDone ??
                ((stats.done > 0 || stats.forAgent > 0 || stats.toBeWritten > 0) ? stats.done : undefined),
        }));
    }

    /**
     * Updates the currently running prompt card.
     */
    public setCurrentPrompt(prompt?: CoderRunPromptState): void {
        this.store.update((state) => ({
            ...state,
            currentPrompt: prompt,
            currentThinkingMessage: prompt ? state.currentThinkingMessage : undefined,
        }));
    }

    /**
     * Sets the latest short thinking/status line from the active runner.
     */
    public setThinkingMessage(message?: string): void {
        const sanitizedMessage = message ? sanitizeCoderRunOutputLine(message) : undefined;
        this.store.update((state) => ({
            ...state,
            currentThinkingMessage: sanitizedMessage || undefined,
        }));
    }

    /**
     * Waits until a pending pause request is resumed from the Ink input handler.
     */
    public async checkPause(): Promise<void> {
        if (this.store.getSnapshot().pauseState !== 'PAUSING') {
            return;
        }

        this.store.update((state) => ({
            ...state,
            pauseState: 'PAUSED',
        }));
        this.appendLog('info', 'Paused (press "p" to resume)');

        await new Promise<void>((resolve) => {
            this.pauseResumeResolver = resolve;
        });
    }

    /**
     * Shows one inline Enter prompt inside the Ink UI and resolves once the user confirms it.
     */
    public async waitForEnter(prompt: string): Promise<void> {
        await new Promise<void>((resolve) => {
            this.enterResolver = resolve;
            this.store.update((state) => ({
                ...state,
                waitPrompt: sanitizeCoderRunOutputLine(prompt) || prompt.trim(),
            }));
        });
    }

    /**
     * Flushes remaining raw output and unmounts the Ink application.
     */
    public stop(): void {
        this.flushRawOutputBuffer('stdout');
        this.flushRawOutputBuffer('stderr');

        const pauseResumeResolver = this.pauseResumeResolver;
        this.pauseResumeResolver = undefined;
        pauseResumeResolver?.();

        const enterResolver = this.enterResolver;
        this.enterResolver = undefined;
        enterResolver?.();

        this.inkInstance.unmount();
    }

    /**
     * Handles `p` and Enter key presses coming from the Ink input hook.
     */
    public handleInput(input: string, key: { return?: boolean }): void {
        if (key.return) {
            this.confirmPendingEnter();
            return;
        }

        if (input.toLowerCase() === 'p') {
            this.togglePause();
        }
    }

    /**
     * Toggles the pause state shown in the activity panel.
     */
    private togglePause(): void {
        const pauseState = this.store.getSnapshot().pauseState;

        if (pauseState === 'RUNNING') {
            this.store.update((state) => ({
                ...state,
                pauseState: 'PAUSING',
            }));
            this.appendLog('info', 'Pausing...');
            return;
        }

        if (pauseState === 'PAUSING') {
            this.store.update((state) => ({
                ...state,
                pauseState: 'RUNNING',
            }));
            this.appendLog('info', 'Pause cancelled. Resuming...');
            return;
        }

        this.store.update((state) => ({
            ...state,
            pauseState: 'RUNNING',
        }));
        this.appendLog('info', 'Resuming...');
        const pauseResumeResolver = this.pauseResumeResolver;
        this.pauseResumeResolver = undefined;
        pauseResumeResolver?.();
    }

    /**
     * Resolves the current Enter prompt when present.
     */
    private confirmPendingEnter(): void {
        if (!this.enterResolver) {
            return;
        }

        const enterResolver = this.enterResolver;
        this.enterResolver = undefined;
        this.store.update((state) => ({
            ...state,
            waitPrompt: undefined,
        }));
        enterResolver();
    }

    /**
     * Splits one raw stdout/stderr chunk into logical lines, updates the event log, and refreshes the thinking panel.
     */
    private handleRawOutput(chunk: string, source: CoderRunOutputSource): void {
        if (!chunk) {
            return;
        }

        this.outputBuffers[source] += chunk.replace(/\r/g, '');
        this.flushCompletedRawOutputLines(source);
    }

    /**
     * Flushes completed lines for one output stream while keeping a trailing incomplete line buffered.
     */
    private flushCompletedRawOutputLines(source: CoderRunOutputSource): void {
        const lines = this.outputBuffers[source].split('\n');
        this.outputBuffers[source] = lines.pop() ?? '';

        for (const line of lines) {
            this.processOutputLine(line, source);
        }
    }

    /**
     * Flushes any trailing buffered output before the session is stopped.
     */
    private flushRawOutputBuffer(source: CoderRunOutputSource): void {
        const bufferedLine = this.outputBuffers[source];
        this.outputBuffers[source] = '';

        if (bufferedLine) {
            this.processOutputLine(bufferedLine, source);
        }
    }

    /**
     * Applies one sanitized output line to the current thinking message and optional live event log.
     */
    private processOutputLine(line: string, source: CoderRunOutputSource): void {
        const sanitizedLine = sanitizeCoderRunOutputLine(line);
        if (!sanitizedLine) {
            return;
        }

        if (isImportantCoderRunOutputLine(sanitizedLine, source)) {
            this.appendLog(source === 'stderr' ? inferErrorLevel(sanitizedLine) : 'info', sanitizedLine);
        }

        const thinkingMessage = extractThinkingMessageFromOutputLine(sanitizedLine);
        if (thinkingMessage) {
            this.setThinkingMessage(thinkingMessage);
        }
    }

    /**
     * Adds one or more normalized log lines to the recent-event panel.
     */
    private appendLog(level: CoderRunLogLevel, message: string): void {
        const normalizedLines = message
            .split(/\r?\n/)
            .map((line) => sanitizeCoderRunOutputLine(line))
            .filter(Boolean);

        if (normalizedLines.length === 0) {
            return;
        }

        this.store.update((state) => {
            const logs = [...state.logs];

            for (const normalizedLine of normalizedLines) {
                logs.push({
                    id: this.nextLogId++,
                    level,
                    message: normalizedLine,
                });
            }

            return {
                ...state,
                logs: logs.slice(-MAX_LOG_ENTRIES),
            };
        });
    }
}

/**
 * Root Ink application bound to the external session store.
 */
function PromptbookCoderInkApp(props: {
    store: InkCoderRunSessionStore;
    session: InkCoderRunSession;
}): React.JSX.Element {
    const state = useSyncExternalStore(props.store.subscribe, props.store.getSnapshot, props.store.getSnapshot);
    const progressSnapshot = buildProgressSnapshot(
        state.stats,
        state.startTime,
        state.initialDone ?? state.stats.done,
    );
    const loadingBar = buildLoadingBar(progressSnapshot);
    const visibleLogs = state.logs.slice(-LOG_LINES_VISIBLE);
    const promptLabel = state.currentPrompt
        ? `${state.currentPrompt.label} | Attempt ${state.currentPrompt.attemptCount}`
        : 'Waiting for the next prompt';
    const promptSummary = state.currentPrompt?.summary ?? 'No active prompt.';
    const thinkingMessage = state.currentThinkingMessage ?? buildIdleThinkingMessage(state.pauseState, state.waitPrompt);

    useInput((input, key) => {
        props.session.handleInput(input, key);
    });

    return (
        <Box flexDirection="column" paddingX={1}>
            <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column">
                <Text color="cyan">PROMPTBOOK CODER</Text>
                <Text color="gray">{buildControlsLine(state.pauseState, state.waitPrompt)}</Text>
                <Text>{buildPrimaryRunnerLine(state.runnerState)}</Text>
                <Text>{buildSecondaryRunnerLine(state.runnerState)}</Text>
            </Box>

            <Box marginTop={1} borderStyle="round" borderColor="blue" paddingX={1} flexDirection="column">
                <Text color="blue">{formatProgressSummary(progressSnapshot)}</Text>
                <Text color="green">{loadingBar}</Text>
                <Text>{promptLabel}</Text>
                <Text dimColor>{promptSummary}</Text>
            </Box>

            <Box marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
                <Text color="yellow">{buildPauseStatusLine(state.pauseState, state.waitPrompt)}</Text>
                <Text>{thinkingMessage}</Text>
                {state.waitPrompt ? <Text color="cyan">{state.waitPrompt}</Text> : null}
            </Box>

            <Box marginTop={1} borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column">
                <Text color="magenta">Recent events</Text>
                {visibleLogs.length === 0 ? (
                    <Text dimColor>No events yet.</Text>
                ) : (
                    visibleLogs.map((logEntry) => (
                        <Text key={logEntry.id} color={getLogColor(logEntry.level)}>
                            {`${logEntry.level.toUpperCase()}: ${logEntry.message}`}
                        </Text>
                    ))
                )}
            </Box>
        </Box>
    );
}

/**
 * Builds the top-line runner summary.
 */
function buildPrimaryRunnerLine(runnerState: CoderRunRunnerState): string {
    return [
        `Agent: ${runnerState.agentName ?? 'n/a'}`,
        `Runner: ${runnerState.runnerName}`,
        `Model: ${runnerState.modelName ?? 'default'}`,
        `Thinking: ${runnerState.thinkingLevel ?? 'default'}`,
    ].join(' | ');
}

/**
 * Builds the secondary runner summary with execution toggles.
 */
function buildSecondaryRunnerLine(runnerState: CoderRunRunnerState): string {
    return [
        `Context: ${runnerState.context?.trim() || 'none'}`,
        `Priority: ${runnerState.priority}`,
        `Test: ${runnerState.testCommand ?? 'none'}`,
        `Wait: ${runnerState.waitForUser ? 'on' : 'off'}`,
        `Push: ${runnerState.noPush ? 'off' : 'on'}`,
        `Auto-migrate: ${runnerState.autoMigrate ? 'on' : 'off'}`,
        `Credits: ${runnerState.allowCredits ? 'on' : 'off'}`,
    ].join(' | ');
}

/**
 * Builds the small controls hint line below the product branding.
 */
function buildControlsLine(pauseState: CoderRunPauseState, waitPrompt?: string): string {
    const controls = ['[p] pause/resume'];
    if (waitPrompt) {
        controls.push('[enter] continue');
    }

    return `${controls.join(' | ')} | State: ${pauseState.toLowerCase()}`;
}

/**
 * Builds the activity-line heading shown above the current thinking message.
 */
function buildPauseStatusLine(pauseState: CoderRunPauseState, waitPrompt?: string): string {
    if (waitPrompt) {
        return 'Waiting for confirmation';
    }

    if (pauseState === 'PAUSED') {
        return 'Paused';
    }

    if (pauseState === 'PAUSING') {
        return 'Pause requested';
    }

    return 'Live runner activity';
}

/**
 * Provides a human-readable placeholder when the runner is idle or paused.
 */
function buildIdleThinkingMessage(pauseState: CoderRunPauseState, waitPrompt?: string): string {
    if (waitPrompt) {
        return 'Press Enter to continue this coding round.';
    }

    if (pauseState === 'PAUSED') {
        return 'The run is paused. Press "p" to resume.';
    }

    if (pauseState === 'PAUSING') {
        return 'The current prompt will pause after the active runner step finishes.';
    }

    return 'Waiting for live runner output...';
}

/**
 * Creates one ASCII loading bar for the current completion percentage.
 */
function buildLoadingBar(progressSnapshot: ProgressSnapshot): string {
    const filledWidth = Math.round((Math.max(0, Math.min(100, progressSnapshot.percentage)) / 100) * LOADING_BAR_WIDTH);
    return `[${'='.repeat(filledWidth)}${'-'.repeat(LOADING_BAR_WIDTH - filledWidth)}] ${progressSnapshot.percentage}%`;
}

/**
 * Maps one log severity level to an Ink text color.
 */
function getLogColor(level: CoderRunLogLevel): 'white' | 'yellow' | 'red' {
    if (level === 'warn') {
        return 'yellow';
    }

    if (level === 'error') {
        return 'red';
    }

    return 'white';
}

/**
 * Infers whether a stderr line is warning-like or error-like.
 */
function inferErrorLevel(message: string): CoderRunLogLevel {
    return /\berror\b|\bfailed?\b|\bexception\b/i.test(message) ? 'error' : 'warn';
}

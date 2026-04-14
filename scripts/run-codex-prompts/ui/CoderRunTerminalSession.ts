import React from 'react';
import type { Moment } from 'moment';
import { formatWithOptions } from 'util';
import type { RunOptions } from '../cli/RunOptions';
import { buildProgressLineText, buildProgressSnapshot } from '../common/cliProgressDisplay';
import type { PromptStats } from '../prompts/types/PromptStats';
import { extractCoderRunThinkingMessage } from './extractCoderRunThinkingMessage';
import { normalizeCoderRunConsoleText } from './normalizeCoderRunConsoleText';

/**
 * How many recent live events should be kept visible in the terminal UI.
 */
const MAX_VISIBLE_EVENTS = 8;

/**
 * Maximum length of one formatted live-event message in the UI.
 */
const MAX_EVENT_MESSAGE_LENGTH = 260;

/**
 * Maximum length of one metadata value in the compact header.
 */
const MAX_METADATA_VALUE_LENGTH = 64;

/**
 * Width of the ASCII loading bar.
 */
const PROGRESS_BAR_WIDTH = 30;

/**
 * Refresh interval used to keep elapsed-time estimates live.
 */
const UI_REFRESH_INTERVAL_MS = 1_000;

/**
 * Small debounce used to avoid rerendering Ink on every single output chunk.
 */
const RERENDER_DEBOUNCE_MS = 40;

/**
 * System info messages that should remain visible in the live event list.
 */
const PERSISTENT_INFO_PREFIXES = [
    'Running prompts with',
    'OpenAI Codex credit spending is disabled.',
    'Following prompts need to be written:',
    'Upcoming tasks',
    'Priority ',
    'No upcoming tasks.',
    'No prompts ready for agent.',
    'All prompts are done.',
    'Processing ',
    'Next prompt:',
    'Commit message:',
    'Running verification command after attempt #',
    'Normalized line endings',
    'Tip:',
    'Removed stale Git index lock:',
    'Pausing after current step...',
    'Pause cancelled. Resuming...',
    'Paused. Press "p" to resume.',
    'Resuming...',
] as const;

/**
 * Supported console levels forwarded into the UI session.
 */
type CoderRunConsoleLevel = 'info' | 'warn' | 'error';

/**
 * Pause lifecycle states for the Promptbook coder session.
 */
type CoderRunPauseState = 'RUNNING' | 'PAUSING' | 'PAUSED';

/**
 * One log item shown in the live events area of the terminal UI.
 */
type CoderRunTerminalEvent = {
    id: number;
    level: CoderRunConsoleLevel;
    message: string;
};

/**
 * Minimal key data needed from Ink's `useInput` hook.
 */
type CoderRunInputKey = {
    ctrl: boolean;
    return: boolean;
    name?: string;
};

/**
 * Mutable UI state rendered by the Ink session.
 */
type CoderRunTerminalState = {
    stats: PromptStats;
    runnerName?: string;
    modelName?: string;
    currentPrompt?: string;
    currentAttempt?: number;
    currentThinkingMessage?: string;
    awaitingEnterPrompt?: string;
    pauseState: CoderRunPauseState;
    events: CoderRunTerminalEvent[];
};

/**
 * Props passed into the React tree rendered by Ink.
 */
type CoderRunTerminalAppProps = {
    ink: InkModule;
    options: RunOptions;
    state: CoderRunTerminalState;
    statusLine: string;
    progressBar: string;
    onInput: (input: string, key: CoderRunInputKey) => void;
};

/**
 * Minimal render instance shape returned by Ink.
 */
type InkRenderInstance = {
    rerender(tree: React.ReactElement): void;
    unmount(): void;
};

/**
 * Minimal Ink surface used by the terminal UI bridge.
 */
type InkModule = {
    Box: React.ComponentType<Record<string, unknown>>;
    Text: React.ComponentType<Record<string, unknown>>;
    useInput: (callback: (input: string, key: { ctrl?: boolean; return?: boolean; name?: string }) => void) => void;
    render: (tree: React.ReactElement) => InkRenderInstance;
};

/**
 * Dynamically loads Ink without requiring the repository TypeScript config to understand Ink's ESM exports.
 */
const loadInkModule = new Function('return import("ink")') as () => Promise<unknown>;

/**
 * Live Ink session backing the `ptbk coder run` terminal UI.
 */
export class CoderRunTerminalSession {
    /**
     * Creates a live Ink terminal session when the current terminal supports it.
     */
    public static async create(options: {
        runOptions: RunOptions;
        runStartDate: Moment;
    }): Promise<CoderRunTerminalSession | undefined> {
        if (!options.runOptions.useTerminalUi || !process.stdout.isTTY || !process.stdin.isTTY) {
            return undefined;
        }

        const ink = (await loadInkModule()) as InkModule;
        return new CoderRunTerminalSession(ink, options.runOptions, options.runStartDate);
    }

    private readonly originalConsole = {
        info: console.info,
        log: console.log,
        warn: console.warn,
        error: console.error,
    };

    private readonly refreshInterval: NodeJS.Timeout;
    private readonly state: CoderRunTerminalState = {
        stats: { done: 0, forAgent: 0, belowMinimumPriority: 0, toBeWritten: 0 },
        pauseState: 'RUNNING',
        events: [],
    };

    private app: InkRenderInstance;
    private initialDone: number | undefined;
    private nextEventId = 1;
    private renderDebounceTimer: NodeJS.Timeout | undefined;
    private pendingEnterResolver: (() => void) | undefined;
    private pendingPauseResolver: (() => void) | undefined;
    private isStopped = false;

    /**
     * Starts one new terminal session and begins intercepting console output for the UI.
     */
    private constructor(
        private readonly ink: InkModule,
        private readonly options: RunOptions,
        private readonly runStartDate: Moment,
    ) {
        this.app = this.ink.render(this.createView());
        this.refreshInterval = setInterval(() => this.requestRender(), UI_REFRESH_INTERVAL_MS);
        this.interceptConsole();
    }

    /**
     * Updates the runner/model metadata shown near the top of the terminal UI.
     */
    public updateRunnerMetadata(runnerName: string, modelName?: string): void {
        this.state.runnerName = runnerName;
        this.state.modelName = modelName;
        this.requestRender();
    }

    /**
     * Updates the prompt statistics used for the status line and loading bar.
     */
    public updateStats(stats: PromptStats): void {
        if (this.initialDone === undefined && (stats.done > 0 || stats.forAgent > 0 || stats.toBeWritten > 0)) {
            this.initialDone = stats.done;
        }

        this.state.stats = stats;
        this.requestRender();
    }

    /**
     * Sets the currently processed prompt label and resets prompt-local UI state.
     */
    public setCurrentPrompt(promptLabel: string | undefined): void {
        this.state.currentPrompt = promptLabel;
        this.state.currentAttempt = undefined;
        this.state.currentThinkingMessage = undefined;
        this.requestRender();
    }

    /**
     * Updates the current retry attempt displayed alongside the active prompt.
     */
    public setCurrentAttempt(currentAttempt: number | undefined): void {
        this.state.currentAttempt = currentAttempt;
        this.requestRender();
    }

    /**
     * Waits for the user to press Enter using the Ink input loop instead of raw readline prompts.
     */
    public async waitForEnter(prompt: string): Promise<void> {
        this.state.awaitingEnterPrompt = formatConsoleMessageForUi(prompt) ?? 'Press Enter to continue.';
        this.requestRender();

        await new Promise<void>((resolve) => {
            this.pendingEnterResolver = () => {
                this.pendingEnterResolver = undefined;
                this.state.awaitingEnterPrompt = undefined;
                this.requestRender();
                resolve();
            };
        });
    }

    /**
     * Pauses between prompts using the same semantics as the legacy `p` keyboard shortcut.
     */
    public async checkPause(): Promise<void> {
        if (this.state.pauseState === 'RUNNING') {
            return;
        }

        if (this.state.pauseState === 'PAUSING') {
            this.state.pauseState = 'PAUSED';
            this.pushEvent('info', 'Paused. Press "p" to resume.');
            this.requestRender();
        }

        await new Promise<void>((resolve) => {
            this.pendingPauseResolver = resolve;
        });
    }

    /**
     * Restores the original console methods and unmounts the Ink application.
     */
    public stop(): void {
        if (this.isStopped) {
            return;
        }

        if (this.renderDebounceTimer) {
            clearTimeout(this.renderDebounceTimer);
            this.renderDebounceTimer = undefined;
        }

        this.app.rerender(this.createView());
        this.isStopped = true;
        this.restoreConsole();
        clearInterval(this.refreshInterval);

        if (this.pendingPauseResolver) {
            const resolvePause = this.pendingPauseResolver;
            this.pendingPauseResolver = undefined;
            resolvePause();
        }

        if (this.pendingEnterResolver) {
            const resolveEnter = this.pendingEnterResolver;
            this.pendingEnterResolver = undefined;
            resolveEnter();
        }

        this.app.unmount();
    }

    /**
     * Schedules one lightweight Ink rerender for the current state.
     */
    private requestRender(): void {
        if (this.isStopped || this.renderDebounceTimer) {
            return;
        }

        this.renderDebounceTimer = setTimeout(() => {
            this.renderDebounceTimer = undefined;
            if (!this.isStopped) {
                this.app.rerender(this.createView());
            }
        }, RERENDER_DEBOUNCE_MS);
    }

    /**
     * Builds the full React tree rendered by Ink.
     */
    private createView(): React.ReactElement {
        const statusSnapshot = buildProgressSnapshot(
            this.state.stats,
            this.runStartDate,
            this.initialDone ?? this.state.stats.done,
        );

        return React.createElement(CoderRunTerminalApp, {
            ink: this.ink,
            options: this.options,
            state: this.state,
            statusLine: buildProgressLineText(statusSnapshot),
            progressBar: buildLoadingBar(statusSnapshot.percentage),
            onInput: (input, key) => this.handleInput(input, key),
        });
    }

    /**
     * Patches the global console methods so the Ink UI receives live updates instead of raw terminal spam.
     */
    private interceptConsole(): void {
        console.info = ((...args: unknown[]) => this.handleConsoleMessage('info', args)) as typeof console.info;
        console.log = ((...args: unknown[]) => this.handleConsoleMessage('info', args)) as typeof console.log;
        console.warn = ((...args: unknown[]) => this.handleConsoleMessage('warn', args)) as typeof console.warn;
        console.error = ((...args: unknown[]) => this.handleConsoleMessage('error', args)) as typeof console.error;
    }

    /**
     * Restores the original global console methods.
     */
    private restoreConsole(): void {
        console.info = this.originalConsole.info;
        console.log = this.originalConsole.log;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
    }

    /**
     * Routes intercepted console output into either the thinking label or the live event list.
     */
    private handleConsoleMessage(level: CoderRunConsoleLevel, args: readonly unknown[]): void {
        const rawMessage = formatWithOptions({ colors: false, depth: 5 }, ...args);
        const formattedMessage = formatConsoleMessageForUi(rawMessage);
        const thinkingMessage = extractCoderRunThinkingMessage(rawMessage);

        if (thinkingMessage) {
            this.state.currentThinkingMessage = thinkingMessage;
        }

        if (!formattedMessage) {
            this.requestRender();
            return;
        }

        if (level === 'warn' || level === 'error') {
            this.pushEvent(level, formattedMessage);
        } else if (shouldPersistInfoEvent(formattedMessage)) {
            this.pushEvent('info', formattedMessage);
        } else {
            this.requestRender();
        }
    }

    /**
     * Handles the few keyboard shortcuts supported by the terminal UI.
     */
    private handleInput(input: string, key: CoderRunInputKey): void {
        if (key.ctrl && input.toLowerCase() === 'c') {
            this.restoreConsole();
            process.exit(1);
        }

        if (key.return && this.pendingEnterResolver) {
            const resolveEnter = this.pendingEnterResolver;
            resolveEnter();
            return;
        }

        if (input.toLowerCase() === 'p' || key.name === 'p') {
            this.togglePause();
        }
    }

    /**
     * Switches the pause state between running, pausing, and paused/resumed.
     */
    private togglePause(): void {
        if (this.state.pauseState === 'RUNNING') {
            this.state.pauseState = 'PAUSING';
            this.pushEvent('info', 'Pausing after current step...');
            return;
        }

        if (this.state.pauseState === 'PAUSING') {
            this.state.pauseState = 'RUNNING';
            this.pushEvent('info', 'Pause cancelled. Resuming...');
            return;
        }

        this.state.pauseState = 'RUNNING';
        this.pushEvent('info', 'Resuming...');

        if (this.pendingPauseResolver) {
            const resolvePause = this.pendingPauseResolver;
            this.pendingPauseResolver = undefined;
            resolvePause();
        }
    }

    /**
     * Appends one message to the recent live-event list.
     */
    private pushEvent(level: CoderRunConsoleLevel, message: string): void {
        this.state.events = [
            ...this.state.events,
            {
                id: this.nextEventId++,
                level,
                message: truncateForDisplay(message, MAX_EVENT_MESSAGE_LENGTH),
            },
        ].slice(-MAX_VISIBLE_EVENTS);

        this.requestRender();
    }
}

/**
 * React root rendered by Ink for the Promptbook coder terminal UI.
 */
function CoderRunTerminalApp(props: CoderRunTerminalAppProps): React.ReactElement {
    const { Box, Text, useInput } = props.ink;

    useInput((input, key) =>
        props.onInput(input, {
            ctrl: Boolean(key.ctrl),
            return: Boolean(key.return),
            name: key.name,
        }),
    );

    const currentThinkingMessage =
        props.state.currentThinkingMessage ?? (props.state.currentPrompt ? 'Waiting for agent output...' : 'Idle.');

    const currentPromptLabel = props.state.currentPrompt
        ? props.state.currentAttempt
            ? `${props.state.currentPrompt} (attempt #${props.state.currentAttempt})`
            : props.state.currentPrompt
        : 'Waiting for the next runnable prompt.';

    const liveEvents = props.state.events.length
        ? props.state.events
        : [{ id: 0, level: 'info' as const, message: 'No retries or errors yet.' }];

    return React.createElement(
        Box,
        { flexDirection: 'column', paddingX: 1 },
        React.createElement(Text, { color: 'cyan' }, 'Promptbook Coder'),
        React.createElement(Text, null, `Agent: ${formatOptionalValue(props.options.agentName, 'unknown')}`),
        React.createElement(
            Text,
            null,
            `Runner: ${formatOptionalValue(props.state.runnerName, 'starting...')} | Model: ${formatOptionalValue(
                props.state.modelName,
                'default',
            )} | Thinking: ${formatOptionalValue(props.options.thinkingLevel, 'default')}`,
        ),
        React.createElement(
            Text,
            null,
            `Context: ${formatOptionalValue(props.options.context, 'none')} | Priority: ${String(
                props.options.priority,
            )} | Verification: ${formatOptionalValue(props.options.testCommand, 'off')}`,
        ),
        React.createElement(
            Text,
            null,
            `Wait: ${props.options.waitForUser ? 'manual' : 'automatic'} | Push: ${
                props.options.noPush ? 'off' : 'on'
            } | Auto-migrate: ${props.options.autoMigrate ? 'on' : 'off'} | Pause: ${buildPauseLabel(
                props.state.pauseState,
            )}`,
        ),
        React.createElement(Text, { color: 'green' }, `Status: ${props.statusLine}`),
        React.createElement(Text, { color: 'green' }, `Progress: ${props.progressBar}`),
        React.createElement(Text, null, `Current prompt: ${currentPromptLabel}`),
        React.createElement(Text, null, `Thinking: ${currentThinkingMessage}`),
        props.state.awaitingEnterPrompt
            ? React.createElement(Text, { color: 'yellow' }, `Awaiting input: ${props.state.awaitingEnterPrompt}`)
            : React.createElement(Text, { color: 'gray' }, 'Awaiting input: none'),
        React.createElement(Text, { color: 'cyan' }, 'Recent events:'),
        React.createElement(
            Box,
            { flexDirection: 'column' },
            ...liveEvents.map((event) =>
                React.createElement(
                    Text,
                    { key: event.id, color: EVENT_COLORS[event.level] },
                    `${EVENT_PREFIXES[event.level]} ${event.message}`,
                ),
            ),
        ),
        React.createElement(
            Text,
            { color: 'gray' },
            props.state.awaitingEnterPrompt
                ? 'Controls: Enter continue | p pause/resume | Ctrl+C exit'
                : 'Controls: p pause/resume | Ctrl+C exit',
        ),
    );
}

/**
 * Prefix shown for each event level in the live events area.
 */
const EVENT_PREFIXES: Record<CoderRunConsoleLevel, string> = {
    info: '[info]',
    warn: '[warn]',
    error: '[error]',
};

/**
 * Ink text colors used for the live event list.
 */
const EVENT_COLORS: Record<CoderRunConsoleLevel, string> = {
    info: 'cyan',
    warn: 'yellow',
    error: 'red',
};

/**
 * Formats one optional metadata value so it stays compact inside the header.
 */
function formatOptionalValue(value: string | undefined, fallback: string): string {
    return truncateForDisplay(value?.trim() || fallback, MAX_METADATA_VALUE_LENGTH);
}

/**
 * Formats the current pause state into one short human-readable label.
 */
function buildPauseLabel(pauseState: CoderRunPauseState): string {
    if (pauseState === 'RUNNING') {
        return 'running';
    }

    if (pauseState === 'PAUSING') {
        return 'pausing after current step';
    }

    return 'paused';
}

/**
 * Builds a compact ASCII loading bar from the current percentage.
 */
function buildLoadingBar(percentage: number): string {
    const boundedPercentage = Math.max(0, Math.min(100, Math.round(percentage)));
    const filledWidth = Math.round((boundedPercentage / 100) * PROGRESS_BAR_WIDTH);
    const emptyWidth = Math.max(0, PROGRESS_BAR_WIDTH - filledWidth);
    return `[${'='.repeat(filledWidth)}${'-'.repeat(emptyWidth)}] ${boundedPercentage}%`;
}

/**
 * Normalizes one intercepted console call into a compact single-line UI message.
 */
function formatConsoleMessageForUi(rawMessage: string): string | undefined {
    const compactMessage = normalizeCoderRunConsoleText(rawMessage)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' | ');

    return compactMessage || undefined;
}

/**
 * Returns true when one info-level message should remain visible as a live event.
 */
function shouldPersistInfoEvent(message: string): boolean {
    return PERSISTENT_INFO_PREFIXES.some((prefix) => message.startsWith(prefix));
}

/**
 * Truncates one label for compact terminal display.
 */
function truncateForDisplay(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
}

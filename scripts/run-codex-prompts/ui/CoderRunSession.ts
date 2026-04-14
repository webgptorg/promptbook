import type { Moment } from 'moment';
import type { RunOptions } from '../cli/RunOptions';
import type { PromptStats } from '../prompts/types/PromptStats';

/**
 * Log severity levels rendered by the coding-run reporter.
 */
export type CoderRunLogLevel = 'info' | 'warn' | 'error';

/**
 * Output stream labels used for raw runner output.
 */
export type CoderRunOutputSource = 'stdout' | 'stderr';

/**
 * Pause states supported by `ptbk coder run`.
 */
export type CoderRunPauseState = 'RUNNING' | 'PAUSING' | 'PAUSED';

/**
 * Minimal logger interface consumed by the coding-run workflow.
 */
export type CoderRunLogger = {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    rawOutput(chunk: string, source: CoderRunOutputSource): void;
};

/**
 * Runner details shown in the terminal UI header.
 */
export type CoderRunRunnerState = {
    runnerName: string;
    agentName: RunOptions['agentName'];
    modelName?: string;
    thinkingLevel?: RunOptions['thinkingLevel'];
    context?: string;
    priority: number;
    testCommand?: string;
    waitForUser: boolean;
    allowCredits: boolean;
    autoMigrate: boolean;
    noPush: boolean;
};

/**
 * Current prompt details shown in the terminal UI.
 */
export type CoderRunPromptState = {
    label: string;
    summary: string;
    attemptCount: number;
};

/**
 * Construction options shared by console and Ink coding-run sessions.
 */
export type CoderRunSessionOptions = {
    startTime: Moment;
    runOptions: RunOptions;
};

/**
 * Session abstraction used by `ptbk coder run` for reporting, pause control, and inline prompts.
 */
export type CoderRunSession = {
    readonly isTerminalUi: boolean;
    readonly logger: CoderRunLogger;
    setRunnerState(runnerState: Partial<CoderRunRunnerState>): void;
    updateStats(stats: PromptStats): void;
    setCurrentPrompt(prompt?: CoderRunPromptState): void;
    setThinkingMessage(message?: string): void;
    checkPause(): Promise<void>;
    waitForEnter(prompt: string): Promise<void>;
    stop(): void;
};

/**
 * Builds the initial runner-state snapshot from parsed CLI options.
 */
export function buildInitialCoderRunRunnerState(runOptions: RunOptions): CoderRunRunnerState {
    return {
        runnerName: runOptions.agentName ?? 'unknown',
        agentName: runOptions.agentName,
        modelName: runOptions.model,
        thinkingLevel: runOptions.thinkingLevel,
        context: runOptions.context,
        priority: runOptions.priority,
        testCommand: runOptions.testCommand,
        waitForUser: runOptions.waitForUser,
        allowCredits: runOptions.allowCredits,
        autoMigrate: runOptions.autoMigrate,
        noPush: runOptions.noPush,
    };
}

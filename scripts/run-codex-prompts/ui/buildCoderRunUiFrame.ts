import colors from 'colors';
import type { CoderRunPauseState } from '../common/waitForPause';
import type { CoderRunConfig, CoderRunPhase, CoderRunProgressSnapshot } from './CoderRunUiState';
import { buildCoderRunOctopusVisual } from './buildCoderRunOctopusVisual';
import {
    buildControlPills,
    buildLabeledSessionLine,
    buildPausePresentation,
    buildProgressBar,
    buildVisibleOutputLines,
    renderBox,
    SESSION_LABEL_WIDTH,
    type PausePresentation,
    type SessionRow,
} from './buildRunUiFrameShared';
import { isCoderRunUiAutoRefreshing } from './coderRunUiRefresh';
import { fitPlainText } from './coderRunUiText';

/**
 * Minimum width used for the rich coder-run frame.
 */
const MIN_FRAME_WIDTH = 56;

/**
 * Maximum width used for the rich coder-run frame.
 */
const MAX_FRAME_WIDTH = 96;

/**
 * Shared pause-state shape between the renderer and the frame builder.
 */
export type { CoderRunPauseState };

/**
 * Snapshot consumed by the pure coder-run frame builder.
 */
export type BuildCoderRunUiFrameOptions = {
    readonly terminalWidth: number;
    readonly animationFrame: number;
    readonly spinner: string;
    readonly pauseState: CoderRunPauseState;
    readonly config: CoderRunConfig;
    readonly phase: CoderRunPhase;
    readonly currentPromptLabel: string;
    readonly currentAttempt: number;
    readonly maxAttempts: number;
    readonly statusMessage: string;
    readonly detailLines: readonly string[];
    readonly messagePreviewLines?: readonly string[];
    readonly messagePreviewSections?: readonly AgentRunMessagePreviewSection[];
    readonly agentStatusLines?: readonly string[];
    readonly agentStatusTableRows?: readonly AgentRunStatusTableRow[];
    readonly pendingEnterLabel?: string;
    readonly agentOutputLines: readonly string[];
    readonly errors: readonly string[];
    readonly progress: CoderRunProgressSnapshot;
};

/**
 * Structured row rendered in the agent-run `Agents` table.
 */
export type AgentRunStatusTableRow = {
    readonly status: 'Idle' | 'Answering';
    readonly agentName: string;
    readonly url: string;
};

/**
 * Structured user-message panel rendered by the agent-run dashboard.
 */
export type AgentRunMessagePreviewSection = {
    readonly title: string;
    readonly messagePreviewLines: readonly string[];
};

/**
 * Builds the complete boxed terminal frame for the rich `ptbk coder run` UI.
 */
export function buildCoderRunUiFrame(options: BuildCoderRunUiFrameOptions): string[] {
    const totalWidth = Math.max(MIN_FRAME_WIDTH, Math.min(options.terminalWidth, MAX_FRAME_WIDTH));
    const isPromptActive = options.phase === 'running' || options.phase === 'verifying' || options.phase === 'loading';
    const promptStatusPrefix = isPromptActive ? `${colors.yellow(`${options.spinner} `)}` : '';
    const octopusAnimationFrame = isCoderRunUiAutoRefreshing(options.phase, options.pauseState)
        ? options.animationFrame
        : 0;
    const pausePresentation = buildPausePresentation(options.phase, options.pauseState, options.statusMessage);
    const sessionLines = buildSessionLines(options, totalWidth, pausePresentation);

    const currentTaskLines = options.currentPromptLabel
        ? [
              `${promptStatusPrefix}${colors.bold.white(fitPlainText(options.currentPromptLabel, totalWidth - 8))}`,
              `Attempt ${options.currentAttempt}/${options.maxAttempts}  ·  ${options.statusMessage}`,
              ...options.detailLines.map((detailLine) => `• ${detailLine}`),
          ]
        : [options.statusMessage, ...options.detailLines.map((detailLine) => `• ${detailLine}`)];

    const visibleOutputLines = buildVisibleOutputLines(options.agentOutputLines);

    const controls = buildControlPills(pausePresentation.pauseControl, options.pendingEnterLabel).join('  ');

    const frame = [
        ...buildCoderRunOctopusVisual({ totalWidth, animationFrame: octopusAnimationFrame }),
        '',
        ...renderBox('Session', sessionLines, totalWidth, colors.yellow.bold),
        ...renderBox(
            options.currentPromptLabel ? 'Current task' : 'Queue',
            currentTaskLines,
            totalWidth,
            colors.magenta.bold,
        ),
        ...renderBox('Live output', visibleOutputLines, totalWidth, colors.green.bold),
    ];

    if (options.errors.length > 0) {
        frame.push(
            ...renderBox(
                'Errors',
                options.errors.map((errorLine) => `${colors.red('✗')} ${errorLine}`),
                totalWidth,
                colors.red.bold,
            ),
        );
    }

    frame.push(...renderBox('Controls', [controls], totalWidth, colors.white.bold));
    return frame;
}

/**
 * Builds the structured session lines that combine state, runner, queue, and timing metadata.
 */
function buildSessionLines(
    options: BuildCoderRunUiFrameOptions,
    totalWidth: number,
    pausePresentation: ReturnType<typeof buildPausePresentation>,
): readonly string[] {
    const bodyWidth = Math.max(10, totalWidth - 4);
    return buildSessionRows(options, bodyWidth, pausePresentation).map((sessionRow) =>
        buildLabeledSessionLine(sessionRow.label, sessionRow.value, bodyWidth),
    );
}

/**
 * Builds the session rows so the renderer can keep one consistent structure without duplicating labels.
 */
function buildSessionRows(
    options: BuildCoderRunUiFrameOptions,
    bodyWidth: number,
    pausePresentation: PausePresentation,
): readonly SessionRow[] {
    const runnerParts = [options.config.agentName || 'No agent selected'];

    if (options.config.modelName) {
        runnerParts.push(options.config.modelName);
    }
    if (options.config.thinkingLevel) {
        runnerParts.push(`thinking ${options.config.thinkingLevel}`);
    }

    const configurationRows = [
        ...buildOptionalSessionRow('Context', options.config.context),
        ...buildOptionalSessionRow('Test', options.config.testCommand),
    ];

    return [
        {
            label: 'State',
            value: `${pausePresentation.badge} ${pausePresentation.stateMessage}`,
        },
        {
            label: 'Runner',
            value: runnerParts.join('  ·  '),
        },
        ...configurationRows,
        {
            label: 'This run',
            value: buildThisRunSummary(options.progress),
        },
        {
            label: 'Backlog',
            value: buildBacklogSummary(options.progress),
        },
        {
            label: 'Scope',
            value: buildScopeSummary(options.progress, options.config),
        },
        {
            label: 'Timing',
            value: buildTimingSummary(options.progress),
        },
        {
            label: 'Progress',
            value: buildProgressBar(
                options.progress.percentage,
                bodyWidth - SESSION_LABEL_WIDTH - 1,
                `${options.progress.percentage}% complete (${options.progress.sessionDone}/${options.progress.sessionTotal} done)`,
            ),
        },
    ];
}

/**
 * Builds zero or one structured session row for optional metadata.
 */
function buildOptionalSessionRow(label: string, value: string | undefined): readonly SessionRow[] {
    if (!value) {
        return [];
    }

    return [{ label, value }];
}

/**
 * Builds the active-session summary shown in the session box.
 */
function buildThisRunSummary(progress: CoderRunProgressSnapshot): string {
    if (progress.sessionTotal === 0) {
        return 'No runnable prompts in current scope';
    }

    return `Task ${progress.currentPromptIndex}/${progress.sessionTotal}  ·  ${progress.sessionDone} done  ·  ${progress.sessionRemaining} left`;
}

/**
 * Builds the backlog/filter summary shown in the session box.
 */
function buildBacklogSummary(progress: CoderRunProgressSnapshot): string {
    const parts = [`Repo ${progress.totalPrompts} total`];

    if (progress.skippedPrompts > 0) {
        parts.push(`${formatPromptCount(progress.skippedPrompts)} below priority`);
    }

    return parts.join('  ·  ');
}

/**
 * Builds the priority/write-order summary shown in the session box.
 */
function buildScopeSummary(progress: CoderRunProgressSnapshot, config: CoderRunConfig): string {
    const parts = [`Priority ≥${config.priority}`];

    if (progress.toBeWrittenPrompts > 0) {
        parts.push(`Write ${formatPromptCount(progress.toBeWrittenPrompts)} first`);
    }

    return parts.join('  ·  ');
}

/**
 * Builds the elapsed/estimate summary shown in the session box.
 */
function buildTimingSummary(progress: CoderRunProgressSnapshot): string {
    return `Elapsed ${progress.elapsedText}  ·  Total ${progress.estimatedTotalText}  ·  ETA ${progress.estimatedLabel}`;
}

/**
 * Formats a prompt count with singular/plural wording.
 */
function formatPromptCount(count: number): string {
    return `${count} prompt${count === 1 ? '' : 's'}`;
}

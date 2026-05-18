import colors from 'colors';
import type { BuildCoderRunUiFrameOptions } from '../../run-codex-prompts/ui/buildCoderRunUiFrame';
import {
    buildControlPills,
    buildLabeledSessionLine,
    buildPausePresentation,
    buildVisibleOutputLines,
    renderBox,
    type SessionRow,
} from '../../run-codex-prompts/ui/buildRunUiFrameShared';
import { fitPlainText } from '../../run-codex-prompts/ui/coderRunUiText';
import { buildAgentRunInitialsVisual } from './buildAgentRunInitialsVisual';

/**
 * Minimum width used for the rich agent-run frame.
 */
const MIN_FRAME_WIDTH = 56;

/**
 * Maximum width used for the rich agent-run frame.
 */
const MAX_FRAME_WIDTH = 96;

/**
 * Maximum number of source-message lines shown in the dedicated preview box.
 */
const MAX_MESSAGE_PREVIEW_LINES = 6;

/**
 * Builds the complete boxed terminal frame for the rich `ptbk agent run` UI.
 */
export function buildAgentRunUiFrame(options: BuildCoderRunUiFrameOptions): string[] {
    const totalWidth = Math.max(MIN_FRAME_WIDTH, Math.min(options.terminalWidth, MAX_FRAME_WIDTH));
    const isPromptActive = options.phase === 'running' || options.phase === 'verifying' || options.phase === 'loading';
    const promptStatusPrefix = isPromptActive ? `${colors.yellow(`${options.spinner} `)}` : '';
    const pausePresentation = buildPausePresentation(options.phase, options.pauseState, options.statusMessage);
    const sessionLines = buildSessionLines(options, totalWidth, pausePresentation);
    const agentStatusLines = buildAgentStatusLines(options, totalWidth);
    const currentTaskLines = options.currentPromptLabel
        ? [
              `${promptStatusPrefix}${colors.bold.white(fitPlainText(options.currentPromptLabel, totalWidth - 8))}`,
              `Attempt ${options.currentAttempt}/${options.maxAttempts}  ·  ${options.statusMessage}`,
              ...options.detailLines.map((detailLine) => `• ${detailLine}`),
          ]
        : [options.statusMessage, ...options.detailLines.map((detailLine) => `• ${detailLine}`)];
    const userMessageLines = buildUserMessagePreviewLines(options.messagePreviewLines, totalWidth);
    const visibleOutputLines = buildVisibleOutputLines(options.agentOutputLines);
    const controls = buildControlPills(pausePresentation.pauseControl, options.pendingEnterLabel).join('  ');
    const frame = [
        ...buildAgentRunInitialsVisual(options.config.localAgentName || 'Local Agent', totalWidth),
        '',
        ...renderBox('Session', sessionLines, totalWidth, colors.yellow.bold),
        ...renderBox('Agents', agentStatusLines, totalWidth, colors.blue.bold),
        ...renderBox('Current task', currentTaskLines, totalWidth, colors.magenta.bold),
        ...renderBox('User message', userMessageLines, totalWidth, colors.cyan.bold),
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
 * Builds the structured session lines for the agent-specific dashboard.
 */
function buildSessionLines(
    options: BuildCoderRunUiFrameOptions,
    totalWidth: number,
    pausePresentation: ReturnType<typeof buildPausePresentation>,
): readonly string[] {
    const bodyWidth = Math.max(10, totalWidth - 4);
    const localAgentName = options.config.localAgentName || 'Local Agent';
    const runnerParts = [options.config.agentName || 'No runner selected'];
    const agentStatusCounts = countAgentStatuses(options);
    const answeredMessageCount = Math.max(
        0,
        options.progress.totalPrompts - options.progress.sessionRemaining - options.progress.toBeWrittenPrompts,
    );

    if (options.config.modelName) {
        runnerParts.push(options.config.modelName);
    }

    if (options.config.thinkingLevel) {
        runnerParts.push(`thinking ${options.config.thinkingLevel}`);
    }

    const sessionRows: readonly SessionRow[] = [
        {
            label: 'State',
            value: `${pausePresentation.badge} ${pausePresentation.stateMessage}`,
        },
        {
            label: agentStatusCounts.totalAgents === 1 ? 'Agent' : 'Agents',
            value: localAgentName,
        },
        {
            label: 'Runner',
            value: runnerParts.join('  ·  '),
        },
        {
            label: 'Status',
            value: `${agentStatusCounts.idleAgents} idle  ·  ${agentStatusCounts.answeringAgents} answering`,
        },
        {
            label: 'Messages',
            value: `${answeredMessageCount} answered total  ·  ${options.progress.sessionRemaining} waiting`,
        },
    ];

    return sessionRows.map((sessionRow) => buildLabeledSessionLine(sessionRow.label, sessionRow.value, bodyWidth));
}

/**
 * Builds one row per watched agent with its current status and message summary.
 */
function buildAgentStatusLines(options: BuildCoderRunUiFrameOptions, totalWidth: number): readonly string[] {
    const statusWidth = Math.max(10, totalWidth - 4);
    const rawStatusLines =
        options.agentStatusLines && options.agentStatusLines.length > 0
            ? options.agentStatusLines
            : [buildSingleAgentStatusLine(options)];

    return rawStatusLines.map((statusLine) => fitPlainText(statusLine.replace(/\t/gu, '    '), statusWidth));
}

/**
 * Builds the fallback status row used by single-agent runs.
 */
function buildSingleAgentStatusLine(options: BuildCoderRunUiFrameOptions): string {
    const isAnswering =
        Boolean(options.currentPromptLabel) &&
        (options.phase === 'loading' || options.phase === 'running' || options.phase === 'verifying');
    const status = isAnswering ? 'Answering' : 'Idle';
    const message = isAnswering ? `  ·  ${options.currentPromptLabel}` : '';

    return `${status.padEnd(9)} ${options.config.localAgentName || 'Local Agent'}${message}`;
}

/**
 * Counts agent statuses from explicit status rows or the single-agent fallback state.
 */
function countAgentStatuses(options: BuildCoderRunUiFrameOptions): {
    readonly totalAgents: number;
    readonly idleAgents: number;
    readonly answeringAgents: number;
} {
    const statusLines =
        options.agentStatusLines && options.agentStatusLines.length > 0
            ? options.agentStatusLines
            : [buildSingleAgentStatusLine(options)];
    const totalAgents = statusLines.filter((statusLine) => isAgentStatusLine(statusLine)).length;
    const answeringAgents = statusLines.filter((statusLine) => statusLine.trim().startsWith('Answering')).length;
    const normalizedTotalAgents = totalAgents || (options.config.localAgentName === '0 Agents' ? 0 : 1);

    return {
        totalAgents: normalizedTotalAgents,
        idleAgents: Math.max(0, normalizedTotalAgents - answeringAgents),
        answeringAgents,
    };
}

/**
 * Returns true for status rows that describe one concrete agent.
 */
function isAgentStatusLine(statusLine: string): boolean {
    const trimmedStatusLine = statusLine.trim();
    return trimmedStatusLine.startsWith('Idle') || trimmedStatusLine.startsWith('Answering');
}

/**
 * Fits the most recent user message into a fixed-height panel while preserving line breaks.
 */
function buildUserMessagePreviewLines(
    messagePreviewLines: readonly string[] | undefined,
    totalWidth: number,
): readonly string[] {
    const previewWidth = Math.max(10, totalWidth - 4);
    const rawLines =
        messagePreviewLines && messagePreviewLines.length > 0
            ? messagePreviewLines.map((messagePreviewLine) => messagePreviewLine.replace(/\t/gu, '    '))
            : ['Waiting for the next queued `MESSAGE @User`.'];
    const visibleLines = rawLines.slice(0, MAX_MESSAGE_PREVIEW_LINES).map((line) => fitPlainText(line, previewWidth));

    if (rawLines.length > MAX_MESSAGE_PREVIEW_LINES) {
        visibleLines[MAX_MESSAGE_PREVIEW_LINES - 1] = fitPlainText(
            `${visibleLines[MAX_MESSAGE_PREVIEW_LINES - 1]} …`,
            previewWidth,
        );
    }

    while (visibleLines.length < MAX_MESSAGE_PREVIEW_LINES) {
        visibleLines.push('');
    }

    return visibleLines;
}

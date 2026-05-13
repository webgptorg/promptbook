import colors from 'colors';
import type { BuildCoderRunUiFrameOptions } from '../../run-codex-prompts/ui/buildCoderRunUiFrame';
import {
    buildControlPills,
    buildLabeledSessionLine,
    buildPausePresentation,
    buildProgressBar,
    buildVisibleOutputLines,
    renderBox,
    SESSION_LABEL_WIDTH,
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
    const finishedMessages = options.progress.sessionDone;
    const queuedMessages = options.progress.sessionRemaining;
    const totalMessages = options.progress.sessionTotal;
    const localAgentName = options.config.localAgentName || 'Local Agent';
    const runnerParts = [options.config.agentName || 'No runner selected'];

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
            label: 'Agent',
            value: localAgentName,
        },
        {
            label: 'Runner',
            value: runnerParts.join('  ·  '),
        },
        {
            label: 'Queue',
            value: `${totalMessages} total  ·  ${finishedMessages} finished  ·  ${queuedMessages} queued`,
        },
        {
            label: 'Timing',
            value: `Elapsed ${options.progress.elapsedText}  ·  Total ${options.progress.estimatedTotalText}  ·  ETA ${options.progress.estimatedLabel}`,
        },
        {
            label: 'Progress',
            value: buildProgressBar(
                options.progress.percentage,
                bodyWidth - SESSION_LABEL_WIDTH - 1,
                `${options.progress.percentage}% complete (${finishedMessages}/${totalMessages || 0} finished)`,
            ),
        },
    ];

    return sessionRows.map((sessionRow) => buildLabeledSessionLine(sessionRow.label, sessionRow.value, bodyWidth));
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
            : ['No `MESSAGE @User` content found in the queued message.'];
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

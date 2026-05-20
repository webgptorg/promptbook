import colors from 'colors';
import type {
    AgentRunStatusTableRow,
    BuildCoderRunUiFrameOptions,
} from '../../run-codex-prompts/ui/buildCoderRunUiFrame';
import {
    buildControlPills,
    buildLabeledSessionLine,
    buildPausePresentation,
    buildScriptPathSessionRows,
    buildVisibleOutputLines,
    renderBox,
    type SessionRow,
} from '../../run-codex-prompts/ui/buildRunUiFrameShared';
import { fitAnsiText, fitPlainText, padAnsiText, visibleLength } from '../../run-codex-prompts/ui/coderRunUiText';
import { buildAgentRunInitialsVisual } from './buildAgentRunInitialsVisual';
import { WAITING_FOR_MESSAGE_LABEL } from './agentRunUiConstants';

/**
 * Minimum width used for the rich agent-run frame.
 */
const MIN_FRAME_WIDTH = 56;

/**
 * Maximum width used for the rich agent-run frame.
 */
const MAX_FRAME_WIDTH = 96;

/**
 * Maximum number of source-message lines shown in each dedicated preview box.
 */
const MAX_MESSAGE_PREVIEW_LINES = 6;

/**
 * Minimum visible width reserved for the `Agent name` column in the agents table.
 */
const MIN_AGENT_NAME_COLUMN_WIDTH = 12;

/**
 * Minimum visible width reserved for the `URL` column in the agents table.
 */
const MIN_AGENT_URL_COLUMN_WIDTH = 12;

/**
 * Maximum visible width reserved for the `URL` column in the agents table.
 */
const MAX_AGENT_URL_COLUMN_WIDTH = 30;

/**
 * Ratio of remaining table width assigned to the `URL` column before clamping.
 */
const AGENT_URL_COLUMN_RATIO = 0.38;

/**
 * Builds the complete boxed terminal frame for the rich `ptbk agent run` UI.
 */
export function buildAgentRunUiFrame(options: BuildCoderRunUiFrameOptions): string[] {
    const totalWidth = Math.max(MIN_FRAME_WIDTH, Math.min(options.terminalWidth, MAX_FRAME_WIDTH));
    const isPromptActive = options.phase === 'running' || options.phase === 'verifying' || options.phase === 'loading';
    const promptStatusPrefix = isPromptActive ? `${colors.yellow(`${options.spinner} `)}` : '';
    const pausePresentation = buildPausePresentation(options.phase, options.pauseState, options.statusMessage);
    const sessionLines = buildSessionLines(options, totalWidth, pausePresentation);
    const agentStatusLines = buildAgentStatusTableLines(options, totalWidth);
    const currentTaskLines = options.currentPromptLabel
        ? [
              `${promptStatusPrefix}${colors.bold.white(fitPlainText(options.currentPromptLabel, totalWidth - 8))}`,
              `Attempt ${options.currentAttempt}/${options.maxAttempts}  ·  ${options.statusMessage}`,
              ...options.detailLines.map((detailLine) => `• ${detailLine}`),
          ]
        : [options.statusMessage, ...options.detailLines.map((detailLine) => `• ${detailLine}`)];
    const userMessageBoxes = buildUserMessageBoxes(options, totalWidth);
    const visibleOutputLines = buildVisibleOutputLines(options.agentOutputLines);
    const controls = buildControlPills(pausePresentation.pauseControl, options.pendingEnterLabel).join('  ');
    const frame = [
        ...buildAgentRunInitialsVisual(options.config.localAgentName || 'Local Agent', totalWidth),
        '',
        ...renderBox('Session', sessionLines, totalWidth, colors.yellow.bold),
        ...renderBox('Agents', agentStatusLines, totalWidth, colors.blue.bold),
        ...renderBox('Current task', currentTaskLines, totalWidth, colors.magenta.bold),
        ...userMessageBoxes,
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
        ...buildScriptPathSessionRows(options.currentScriptPaths || [], bodyWidth),
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
 * Builds the rich agent status table with status, agent name, and URL columns.
 */
function buildAgentStatusTableLines(options: BuildCoderRunUiFrameOptions, totalWidth: number): readonly string[] {
    const bodyWidth = Math.max(10, totalWidth - 4);
    const rows = getAgentStatusTableRows(options);

    if (rows.length === 0) {
        return [colors.gray('No agents detected.')];
    }

    const statusColumnWidth = 10;
    const availableWidth = Math.max(20, bodyWidth - statusColumnWidth - 4);
    const urlColumnWidth = Math.max(
        MIN_AGENT_URL_COLUMN_WIDTH,
        Math.min(MAX_AGENT_URL_COLUMN_WIDTH, Math.floor(availableWidth * AGENT_URL_COLUMN_RATIO)),
    );
    const agentColumnWidth = Math.max(MIN_AGENT_NAME_COLUMN_WIDTH, availableWidth - urlColumnWidth);
    const separator = colors.gray('  ');

    const headerLine = [
        padAnsiText(colors.gray.bold('Status'), statusColumnWidth),
        separator,
        padAnsiText(colors.gray.bold('Agent name'), agentColumnWidth),
        separator,
        fitPlainText('URL', urlColumnWidth),
    ].join('');
    const dividerLine = colors.gray('─'.repeat(Math.min(bodyWidth, visibleLength(headerLine))));

    return [
        headerLine,
        dividerLine,
        ...rows.map((row) =>
            [
                padAnsiText(colorizeAgentStatus(row.status), statusColumnWidth),
                separator,
                padAnsiText(fitPlainText(row.agentName, agentColumnWidth), agentColumnWidth),
                separator,
                fitPlainText(row.url, urlColumnWidth),
            ].join(''),
        ),
    ];
}

/**
 * Resolves structured table rows from explicit agent data or legacy string rows.
 */
function getAgentStatusTableRows(options: BuildCoderRunUiFrameOptions): readonly AgentRunStatusTableRow[] {
    if (options.agentStatusTableRows && options.agentStatusTableRows.length > 0) {
        return options.agentStatusTableRows;
    }

    if (options.agentStatusLines && options.agentStatusLines.length > 0) {
        const parsedRows = options.agentStatusLines
            .map(parseLegacyAgentStatusLine)
            .filter((row): row is AgentRunStatusTableRow => Boolean(row));

        if (parsedRows.length > 0) {
            return parsedRows;
        }

        if (parseMultiAgentSessionCount(options.config.localAgentName) !== undefined) {
            return [];
        }
    }

    return [buildSingleAgentStatusRow(options)];
}

/**
 * Builds the fallback status row used by single-agent runs.
 */
function buildSingleAgentStatusRow(options: BuildCoderRunUiFrameOptions): AgentRunStatusTableRow {
    const isAnswering =
        Boolean(options.currentPromptLabel) &&
        (options.phase === 'loading' || options.phase === 'running' || options.phase === 'verifying');

    return {
        status: isAnswering ? 'Answering' : 'Idle',
        agentName: options.config.localAgentName || 'Local Agent',
        url: '.',
    };
}

/**
 * Parses the previous string-based status rows so older callers keep rendering correctly.
 */
function parseLegacyAgentStatusLine(statusLine: string): AgentRunStatusTableRow | undefined {
    const normalizedStatusLine = statusLine.trim();

    if (!normalizedStatusLine.startsWith('Idle') && !normalizedStatusLine.startsWith('Answering')) {
        return undefined;
    }

    const legacyStatusMatch = /^(Idle|Answering)\s+(.+?)(?:\s+\((.+?)\))?(?:\s{2,}·\s{2,}.+)?$/u.exec(normalizedStatusLine);
    if (!legacyStatusMatch) {
        return undefined;
    }

    return {
        status: legacyStatusMatch[1] as AgentRunStatusTableRow['status'],
        agentName: legacyStatusMatch[2] || 'Local Agent',
        url: legacyStatusMatch[3] || '.',
    };
}

/**
 * Counts agent statuses from explicit structured rows, legacy rows, or the single-agent fallback state.
 */
function countAgentStatuses(options: BuildCoderRunUiFrameOptions): {
    readonly totalAgents: number;
    readonly idleAgents: number;
    readonly answeringAgents: number;
} {
    const rows = getAgentStatusTableRows(options);
    const sessionAgentCount = parseMultiAgentSessionCount(options.config.localAgentName);
    const normalizedTotalAgents = rows.length > 0 ? rows.length : sessionAgentCount ?? 1;
    const answeringAgents = rows.filter((row) => row.status === 'Answering').length;

    return {
        totalAgents: normalizedTotalAgents,
        idleAgents: Math.max(0, normalizedTotalAgents - answeringAgents),
        answeringAgents,
    };
}

/**
 * Parses the multi-agent session label used by `ptbk agent run-multiple`.
 */
function parseMultiAgentSessionCount(localAgentName: string | undefined): number | undefined {
    const match = /^(\d+) Agents?(?:\s+·\s+\d+ ignored)?$/u.exec(localAgentName || '');

    return match ? Number(match[1]) : undefined;
}

/**
 * Builds one or more user-message boxes, one per answering agent when needed.
 */
function buildUserMessageBoxes(options: BuildCoderRunUiFrameOptions, totalWidth: number): readonly string[] {
    const previewSections =
        options.messagePreviewSections && options.messagePreviewSections.length > 0
            ? options.messagePreviewSections
            : [
                  {
                      title: 'User message',
                      messagePreviewLines: options.messagePreviewLines || [],
                  },
              ];

    return previewSections.flatMap((previewSection) =>
        renderBox(
            previewSection.title,
            buildUserMessagePreviewLines(previewSection.messagePreviewLines, totalWidth),
            totalWidth,
            colors.cyan.bold,
        ),
    );
}

/**
 * Fits one user-message preview into a fixed-height panel while preserving line breaks.
 */
function buildUserMessagePreviewLines(
    messagePreviewLines: readonly string[] | undefined,
    totalWidth: number,
): readonly string[] {
    const previewWidth = Math.max(10, totalWidth - 4);
    const isWaitingForMessage = !messagePreviewLines || messagePreviewLines.length === 0;
    const rawLines = isWaitingForMessage
        ? [colors.gray(WAITING_FOR_MESSAGE_LABEL)]
        : messagePreviewLines.map((messagePreviewLine) => messagePreviewLine.replace(/\t/gu, '    '));
    const visibleLines = rawLines.slice(0, MAX_MESSAGE_PREVIEW_LINES).map((line) => fitAnsiText(line, previewWidth));

    if (rawLines.length > MAX_MESSAGE_PREVIEW_LINES) {
        visibleLines[MAX_MESSAGE_PREVIEW_LINES - 1] = fitPlainText(
            `${visibleLines[MAX_MESSAGE_PREVIEW_LINES - 1]} ...`,
            previewWidth,
        );
    }

    while (visibleLines.length < MAX_MESSAGE_PREVIEW_LINES) {
        visibleLines.push('');
    }

    return visibleLines;
}

/**
 * Applies consistent colors to the agent status labels.
 */
function colorizeAgentStatus(status: AgentRunStatusTableRow['status']): string {
    return status === 'Answering' ? colors.green.bold(status) : colors.gray(status);
}

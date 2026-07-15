import { LIVE_DEMO_RUN_COMMAND } from './commands';

/**
 * Text colors and decorations used by the live terminal sample.
 */
export type LiveDemoTextTone =
    | 'plain'
    | 'muted'
    | 'border'
    | 'command'
    | 'prompt'
    | 'label'
    | 'sessionTitle'
    | 'taskTitle'
    | 'outputTitle'
    | 'errorTitle'
    | 'controlsTitle'
    | 'success'
    | 'error'
    | 'info'
    | 'warning'
    | 'progressEmpty'
    | 'badgeDone'
    | 'key';

/**
 * One colored segment of a terminal line.
 */
export type LiveDemoTextPart = {
    /**
     * Visible segment text.
     */
    readonly text: string;

    /**
     * Segment presentation.
     */
    readonly tone: LiveDemoTextTone;
};

/**
 * Plain output line of the live terminal sample.
 */
export type LiveDemoTextLine = {
    /**
     * Discriminator for regular terminal text lines.
     */
    readonly kind: 'text';

    /**
     * Colored text segments shown on this line.
     */
    readonly parts: ReadonlyArray<LiveDemoTextPart>;

    /**
     * How long to wait before this line appears, in milliseconds.
     */
    readonly delayMs: number;
};

/**
 * Typed command line of the live terminal sample.
 */
export type LiveDemoCommandLine = {
    /**
     * Discriminator for the typed command.
     */
    readonly kind: 'command';

    /**
     * Command text typed after the `$` prompt.
     */
    readonly text: string;

    /**
     * How long to wait before this line starts appearing, in milliseconds.
     */
    readonly delayMs: number;
};

/**
 * Placeholder line that mounts the shared animated agent visual inside the terminal stream.
 */
export type LiveDemoAgentVisualLine = {
    /**
     * Discriminator for the shared agent visual.
     */
    readonly kind: 'agentVisual';

    /**
     * How long to wait before the visual appears, in milliseconds.
     */
    readonly delayMs: number;
};

/**
 * One scripted event in the live terminal sample.
 */
export type LiveDemoLine = LiveDemoTextLine | LiveDemoCommandLine | LiveDemoAgentVisualLine;

/**
 * Width of the terminal dashboard frame in character cells.
 */
export const LIVE_DEMO_TERMINAL_BOX_WIDTH = 76;

/**
 * Width of box body content between the borders.
 */
const TERMINAL_BODY_WIDTH = LIVE_DEMO_TERMINAL_BOX_WIDTH - 4;

/**
 * Visible width reserved for labels in the session box.
 */
const SESSION_LABEL_WIDTH = 8;

/**
 * Default delay used between dashboard output lines.
 */
const LIVE_DEMO_BOX_LINE_DELAY_MS = 90;

/**
 * Delay used before the first shell prompt is shown.
 */
const LIVE_DEMO_PROMPT_DELAY_MS = 250;

/**
 * Delay used before the typed command starts.
 */
const LIVE_DEMO_COMMAND_DELAY_MS = 450;

/**
 * Delay used before the shared agent visual appears.
 */
const LIVE_DEMO_AGENT_VISUAL_DELAY_MS = 250;

/**
 * Delay used for the empty line after the typed command.
 */
const LIVE_DEMO_AFTER_COMMAND_BLANK_LINE_DELAY_MS = 220;

/**
 * Text shown after the progress bar.
 */
const LIVE_DEMO_PROGRESS_LABEL = ' 0% complete (0/7 done)';

/**
 * Width of the empty 0% progress bar in the terminal sample.
 */
const LIVE_DEMO_EMPTY_PROGRESS_BAR_WIDTH =
    TERMINAL_BODY_WIDTH - SESSION_LABEL_WIDTH - 1 - LIVE_DEMO_PROGRESS_LABEL.length;

/**
 * Wrapped full file path chunks used by the demo Errors panel.
 */
const LIVE_DEMO_ERROR_FILE_PATH_CHUNKS = [
    'C:/Users/me/work/ai/promptbook/.promptbook/coder-prompts/',
    '2026-07-0480-agents-server-browser-preview.sh',
] as const;

/**
 * Full local file path shown in the demo Errors panel.
 */
const LIVE_DEMO_ERROR_FILE_PATH = LIVE_DEMO_ERROR_FILE_PATH_CHUNKS.join('');

/**
 * How long the fake live terminal waits between typing two characters of a command, in milliseconds.
 */
export const LIVE_DEMO_TYPING_INTERVAL_MS = 10;

/**
 * Scripted `ptbk coder run` session played once in the live terminal.
 *
 * Note: Specified in [`specs/components/live-terminal.md`](../../specs/components/live-terminal.md)
 */
export const LIVE_DEMO_SCRIPT: ReadonlyArray<LiveDemoLine> = [
    createTextLine(
        [
            createTextPart('me@DESKTOP-2QD9KQQ', 'prompt'),
            createTextPart(' MINGW64 ', 'muted'),
            createTextPart('~/work/ai/promptbook', 'info'),
            createTextPart(' (main)', 'warning'),
        ],
        LIVE_DEMO_PROMPT_DELAY_MS,
    ),
    {
        kind: 'command',
        text: LIVE_DEMO_RUN_COMMAND,
        delayMs: LIVE_DEMO_COMMAND_DELAY_MS,
    },
    createBlankLine(LIVE_DEMO_AFTER_COMMAND_BLANK_LINE_DELAY_MS),
    {
        kind: 'agentVisual',
        delayMs: LIVE_DEMO_AGENT_VISUAL_DELAY_MS,
    },
    createBlankLine(120),
    ...createBoxLines('Session', 'sessionTitle', [
        buildLabeledLine('State', [
            createTextPart(' DONE ', 'badgeDone'),
            createTextPart(' Run limit reached after 1 prompt run.', 'plain'),
        ]),
        buildLabeledLine('Runner', [
            createTextPart('claude-code', 'plain'),
            createTextPart('  ·  ', 'muted'),
            createTextPart('fable', 'plain'),
            createTextPart('  ·  ', 'muted'),
            createTextPart('thinking xhigh', 'plain'),
        ]),
        buildLabeledLine('Context', [createTextPart('AGENTS.md', 'plain')]),
        buildLabeledLine('Test', [createTextPart('npm run test-for-ptbk-coder', 'plain')]),
        buildLabeledLine('This run', [createTextPart('Task 1/7  ·  0 done  ·  7 left', 'plain')]),
        buildLabeledLine('Backlog', [createTextPart('Repo 363 total', 'plain')]),
        buildLabeledLine('Scope', [
            createTextPart('Priority ≥0  ·  Limit 1 prompt run  ·  Write 113 prompts first', 'plain'),
        ]),
        buildLabeledLine('Timing', [
            createTextPart('Elapsed 5h 34m  ·  Total estimating...  ·  ETA after first completion', 'plain'),
        ]),
        buildLabeledLine('Progress', [
            createTextPart('░'.repeat(LIVE_DEMO_EMPTY_PROGRESS_BAR_WIDTH), 'progressEmpty'),
            createTextPart(LIVE_DEMO_PROGRESS_LABEL, 'plain'),
        ]),
    ]),
    ...createBoxLines('Current task', 'taskTitle', [
        [createTextPart('prompts/2026-07-0200-ptbk-coder-web.md#1', 'plain')],
        [
            createTextPart('Attempt 1/3', 'plain'),
            createTextPart('  ·  ', 'muted'),
            createTextPart('Run limit reached after 1 prompt run.', 'plain'),
        ],
    ]),
    ...createBoxLines('Live output', 'outputTitle', [
        buildLiveOutputLine('- Local:        http://localhost:4440', 'plain'),
        buildLiveOutputLine('- Network:      http://172.23.224.1:4440', 'plain'),
        buildLiveOutputLine('✓ Starting...', 'success'),
        buildLiveOutputLine('✓ Ready in 4.6s', 'success'),
        buildLiveOutputLine(
            '(node:33208) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please ...',
            'muted',
        ),
        buildLiveOutputLine('(Use `node --trace-deprecation ...` to show where the warning was created)', 'muted'),
        buildLiveOutputLine(
            'Prerendered home page and saved to C:\\Users\\me\\work\\ai\\promptbook\\apps\\agents-server\\.n...',
            'muted',
        ),
        buildLiveOutputLine('🎉 All tests passed!', 'success'),
    ]),
    ...createBoxLines('Errors', 'errorTitle', [
        [
            createTextPart('✗ ', 'error'),
            createTextPart(`Command "bash ${LIVE_DEMO_ERROR_FILE_PATH}" exited with code 1`, 'plain'),
        ],
        ...buildFilePathRows(LIVE_DEMO_ERROR_FILE_PATH_CHUNKS),
    ]),
    ...createBoxLines('Controls', 'controlsTitle', [
        [
            createTextPart(' P ', 'key'),
            createTextPart(' Pause   ', 'plain'),
            createTextPart(' CTRL+C ', 'key'),
            createTextPart(' Exit', 'plain'),
        ],
    ]),
];

/**
 * Builds one colored text segment.
 */
function createTextPart(text: string, tone: LiveDemoTextTone): LiveDemoTextPart {
    return { text, tone };
}

/**
 * Builds one terminal text line.
 */
function createTextLine(
    parts: ReadonlyArray<LiveDemoTextPart>,
    delayMs = LIVE_DEMO_BOX_LINE_DELAY_MS,
): LiveDemoTextLine {
    return {
        kind: 'text',
        parts,
        delayMs,
    };
}

/**
 * Builds one empty terminal line.
 */
function createBlankLine(delayMs = LIVE_DEMO_BOX_LINE_DELAY_MS): LiveDemoTextLine {
    return createTextLine([], delayMs);
}

/**
 * Builds one boxed dashboard section.
 */
function createBoxLines(
    title: string,
    titleTone: LiveDemoTextTone,
    rows: ReadonlyArray<ReadonlyArray<LiveDemoTextPart>>,
): ReadonlyArray<LiveDemoTextLine> {
    const titleText = ` ${title} `;
    const borderWidth = Math.max(0, LIVE_DEMO_TERMINAL_BOX_WIDTH - 2 - titleText.length);

    return [
        createTextLine([
            createTextPart('┌', 'border'),
            createTextPart(titleText, titleTone),
            createTextPart(`${'─'.repeat(borderWidth)}┐`, 'border'),
        ]),
        ...rows.map(createBoxBodyLine),
        createTextLine([createTextPart(`└${'─'.repeat(LIVE_DEMO_TERMINAL_BOX_WIDTH - 2)}┘`, 'border')]),
    ];
}

/**
 * Builds one padded line inside a dashboard box.
 */
function createBoxBodyLine(parts: ReadonlyArray<LiveDemoTextPart>): LiveDemoTextLine {
    return createTextLine([
        createTextPart('│ ', 'border'),
        ...fitAndPadTextParts(parts, TERMINAL_BODY_WIDTH),
        createTextPart(' │', 'border'),
    ]);
}

/**
 * Builds one labeled row matching the rich CLI session box.
 */
function buildLabeledLine(label: string, valueParts: ReadonlyArray<LiveDemoTextPart>): ReadonlyArray<LiveDemoTextPart> {
    return [createTextPart(label.padEnd(SESSION_LABEL_WIDTH), 'label'), createTextPart(' ', 'plain'), ...valueParts];
}

/**
 * Builds one line in the live output box.
 */
function buildLiveOutputLine(text: string, tone: LiveDemoTextTone): ReadonlyArray<LiveDemoTextPart> {
    return [createTextPart('› ', 'success'), createTextPart(text, tone)];
}

/**
 * Builds wrapped full file path rows matching the rich CLI Errors panel.
 */
function buildFilePathRows(filePathChunks: ReadonlyArray<string>): ReadonlyArray<ReadonlyArray<LiveDemoTextPart>> {
    return filePathChunks.map((filePathChunk, index) =>
        buildLabeledLine(index === 0 ? 'File' : '', [createTextPart(filePathChunk, 'info')]),
    );
}

/**
 * Fits segmented text to a requested visible width and pads the remainder with spaces.
 */
function fitAndPadTextParts(
    parts: ReadonlyArray<LiveDemoTextPart>,
    visibleWidth: number,
): ReadonlyArray<LiveDemoTextPart> {
    const fittedParts: Array<LiveDemoTextPart> = [];
    let remainingWidth = visibleWidth;

    for (const part of parts) {
        if (remainingWidth <= 0) {
            break;
        }

        if (part.text.length <= remainingWidth) {
            fittedParts.push(part);
            remainingWidth -= part.text.length;
            continue;
        }

        const ellipsisWidth = Math.min(3, remainingWidth);
        const visibleTextWidth = Math.max(0, remainingWidth - ellipsisWidth);

        if (visibleTextWidth > 0) {
            fittedParts.push(createTextPart(part.text.slice(0, visibleTextWidth), part.tone));
        }

        fittedParts.push(createTextPart('.'.repeat(ellipsisWidth), part.tone));
        remainingWidth = 0;
    }

    const missingWidth = Math.max(0, visibleWidth - getVisibleTextLength(fittedParts));

    if (missingWidth === 0) {
        return fittedParts;
    }

    return [...fittedParts, createTextPart(' '.repeat(missingWidth), 'plain')];
}

/**
 * Computes visible length of segmented terminal text.
 */
function getVisibleTextLength(parts: ReadonlyArray<LiveDemoTextPart>): number {
    return parts.reduce((length, part) => length + part.text.length, 0);
}

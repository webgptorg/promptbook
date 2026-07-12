import { LIVE_TERMINAL_RUN_COMMAND } from './commands';

/**
 * Visual tone of one line in the live terminal dashboard.
 */
export type LiveTerminalLineTone = 'default' | 'muted' | 'success' | 'info' | 'warning';

/**
 * Visual tone of the `State` badge in the live terminal dashboard.
 */
export type LiveTerminalStateTone = 'loading' | 'running' | 'verifying' | 'done';

/**
 * One line shown in a live terminal dashboard panel.
 */
export type LiveTerminalLine = {
    /**
     * Text content of the line.
     */
    readonly text: string;

    /**
     * Optional color tone of the line.
     */
    readonly tone?: LiveTerminalLineTone;
};

/**
 * One labeled row shown in the `Session` panel.
 */
export type LiveTerminalSessionRow = {
    /**
     * Row label aligned on the left.
     */
    readonly label: string;

    /**
     * Row value aligned on the right.
     */
    readonly text: string;

    /**
     * Optional progress percentage shown as a terminal-like progress bar.
     */
    readonly progressPercentage?: number;
};

/**
 * One state of the real `ptbk coder run` dashboard replayed in the hero terminal.
 */
export type LiveTerminalDashboardSnapshot = {
    /**
     * Badge text shown in the `State` row.
     */
    readonly stateBadge: string;

    /**
     * Badge color tone.
     */
    readonly stateTone: LiveTerminalStateTone;

    /**
     * Human-readable state message shown next to the badge.
     */
    readonly stateMessage: string;

    /**
     * Session panel rows below `State`.
     */
    readonly sessionRows: ReadonlyArray<LiveTerminalSessionRow>;

    /**
     * Lines shown in the `Current task` panel.
     */
    readonly currentTaskLines: ReadonlyArray<LiveTerminalLine>;

    /**
     * Lines shown in the fixed-height `Live output` panel.
     */
    readonly liveOutputLines: ReadonlyArray<LiveTerminalLine>;

    /**
     * How long this snapshot stays visible before the next one appears.
     */
    readonly durationMs: number;
};

/**
 * Shell prompt shown before the live terminal command.
 */
export const LIVE_TERMINAL_SHELL_PROMPT = '~/work/ai/promptbook (main)';

/**
 * Command typed at the top of the live terminal demo.
 */
export const LIVE_DEMO_COMMAND = LIVE_TERMINAL_RUN_COMMAND;

/**
 * How long the live terminal rests after the dashboard reaches the final state before it loops again.
 */
export const LIVE_DEMO_LOOP_PAUSE_MS = 5000;

/**
 * How long the fake live terminal waits between typing two characters of a command, in milliseconds.
 */
export const LIVE_DEMO_TYPING_INTERVAL_MS = 10;

/**
 * Shared session rows that stay stable while one `ptbk coder run` task is processed.
 */
const LIVE_TERMINAL_BASE_SESSION_ROWS: ReadonlyArray<LiveTerminalSessionRow> = [
    { label: 'Runner', text: 'claude-code  ·  fable  ·  thinking xhigh' },
    { label: 'Context', text: 'AGENTS.md' },
    { label: 'Test', text: 'npm run test-for-ptbk-coder' },
    { label: 'This run', text: 'Task 1/7  ·  0 done  ·  7 left' },
    { label: 'Backlog', text: 'Repo 363 total' },
    { label: 'Scope', text: 'Priority ≥0  ·  Limit 1 prompt run  ·  Write 113 prompts first' },
    { label: 'Timing', text: 'Elapsed 5h 34m  ·  Total estimating...  ·  ETA after first completion' },
    { label: 'Progress', text: '0% complete (0/7 done)', progressPercentage: 0 },
];

/**
 * The real `ptbk coder run` dashboard states replayed by the hero live terminal.
 *
 * Note: The rows mirror the rich terminal UI from `scripts/run-codex-prompts/ui/buildCoderRunUiFrame.ts`.
 */
export const LIVE_TERMINAL_DASHBOARD_SNAPSHOTS: ReadonlyArray<LiveTerminalDashboardSnapshot> = [
    {
        stateBadge: 'LOADING',
        stateTone: 'loading',
        stateMessage: 'Resolving agent book, context and prompt queue.',
        sessionRows: LIVE_TERMINAL_BASE_SESSION_ROWS,
        currentTaskLines: [
            { text: 'prompts/2026-07-0200-ptbk-coder-web.md#1' },
            { text: 'Attempt 1/3  ·  Preparing runner prompt.', tone: 'muted' },
        ],
        liveOutputLines: [
            { text: 'Loading prompt files from prompts/ ...', tone: 'muted' },
            { text: 'Found 7 runnable prompts in current scope.', tone: 'info' },
            { text: 'Compiled agents/coding/developer.book.', tone: 'success' },
        ],
        durationMs: 1400,
    },
    {
        stateBadge: 'RUNNING',
        stateTone: 'running',
        stateMessage: 'claude-code is working on the current prompt.',
        sessionRows: LIVE_TERMINAL_BASE_SESSION_ROWS,
        currentTaskLines: [
            { text: 'prompts/2026-07-0200-ptbk-coder-web.md#1' },
            { text: 'Attempt 1/3  ·  Running claude-code.', tone: 'muted' },
        ],
        liveOutputLines: [
            { text: 'Reading AGENTS.md and repository context...', tone: 'muted' },
            { text: 'Inspecting apps/coder-landing and coder UI modules.', tone: 'muted' },
            { text: 'Updating the live terminal sample.', tone: 'info' },
            { text: 'Applying focused landing-page edits.', tone: 'info' },
        ],
        durationMs: 2200,
    },
    {
        stateBadge: 'VERIFYING',
        stateTone: 'verifying',
        stateMessage: 'Running npm run test-for-ptbk-coder.',
        sessionRows: LIVE_TERMINAL_BASE_SESSION_ROWS,
        currentTaskLines: [
            { text: 'prompts/2026-07-0200-ptbk-coder-web.md#1' },
            { text: 'Attempt 1/3  ·  Verifying the changed landing page.', tone: 'muted' },
        ],
        liveOutputLines: [
            { text: '›    - Local:        http://localhost:4440', tone: 'muted' },
            { text: '›    - Network:      http://172.23.224.1:4440', tone: 'muted' },
            { text: '›  ✓ Starting...', tone: 'success' },
            { text: '›  ✓ Ready in 4.6s', tone: 'success' },
            { text: '› Rendering home page into apps/agents-server/.next ...', tone: 'muted' },
        ],
        durationMs: 2200,
    },
    {
        stateBadge: 'DONE',
        stateTone: 'done',
        stateMessage: 'Run limit reached after 1 prompt run.',
        sessionRows: LIVE_TERMINAL_BASE_SESSION_ROWS,
        currentTaskLines: [
            { text: 'prompts/2026-07-0200-ptbk-coder-web.md#1' },
            { text: 'Attempt 1/3  ·  Run limit reached after 1 prompt run.', tone: 'muted' },
        ],
        liveOutputLines: [
            { text: '›  ✓ Starting...', tone: 'success' },
            { text: '›  ✓ Ready in 4.6s', tone: 'success' },
            { text: '› (node:33208) [DEP0040] Deprecation warning emitted by the runner', tone: 'warning' },
            { text: '› Rendered home page and saved to apps/agents-server/.next', tone: 'muted' },
            { text: '› 🎉 All tests passed!', tone: 'success' },
        ],
        durationMs: 5200,
    },
];

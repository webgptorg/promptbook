import { stripAnsi, terminalSafe } from './ansi.js';

/**
 * What the terminal title says about this session.
 *
 * @private terminal title
 */
export type TerminalTitleContext = {
    /** Project name (omitted by host-wide views such as the global dashboard). */
    readonly project?: string;
    /** Current mode, e.g. `Init`, `Dashboard`, `Chat`. */
    readonly mode: string;
    /** Current task, chat or state within the mode. */
    readonly detail?: string;
};

/**
 * The minimal title of a dashboard: `PTBK <single-line agent visual> <project name>` (or `Global`).
 *
 * @private terminal title
 */
export type DashboardTitleContext = {
    readonly kind: 'dashboard';
    /** Project name, or `Global` for the host-wide dashboard. */
    readonly label: string;
    /** The single-line agent visual of the current frame (the same renderer as the terminal badges). */
    readonly visual: string;
    /** Project kept by nested views that change only their mode (absent for the global dashboard). */
    readonly project?: string;
};

/**
 * Recognizable symbol leading every title (text in the title, not the terminal's own icon).
 */
const TITLE_SYMBOL = '📖';

/**
 * Prefix of the minimal dashboard titles.
 */
const DASHBOARD_PREFIX = 'PTBK';

/**
 * Longest project name kept in a title (graphemes).
 */
const PROJECT_MAX_LENGTH = 32;

/**
 * Longest detail (task/chat/state) kept in a title (graphemes).
 */
const DETAIL_MAX_LENGTH = 48;

/**
 * Longest whole title (graphemes).
 */
const TITLE_MAX_LENGTH = 96;

/**
 * Line breaks and other whitespace controls that become one ordinary space.
 */
const LINE_BREAKS = /\r\n|[\r\n\t\v\f\u0085\u2028\u2029]/g;

/**
 * Remaining unsafe characters: C0/C1 controls (ESC, BEL, 8-bit CSI/OSC/ST), DEL and bidirectional controls that
 * could make a title misleading.
 */
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/**
 * Grapheme segmenter used for length capping (never splits an emoji or combined character).
 */
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * Environment values that disable automatic title changes.
 */
const DISABLED_VALUES = new Set(['0', 'false', 'off', 'no', 'never', 'disable', 'disabled']);

/**
 * Makes untrusted text (project, task or chat names) safe for a one-line terminal title.
 *
 * Escape sequences and control characters are removed, line breaks and whitespace runs become one space, and the
 * result is capped to `maxLength` graphemes with an ellipsis.
 *
 * @private terminal title
 */
export function sanitizeTitleText(text: string, maxLength: number = TITLE_MAX_LENGTH, ellipsis = '…'): string {
    const flat = stripAnsi(terminalSafe(text.replace(LINE_BREAKS, ' ')))
        .replace(UNSAFE_CHARACTERS, '')
        .replace(/\s+/g, ' ')
        .trim();
    const graphemes = Array.from(segmenter.segment(flat), ({ segment }) => segment);
    if (graphemes.length <= maxLength) return flat;
    return `${graphemes
        .slice(0, Math.max(0, maxLength - [...segmenter.segment(ellipsis)].length))
        .join('')
        .trimEnd()}${ellipsis}`;
}

/**
 * Formats a concise title: symbol, `Promptbook`, then project, mode and detail, e.g.
 * `📖 Promptbook · birds · Dashboard · Expert: Write the README`.
 *
 * Terminals without safe Unicode get a plain ASCII form (`Promptbook - birds - Dashboard`).
 *
 * @private terminal title
 */
export function formatTerminalTitle(context: TerminalTitleContext, unicode = true): string {
    const ellipsis = unicode ? '…' : '...';
    const parts = [
        context.project === undefined ? '' : sanitizeTitleText(context.project, PROJECT_MAX_LENGTH, ellipsis),
        sanitizeTitleText(context.mode, DETAIL_MAX_LENGTH, ellipsis),
        context.detail === undefined ? '' : sanitizeTitleText(context.detail, DETAIL_MAX_LENGTH, ellipsis),
    ].filter(Boolean);
    const title = [unicode ? `${TITLE_SYMBOL} Promptbook` : 'Promptbook', ...parts].join(unicode ? ' · ' : ' - ');
    return sanitizeTitleText(title, TITLE_MAX_LENGTH, ellipsis);
}

/**
 * Formats the exact dashboard title `PTBK <visual> <label>`, e.g. `PTBK ~<@@/>- birds` or `PTBK ~<@@/>/ Global`,
 * without the book symbol, the word Promptbook, version, path, mode or task (those live inside the dashboard).
 *
 * @private terminal title
 */
export function formatDashboardTitle(context: Omit<DashboardTitleContext, 'kind'>, unicode = true): string {
    const ellipsis = unicode ? '…' : '...';
    const visual = sanitizeTitleText(context.visual, 16, ellipsis);
    return sanitizeTitleText([DASHBOARD_PREFIX, visual, sanitizeTitleText(context.label, PROJECT_MAX_LENGTH, ellipsis)].filter(Boolean).join(' '), TITLE_MAX_LENGTH, ellipsis);
}

/**
 * The OSC 0 sequence setting the terminal's window title and icon name (tab label) to an already sanitized title.
 *
 * @private terminal title
 */
export function titleSequence(title: string): string {
    return `\x1b]0;${title}\x07`;
}

/**
 * XTWINOPS: saves the current window title and icon name on the terminal's title stack (ignored where unsupported).
 */
const PUSH_TITLE = '\x1b[22;0t';

/**
 * XTWINOPS: restores the title saved by {@link PUSH_TITLE} (ignored where unsupported).
 */
const POP_TITLE = '\x1b[23;0t';

/**
 * OSC 0 with an empty title: gives the label back to the terminal's own default (VS Code shows the process name again).
 */
const CLEAR_TITLE = titleSequence('');

/**
 * Whether automatic title changes are switched off, by `--no-terminal-title`, `PTBK_TERMINAL_TITLE=off` or the common
 * `DISABLE_AUTO_TITLE=true` preference of users who manage their titles themselves (an explicit
 * `PTBK_TERMINAL_TITLE=on` wins over the latter).
 *
 * @private terminal title
 */
export function isTerminalTitleDisabled(env: NodeJS.ProcessEnv, option?: boolean): boolean {
    if (option === false) return true;
    const explicit = env.PTBK_TERMINAL_TITLE?.trim().toLowerCase();
    if (explicit) return DISABLED_VALUES.has(explicit);
    const shell = env.DISABLE_AUTO_TITLE?.trim().toLowerCase();
    return Boolean(shell) && !DISABLED_VALUES.has(shell!);
}

/**
 * Options of the title controller.
 *
 * @private terminal title
 */
export type TerminalTitleOptions = {
    /** Interactive pretty TTY session that has not opted out. */
    readonly enabled: boolean;
    /** Unicode symbols are safe. */
    readonly unicode: boolean;
    /**
     * How the title is given back on exit: `stack` (default) saves the previous title on the terminal's title stack and
     * restores it, leaving restoration to the shell or terminal where the stack is unsupported; `clear` empties this
     * session's title for terminals known to ignore the stack (VS Code), so a finished session does not stay named.
     */
    readonly restoration?: 'stack' | 'clear';
    /** Writes control sequences to the terminal (stdout). */
    readonly write: (text: string) => void;
};

/**
 * How a terminal gets its title back: VS Code's terminal (also its forks, which keep `TERM_PROGRAM=vscode`) leaves the
 * title stack controls disabled, so the title is cleared there instead.
 *
 * @private terminal title
 */
export function titleRestoration(env: NodeJS.ProcessEnv): 'stack' | 'clear' {
    return env.TERM_PROGRAM === 'vscode' ? 'clear' : 'stack';
}

/**
 * Self-naming terminal title of one interactive session.
 *
 * Inert unless enabled (interactive pretty TTY, not opted out), so redirected, raw, JSON and noninteractive use never
 * receives title controls. A title is written only when its text changes, never per render tick, so it does not fight
 * shell or terminal integrations. The previous title is saved on the terminal's title stack before the first change
 * and restored on exit where the terminal supports it; elsewhere the shell or terminal restores its own title, except
 * that terminals known to ignore the stack get an empty title so they show their own label again.
 *
 * @private terminal title
 */
export class TerminalTitle {
    private context?: TerminalTitleContext | DashboardTitleContext;
    private shown?: string;
    /** This session changed the title and gives it back on exit. */
    private owned = false;
    private readonly restoreOnExit = (): void => this.restore();

    public constructor(private readonly options: TerminalTitleOptions) {}

    /** Whether this session changes the terminal title at all. */
    public get enabled(): boolean {
        return this.options.enabled;
    }

    /** The title this session currently shows (undefined before the first change or when disabled). */
    public get current(): string | undefined {
        return this.shown;
    }

    /** Shows a new context (project, mode and detail), or the exact dashboard title. */
    public set(context: TerminalTitleContext | DashboardTitleContext): void {
        this.context = context;
        this.show();
    }

    /** Changes the mode/detail while keeping the project of the current context. */
    public update(change: Omit<TerminalTitleContext, 'project'>): void {
        this.set({ project: this.context?.project, ...change });
    }

    /**
     * Writes the current title again even when it did not change: a shell or terminal integration (notably VS Code)
     * may have replaced it with a generic label such as `node`. Never moves focus or writes anything else.
     */
    public reassert(): void {
        this.shown = undefined;
        this.show();
    }

    /** Forgets which title is shown, because another process (a delegated engine's view) may have changed it. */
    public invalidate(): void {
        this.shown = undefined;
    }

    /**
     * Gives the title back: restores the one saved before this session's first change (where the terminal supports the
     * title stack), or clears this session's title on terminals known to ignore the stack.
     */
    public restore(): void {
        if (!this.owned) return;
        this.owned = false;
        this.shown = undefined;
        process.off('exit', this.restoreOnExit);
        try {
            this.options.write(this.options.restoration === 'clear' ? CLEAR_TITLE : POP_TITLE);
        } catch {
            // The terminal is gone; its title no longer matters.
        }
    }

    /** Writes the title when it differs from what is shown. */
    private show(): void {
        if (!this.options.enabled || !this.context) return;
        const title = 'kind' in this.context ? formatDashboardTitle(this.context, this.options.unicode) : formatTerminalTitle(this.context, this.options.unicode);
        if (title === this.shown) return;
        let output = '';
        if (!this.owned) {
            this.owned = true;
            if (this.options.restoration !== 'clear') output += PUSH_TITLE;
            process.once('exit', this.restoreOnExit);
        }
        this.shown = title;
        this.options.write(`${output}${titleSequence(title)}`);
    }
}

/**
 * Cadence of the animated dashboard title (the badge's working gesture alternates at this pace).
 *
 * @private terminal title
 */
export const TITLE_FRAME_MS = 700;

/**
 * Interval of periodic title reassertion while the dashboard is open (also with reduced motion).
 */
const TITLE_REASSERT_MS = 3_000;

/**
 * Keeps an animated title alive while a dashboard is open: advances the single-line agent visual at a bounded cadence
 * (a still frame with reduced motion) and periodically reasserts the title so terminal integrations that restore a
 * generic label do not win. Title writes never touch focus, input or the engine.
 *
 * @private terminal title
 */
export class TitleAnimation {
    private frame = 0;
    private timer?: NodeJS.Timeout;
    private lastWrite = 0;

    public constructor(
        private readonly title: TerminalTitle,
        private readonly render: (frame: number) => TerminalTitleContext | DashboardTitleContext,
        private readonly reducedMotion: boolean,
    ) {}

    /** Shows the title now and keeps it animated/reasserted until stopped. */
    public start(): void {
        if (!this.title.enabled || this.timer) return;
        this.refresh(true);
        this.timer = setInterval(() => {
            if (!this.reducedMotion) this.frame++;
            this.refresh(Date.now() - this.lastWrite >= TITLE_REASSERT_MS);
        }, this.reducedMotion ? TITLE_REASSERT_MS : TITLE_FRAME_MS);
        this.timer.unref();
    }

    /** Re-renders the current frame (after the observed worker changed); `force` rewrites an unchanged title. */
    public refresh(force = false): void {
        if (!this.title.enabled) return;
        const before = this.title.current;
        this.title.set(this.render(this.reducedMotion ? 0 : this.frame));
        if (force && this.title.current === before) this.title.reassert();
        if (force || this.title.current !== before) this.lastWrite = Date.now();
    }

    /** Stops animating (the title itself is restored by the terminal profile on exit). */
    public stop(): void {
        clearInterval(this.timer);
        this.timer = undefined;
    }
}

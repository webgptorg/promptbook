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
 * Recognizable symbol leading every title (text in the title, not the terminal's own icon).
 */
const TITLE_SYMBOL = '📖';

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
    /** Writes control sequences to the terminal (stdout). */
    readonly write: (text: string) => void;
};

/**
 * Self-naming terminal title of one interactive session.
 *
 * Inert unless enabled (interactive pretty TTY, not opted out), so redirected, raw, JSON and noninteractive use never
 * receives title controls. A title is written only when its text changes, never per render tick, so it does not fight
 * shell or terminal integrations. The previous title is saved on the terminal's title stack before the first change
 * and restored on exit where the terminal supports it; elsewhere the shell or terminal restores its own title.
 *
 * @private terminal title
 */
export class TerminalTitle {
    private context?: TerminalTitleContext;
    private shown?: string;
    private saved = false;
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

    /** Shows a new context (project, mode and detail). */
    public set(context: TerminalTitleContext): void {
        this.context = context;
        this.show();
    }

    /** Changes the mode/detail while keeping the project of the current context. */
    public update(change: Omit<TerminalTitleContext, 'project'>): void {
        this.set({ project: this.context?.project, ...change });
    }

    /** Forgets which title is shown, because another process (a delegated engine's view) may have changed it. */
    public invalidate(): void {
        this.shown = undefined;
    }

    /** Restores the title saved before this session's first change (where the terminal supports the title stack). */
    public restore(): void {
        if (!this.saved) return;
        this.saved = false;
        this.shown = undefined;
        process.off('exit', this.restoreOnExit);
        try {
            this.options.write(POP_TITLE);
        } catch {
            // The terminal is gone; its title no longer matters.
        }
    }

    /** Writes the title when it differs from what is shown. */
    private show(): void {
        if (!this.options.enabled || !this.context) return;
        const title = formatTerminalTitle(this.context, this.options.unicode);
        if (title === this.shown) return;
        let output = '';
        if (!this.saved) {
            this.saved = true;
            output += PUSH_TITLE;
            process.once('exit', this.restoreOnExit);
        }
        this.shown = title;
        this.options.write(`${output}${titleSequence(title)}`);
    }
}

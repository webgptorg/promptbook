import { createStyle, type Style } from './ansi.js';
import { isTerminalTitleDisabled, TerminalTitle, titleRestoration } from './terminal-title.js';

/**
 * Presentation and input policy of one invocation.
 *
 * @private terminal UI
 */
export type TerminalProfile = {
    /** Designed terminal UI (colors, panels, cursor control). */
    readonly pretty: boolean;
    /** Keyboard input and prompts are permitted. */
    readonly interactive: boolean;
    /** Styles for stdout. */
    readonly style: Style;
    /** Unicode box drawing and symbols are safe. */
    readonly unicode: boolean;
    /** Current column count. */
    readonly columns: () => number;
    /** Current row count. */
    readonly rows: () => number;
    /** Writes to stdout. */
    readonly write: (text: string) => void;
    /** Writes to stderr. */
    readonly writeError: (text: string) => void;
    /** Reduced motion requested. */
    readonly reducedMotion: boolean;
    /** Self-naming terminal title (inert outside interactive pretty terminals or when opted out). */
    readonly title: TerminalTitle;
};

/**
 * Options deciding the terminal profile.
 *
 * @private terminal UI
 */
export type TerminalOptions = {
    /** `--raw` / `--no-ui`. */
    readonly raw?: boolean;
    /** `--interactive`. */
    readonly interactive?: boolean;
    /** `--non-interactive`. */
    readonly nonInteractive?: boolean;
    /** `--no-terminal-title` gives `false`. */
    readonly terminalTitle?: boolean;
    /** Output stream (defaults to stdout). */
    readonly stdout?: NodeJS.WriteStream;
    /** Input stream (defaults to stdin). */
    readonly stdin?: NodeJS.ReadStream;
    /** Environment. */
    readonly env?: NodeJS.ProcessEnv;
};

/**
 * Detects whether the output stream is a suitable terminal for pretty presentation.
 *
 * @private terminal UI
 */
export function isSuitableTerminal(stream: NodeJS.WriteStream = process.stdout, env: NodeJS.ProcessEnv = process.env): boolean {
    return Boolean(stream.isTTY) && env.TERM !== 'dumb';
}

/**
 * Builds the terminal profile: pretty by default on suitable terminals, raw when requested or redirected.
 *
 * @private terminal UI
 */
export function createTerminalProfile(options: TerminalOptions = {}): TerminalProfile {
    const stdout = options.stdout ?? process.stdout;
    const stdin = options.stdin ?? process.stdin;
    const env = options.env ?? process.env;
    const pretty = !options.raw && isSuitableTerminal(stdout, env);
    const colors = pretty && env.NO_COLOR === undefined && (stdout.hasColors?.() ?? true);
    const forced = env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0' && pretty;
    const canPrompt = Boolean(stdin.isTTY) && Boolean(stdout.isTTY);
    const interactive = !options.nonInteractive && !options.raw && canPrompt;
    const unicode = process.platform !== 'win32' || Boolean(env.WT_SESSION || env.TERM_PROGRAM || env.ConEmuANSI === 'ON' || env.TERMINAL_EMULATOR);
    const write = (text: string): void => {
        stdout.write(text);
    };
    return {
        pretty,
        interactive,
        style: createStyle(colors || forced),
        unicode,
        columns: () => Math.max(20, stdout.columns || 80),
        rows: () => Math.max(10, stdout.rows || 24),
        write,
        writeError: (text: string) => {
            process.stderr.write(text);
        },
        reducedMotion: Boolean(env.PTBK_REDUCED_MOTION || env.NO_MOTION),
        title: new TerminalTitle({ enabled: pretty && interactive && !isTerminalTitleDisabled(env, options.terminalTitle), unicode, restoration: titleRestoration(env), write }),
    };
}

/**
 * Status symbols with an ASCII fallback.
 *
 * @private terminal UI
 */
export function symbols(unicode: boolean): {
    readonly ok: string;
    readonly fail: string;
    readonly warn: string;
    readonly info: string;
    readonly bullet: string;
    readonly arrow: string;
    readonly pointer: string;
    readonly checked: string;
    readonly unchecked: string;
    readonly radioOn: string;
    readonly radioOff: string;
    readonly ellipsis: string;
    readonly dot: string;
    readonly wait: string;
} {
    return unicode
        ? { ok: '✔', fail: '✖', warn: '▲', info: 'ℹ', bullet: '•', arrow: '→', pointer: '❯', checked: '◉', unchecked: '○', radioOn: '●', radioOff: '○', ellipsis: '…', dot: '·', wait: '◷' }
        : { ok: 'OK', fail: 'X', warn: '!', info: 'i', bullet: '*', arrow: '->', pointer: '>', checked: '[x]', unchecked: '[ ]', radioOn: '(*)', radioOff: '( )', ellipsis: '...', dot: '-', wait: '~' };
}

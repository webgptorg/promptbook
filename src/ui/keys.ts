/**
 * A normalized key or input event.
 *
 * @private terminal input
 */
export type KeyEvent =
    | { readonly type: 'key'; readonly name: KeyName; readonly ctrl?: boolean; readonly alt?: boolean; readonly shift?: boolean }
    | { readonly type: 'text'; readonly text: string }
    | { readonly type: 'paste'; readonly text: string }
    | { readonly type: 'pointer'; readonly action: PointerAction; /** 0-based screen row. */ readonly row: number; /** 0-based screen column. */ readonly column: number };

/**
 * What the pointing device did: the primary button went down, or the wheel turned.
 *
 * @private terminal input
 */
export type PointerAction = 'press' | 'wheel-up' | 'wheel-down';

/**
 * A pointer event.
 *
 * @private terminal input
 */
export type PointerInput = Extract<KeyEvent, { readonly type: 'pointer' }>;

/**
 * Named keys.
 *
 * @private terminal input
 */
export type KeyName =
    | 'enter'
    | 'newline'
    | 'escape'
    | 'backspace'
    | 'delete'
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'home'
    | 'end'
    | 'pageup'
    | 'pagedown'
    | 'tab'
    | 'space'
    | 'c'
    | 'd'
    | 'a'
    | 'e'
    | 'u'
    | 'k'
    | 'w'
    | 'l'
    | 'o'
    | 'r'
    | 's'
    | 't'
    | 'v'
    | 'n'
    | 'x';

/** Project-session input middleware, shared by nested composers and protected forms. */
const INPUT_HANDLERS = new Set<(event: KeyEvent) => boolean>();

/** Terminal protocol replies are never user activity or composer input. */
const REPORT_HANDLERS = new Set<(report: string) => void>();

/** Focus reports supplement recent real input; focus alone never makes a view active. */
let terminalFocused = true;

/** Whether the terminal has explicitly reported itself in the background. @private terminal input */
export function terminalHasFocus(): boolean { return terminalFocused; }

/** Installs one invocation-scoped input handler; true consumes a reserved control. @private terminal input */
export function interceptInput(handler: (event: KeyEvent) => boolean): () => void {
    INPUT_HANDLERS.add(handler);
    return () => { INPUT_HANDLERS.delete(handler); };
}

/** Applies the invocation's shared controls before a normal or protected field handles a key. @private terminal input */
export function handleProjectInput(event: KeyEvent): boolean { return [...INPUT_HANDLERS].some((handler) => handler(event)); }

/** Observes terminal capability/notification responses without sending them to text fields. @private terminal input */
export function onTerminalReport(handler: (report: string) => void): () => void {
    REPORT_HANDLERS.add(handler);
    return () => { REPORT_HANDLERS.delete(handler); };
}

/**
 * Escape sequences of named keys.
 */
const SEQUENCES: ReadonlyArray<[string, KeyEvent]> = [
    ['\x1b[A', { type: 'key', name: 'up' }],
    ['\x1b[B', { type: 'key', name: 'down' }],
    ['\x1b[C', { type: 'key', name: 'right' }],
    ['\x1b[D', { type: 'key', name: 'left' }],
    ['\x1bOA', { type: 'key', name: 'up' }],
    ['\x1bOB', { type: 'key', name: 'down' }],
    ['\x1bOC', { type: 'key', name: 'right' }],
    ['\x1bOD', { type: 'key', name: 'left' }],
    ['\x1b[1;5C', { type: 'key', name: 'right', ctrl: true }],
    ['\x1b[1;5D', { type: 'key', name: 'left', ctrl: true }],
    ['\x1b[H', { type: 'key', name: 'home' }],
    ['\x1b[F', { type: 'key', name: 'end' }],
    ['\x1bOH', { type: 'key', name: 'home' }],
    ['\x1bOF', { type: 'key', name: 'end' }],
    ['\x1b[1~', { type: 'key', name: 'home' }],
    ['\x1b[4~', { type: 'key', name: 'end' }],
    ['\x1b[7~', { type: 'key', name: 'home' }],
    ['\x1b[8~', { type: 'key', name: 'end' }],
    ['\x1b[3~', { type: 'key', name: 'delete' }],
    ['\x1b[5~', { type: 'key', name: 'pageup' }],
    ['\x1b[6~', { type: 'key', name: 'pagedown' }],
    ['\x1b[Z', { type: 'key', name: 'tab', shift: true }],
    ['\x1b\r', { type: 'key', name: 'newline', alt: true }],
    ['\x1b\n', { type: 'key', name: 'newline', alt: true }],
    // Shift+Enter where the terminal distinguishes it (kitty keyboard protocol, xterm modifyOtherKeys).
    ['\x1b[13;2u', { type: 'key', name: 'newline', shift: true }],
    ['\x1b[27;2;13~', { type: 'key', name: 'newline', shift: true }],
];

/**
 * Control characters.
 */
const CONTROL: Readonly<Record<string, KeyEvent>> = {
    '\r': { type: 'key', name: 'enter' },
    '\n': { type: 'key', name: 'newline', ctrl: true },
    '\t': { type: 'key', name: 'tab' },
    ' ': { type: 'key', name: 'space' },
    '\x7f': { type: 'key', name: 'backspace' },
    '\b': { type: 'key', name: 'backspace' },
    '\x03': { type: 'key', name: 'c', ctrl: true },
    '\x04': { type: 'key', name: 'd', ctrl: true },
    '\x01': { type: 'key', name: 'a', ctrl: true },
    '\x05': { type: 'key', name: 'e', ctrl: true },
    '\x15': { type: 'key', name: 'u', ctrl: true },
    '\x0b': { type: 'key', name: 'k', ctrl: true },
    '\x17': { type: 'key', name: 'w', ctrl: true },
    '\x0c': { type: 'key', name: 'l', ctrl: true },
    '\x0f': { type: 'key', name: 'o', ctrl: true },
    '\x12': { type: 'key', name: 'r', ctrl: true },
    '\x13': { type: 'key', name: 's', ctrl: true },
    '\x14': { type: 'key', name: 't', ctrl: true },
    '\x16': { type: 'key', name: 'v', ctrl: true },
    '\x0e': { type: 'key', name: 'n', ctrl: true },
    '\x18': { type: 'key', name: 'x', ctrl: true },
};

/**
 * Bracketed paste start/end markers.
 */
const PASTE_START = '\x1b[200~';

/**
 * Bracketed paste end marker.
 */
const PASTE_END = '\x1b[201~';

/**
 * Asks for pointer presses and the wheel (no motion) in the SGR encoding, which has no coordinate limit.
 */
const POINTER_ON = '\x1b[?1000h\x1b[?1006h';

/**
 * Ends pointer reports.
 */
const POINTER_OFF = '\x1b[?1006l\x1b[?1000l';

/**
 * The start of a pointer or cursor report whose rest is in the next chunk (its digits must not arrive as typed text).
 */
const UNFINISHED_REPORT = /^\x1b\[(?:<[\d;]*|\d+;\d*)$/;

/**
 * Whether this terminal gets pointer reports while a picker or composer has focus. `PTBK_TERMINAL_POINTER=off` keeps
 * native selection and scrollback there, `on` asks for reports anyway. Windows consoles stay keyboard-only unless
 * asked: Node reads them as key records, so tracking would cost native selection without delivering presses.
 *
 * @private terminal input
 */
export function allowsPointer(env: NodeJS.ProcessEnv, platform: NodeJS.Platform = process.platform): boolean {
    const configured = env.PTBK_TERMINAL_POINTER?.trim().toLowerCase();
    if (configured === 'off' || configured === 'on') return configured === 'on';
    return platform !== 'win32';
}

/**
 * The event of one SGR pointer report: a press of the primary button or a wheel step, with any modifier. Releases,
 * motion and other buttons are not used.
 */
function pointerEvent(code: number, column: number, row: number, pressed: boolean): KeyEvent | undefined {
    const button = code & ~(4 | 8 | 16);
    const action = button === 0 ? 'press' : button === 64 ? 'wheel-up' : button === 65 ? 'wheel-down' : undefined;
    return action && pressed ? { type: 'pointer', action, row: row - 1, column: column - 1 } : undefined;
}

/**
 * Incremental parser of raw terminal input (keeps an unfinished paste or report across chunks).
 *
 * @private terminal input
 */
export class KeyParser {
    private paste?: string;
    private held = '';
    /** Receives answers to a cursor position question (1-based), which are not input of the user. */
    public onCursorReport?: (row: number, column: number) => void;

    /**
     * Parses one chunk of raw input into events.
     */
    public parse(chunk: string): KeyEvent[] {
        const events: KeyEvent[] = [];
        let rest = this.held + chunk;
        this.held = '';
        while (rest.length) {
            if (rest === '\x1b[') { this.held = rest; return events; }
            if (this.paste !== undefined) {
                const end = rest.indexOf(PASTE_END);
                if (end < 0) {
                    this.paste += rest;
                    return events;
                }
                events.push({ type: 'paste', text: (this.paste + rest.slice(0, end)).replace(/\r\n?/g, '\n') });
                this.paste = undefined;
                rest = rest.slice(end + PASTE_END.length);
                continue;
            }
            if (rest.startsWith('\x1b]')) {
                const end = /\x07|\x1b\\/.exec(rest);
                if (!end) {
                    // Bound malformed or truncated terminal replies rather than growing input memory indefinitely.
                    this.held = rest.length < 8192 ? rest : '';
                    return events;
                }
                const report = rest.slice(2, end.index);
                for (const handler of REPORT_HANDLERS) handler(report);
                rest = rest.slice(end.index + end[0].length);
                continue;
            }
            if (rest.startsWith('\x1b[I') || rest.startsWith('\x1b[O')) {
                terminalFocused = rest[2] === 'I';
                rest = rest.slice(3);
                continue;
            }
            if (rest.startsWith(PASTE_START)) {
                this.paste = '';
                rest = rest.slice(PASTE_START.length);
                continue;
            }
            if (UNFINISHED_REPORT.test(rest)) {
                this.held = rest;
                return events;
            }
            if (rest.startsWith('\x1b[<')) {
                const match = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])/.exec(rest);
                const event = match && pointerEvent(Number(match[1]), Number(match[2]), Number(match[3]), match[4] === 'M');
                if (event) events.push(event);
                rest = rest.slice(match ? match[0].length : 3);
                continue;
            }
            // A terminal without the SGR encoding reports in three raw bytes, which must not arrive as typed text.
            if (rest.startsWith('\x1b[M')) {
                rest = rest.slice(6);
                continue;
            }
            const report = this.onCursorReport && /^\x1b\[(\d+);(\d+)R/.exec(rest);
            if (report) {
                this.onCursorReport!(Number(report[1]), Number(report[2]));
                rest = rest.slice(report[0].length);
                continue;
            }
            const sequence = SEQUENCES.find(([prefix]) => rest.startsWith(prefix));
            if (sequence) {
                events.push(sequence[1]);
                rest = rest.slice(sequence[0].length);
                continue;
            }
            if (rest === '\x1b') {
                events.push({ type: 'key', name: 'escape' });
                break;
            }
            // A terminal reporting macOS Command+V (or Ctrl+V) as a CSI-u key chord enters the same rich paste.
            const chord = /^\x1b\[(118|86)(?::\d+)*;(\d+)(?::\d+)?u/.exec(rest);
            if (chord && ((Number(chord[2]) - 1) & (8 | 4))) {
                events.push({ type: 'key', name: 'v', ctrl: true });
                rest = rest.slice(chord[0].length);
                continue;
            }
            if (rest.startsWith('\x1b[') || rest.startsWith('\x1bO')) {
                const match = /^\x1b[[O][0-9;]*[ -/]*[@-~]/.exec(rest);
                rest = rest.slice(match ? match[0].length : 2);
                continue;
            }
            if (rest.startsWith('\x1b')) {
                events.push({ type: 'key', name: 'escape' });
                rest = rest.slice(1);
                continue;
            }
            const character = String.fromCodePoint(rest.codePointAt(0)!);
            const control = CONTROL[character];
            if (control) {
                events.push(control);
                rest = rest.slice(character.length);
                continue;
            }
            if (character < ' ') {
                rest = rest.slice(character.length);
                continue;
            }
            let text = '';
            while (rest.length) {
                const next = String.fromCodePoint(rest.codePointAt(0)!);
                if (next === '\x1b' || CONTROL[next] || next < ' ') break;
                text += next;
                rest = rest.slice(next.length);
            }
            events.push({ type: 'text', text });
        }
        return events;
    }
}

/**
 * Raw-mode keyboard session on stdin (bracketed paste enabled), restored on stop.
 *
 * @private terminal input
 */
export class KeyboardSession {
    private readonly parser = new KeyParser();
    private listener?: (chunk: Buffer | string) => void;
    private wasRaw = false;
    private pointer = false;
    /** No other handler of the termination signal existed when pointer reports began. */
    private terminationUnhandled = false;
    /** A crash must not leave the shell receiving pointer reports as typed text. */
    private readonly endPointerOnExit = (): void => {
        this.output.write(POINTER_OFF);
    };
    /** Neither must being terminated; without another handler the signal still ends the process, as it would have. */
    private readonly endPointerOnTermination = (): void => {
        this.output.write(POINTER_OFF);
        if (!this.terminationUnhandled || process.listenerCount('SIGTERM') > 0) return;
        this.stop();
        process.kill(process.pid, 'SIGTERM');
    };

    public constructor(
        private readonly onEvent: (event: KeyEvent) => void,
        private readonly input: NodeJS.ReadStream = process.stdin,
        private readonly output: NodeJS.WriteStream = process.stdout,
    ) {}

    /** Enters raw mode. */
    public start(): void {
        if (!this.input.isTTY) return;
        this.wasRaw = this.input.isRaw;
        this.input.setRawMode(true);
        this.input.resume();
        this.output.write('\x1b[?2004h');
        this.listener = (chunk: Buffer | string) => {
            for (const event of this.parser.parse(chunk.toString())) {
                if (event.type === 'pointer' && !this.pointer) continue;
                if (handleProjectInput(event)) continue;
                this.onEvent(event);
            }
        };
        this.input.on('data', this.listener);
        if (this.pointer) this.setPointerReports(true);
    }

    /**
     * Turns pointer events on or off, also across a stop and a later start. While on, native text selection and
     * scrollback need a modifier (usually Shift, or Option on macOS), so surfaces ask only while a picker or composer
     * has focus. `onCursorReport` receives answers to a cursor position question (1-based row).
     */
    public trackPointer(on: boolean, onCursorReport?: (row: number) => void): void {
        if (onCursorReport) this.parser.onCursorReport = onCursorReport;
        if (on === this.pointer) return;
        this.pointer = on;
        if (this.listener) this.setPointerReports(on);
    }

    /** Asks the terminal to start or end pointer reports. */
    private setPointerReports(on: boolean): void {
        this.output.write(on ? POINTER_ON : POINTER_OFF);
        if (on) {
            this.terminationUnhandled = process.listenerCount('SIGTERM') === 0;
            process.once('exit', this.endPointerOnExit);
            process.once('SIGTERM', this.endPointerOnTermination);
        } else {
            process.off('exit', this.endPointerOnExit);
            process.off('SIGTERM', this.endPointerOnTermination);
        }
    }

    /** Restores the terminal. */
    public stop(): void {
        if (this.listener && this.pointer) this.setPointerReports(false);
        if (this.listener) this.input.off('data', this.listener);
        this.listener = undefined;
        if (this.input.isTTY) {
            this.output.write('\x1b[?2004l');
            this.input.setRawMode(this.wasRaw);
            this.input.pause();
        }
    }
}

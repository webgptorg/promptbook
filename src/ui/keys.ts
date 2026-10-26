/**
 * A normalized key or input event.
 *
 * @private terminal input
 */
export type KeyEvent =
    | { readonly type: 'key'; readonly name: KeyName; readonly ctrl?: boolean; readonly alt?: boolean; readonly shift?: boolean }
    | { readonly type: 'text'; readonly text: string }
    | { readonly type: 'paste'; readonly text: string };

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
    | 'x';

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
 * Incremental parser of raw terminal input (keeps an unfinished paste across chunks).
 *
 * @private terminal input
 */
export class KeyParser {
    private paste?: string;

    /**
     * Parses one chunk of raw input into events.
     */
    public parse(chunk: string): KeyEvent[] {
        const events: KeyEvent[] = [];
        let rest = chunk;
        while (rest.length) {
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
            if (rest.startsWith(PASTE_START)) {
                this.paste = '';
                rest = rest.slice(PASTE_START.length);
                continue;
            }
            if (rest.startsWith('\x1b[<')) {
                const match = /^\x1b\[<\d+;\d+;\d+[Mm]/.exec(rest);
                rest = rest.slice(match ? match[0].length : 3);
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
            for (const event of this.parser.parse(chunk.toString())) this.onEvent(event);
        };
        this.input.on('data', this.listener);
    }

    /** Restores the terminal. */
    public stop(): void {
        if (this.listener) this.input.off('data', this.listener);
        this.listener = undefined;
        if (this.input.isTTY) {
            this.output.write('\x1b[?2004l');
            this.input.setRawMode(this.wasRaw);
            this.input.pause();
        }
    }
}

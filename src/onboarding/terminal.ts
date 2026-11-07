import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IPty } from '@lydell/node-pty';
import { PtbkError } from '../common/errors.js';
import { resolveInvocation } from '../common/process.js';
import type { HarnessContext, HarnessLoginMethod, HarnessPlugin } from '../harness/types.js';

/** Engine-owned browser route and static asset prefix. @private onboarding */
export const HARNESS_TERMINAL_PATH = '/_ptbk/harness-terminal';

/** One batch of native terminal output. Offsets count UTF-16 code units. @private onboarding */
export type TerminalFrame = { readonly output: string; readonly offset: number; readonly done: boolean };

/** An exclusive attachment to the PTY. Nothing in this record is written to disk. */
type Attachment = {
    readonly owner: string;
    readonly id: string;
    readonly expires: number;
    lastContact: number;
    pty?: IPty;
    directory?: string;
    output: string;
    offset: number;
    done: boolean;
};

/** Bounds an abandoned terminal and prevents a client from retaining an unbounded transcript. */
const IDLE_MS = 3 * 60_000; // The owner may switch apps to complete the provider sign-in.
const LIFETIME_MS = 8 * 60_000;
const OUTPUT_LIMIT = 32 * 1024;

/** The bounded wire shape of each terminal operation. */
const COMMAND_FIELDS = {
    start: ['cols', 'rows'],
    read: ['offset'],
    write: ['data'],
    resize: ['cols', 'rows'],
    close: [],
} as const;

/** Keeps an xterm or CLI viewport within the limits of the native PTY. */
function dimension(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isInteger(value) ? Math.min(300, Math.max(10, value)) : fallback;
}

/** The engine starts only the harness adapter's fixed native login invocation, under its own account. @private onboarding */
export class HarnessLoginTerminal {
    private active?: Attachment;
    private timer?: NodeJS.Timeout;

    public constructor(
        private readonly plugin: HarnessPlugin,
        private readonly context: HarnessContext,
        private readonly method: HarnessLoginMethod,
    ) {}

    /** Exchanges terminal input and output with one authenticated attachment. */
    public async command(owner: string, command: Readonly<Record<string, unknown>>): Promise<TerminalFrame | null> {
        const { id, action } = command;
        const fields: readonly string[] | undefined = typeof action === 'string' && Object.hasOwn(COMMAND_FIELDS, action) ? COMMAND_FIELDS[action as keyof typeof COMMAND_FIELDS] : undefined;
        if (!fields || Object.keys(command).some((key) => !['id', 'promptId', 'action'].includes(key) && !fields.includes(key))) {
            throw new PtbkError('Invalid terminal operation.', { kind: 'usage' });
        }
        if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) throw new PtbkError('Invalid terminal attachment.', { kind: 'usage' });
        if (action === 'start') {
            if (this.active) throw new PtbkError('A sign-in terminal is already open.', { kind: 'conflict' });
            await this.start(owner, id, dimension(command.cols, 80), dimension(command.rows, 24));
            return null;
        }
        const terminal = this.active;
        if (!terminal || terminal.owner !== owner || terminal.id !== id) throw new PtbkError('The sign-in terminal is closed.', { kind: 'conflict' });
        terminal.lastContact = Date.now();
        switch (action) {
            case 'read': {
                const offset = command.offset;
                if (typeof offset !== 'number' || !Number.isSafeInteger(offset) || offset < 0 || offset > terminal.offset) throw new PtbkError('Invalid terminal offset.', { kind: 'usage' });
                const start = terminal.offset - terminal.output.length;
                return { output: terminal.output.slice(Math.max(0, offset - start)), offset: terminal.offset, done: terminal.done };
            }
            case 'write':
                if (typeof command.data !== 'string' || command.data.length > 4096) throw new PtbkError('Invalid terminal input.', { kind: 'usage' });
                if (!terminal.done) terminal.pty?.write(command.data);
                break;
            case 'resize':
                if (!terminal.done) terminal.pty?.resize(dimension(command.cols, 80), dimension(command.rows, 24));
                break;
            case 'close': this.close(); break;
            default: throw new PtbkError('Unknown terminal operation.', { kind: 'usage' });
        }
        return null;
    }

    /** Stops the process and drops the transcript when the client or wizard leaves. */
    public close(): void {
        const terminal = this.active;
        this.active = undefined;
        clearInterval(this.timer);
        this.timer = undefined;
        if (!terminal) return;
        terminal.output = '';
        try { if (!terminal.done) terminal.pty?.kill(); }
        catch { /* The CLI can exit between the close request and kill. */ }
        if (terminal.directory) void rm(terminal.directory, { recursive: true, force: true }).catch(() => undefined);
    }

    /** Resolves the executable and opens a genuine OS pseudoterminal. */
    private async start(owner: string, id: string, cols: number, rows: number): Promise<void> {
        const now = Date.now();
        const terminal: Attachment = { owner, id, expires: now + LIFETIME_MS, lastContact: now, output: '', offset: 0, done: false };
        this.active = terminal;
        try {
            const env: NodeJS.ProcessEnv = { ...this.context.env, ...this.method.env, TERM: 'xterm-256color' };
            if (process.platform !== 'win32' && (owner.startsWith('web:') || (!env.BROWSER && !env.DISPLAY && !env.WAYLAND_DISPLAY))) env.BROWSER = 'false';
            const invocation = await resolveInvocation(this.plugin.executable, this.method.args, env);
            if (!invocation) throw new Error('Executable missing');
            const pty = await import('@lydell/node-pty');
            // Some providers open their full CLI for sign-in. Keep the working directory away from the draft and files.
            terminal.directory = await mkdtemp(join(tmpdir(), 'ptbk-sign-in-'));
            if (this.active !== terminal || this.context.signal?.aborted) throw new Error('Terminal cancelled');
            // On Windows a cmd shim needs the pre-escaped command line as one string, not another round of quoting.
            const args = invocation.windowsVerbatimArguments ? invocation.args.join(' ') : invocation.args;
            const child = pty.spawn(invocation.file, args, { name: 'xterm-256color', cwd: terminal.directory, cols, rows, env });
            terminal.pty = child;
            child.onData((data) => {
                if (this.active !== terminal) return;
                terminal.offset += data.length;
                terminal.output = (terminal.output + data).slice(-OUTPUT_LIMIT);
            });
            child.onExit(() => { terminal.done = true; });
            this.timer = setInterval(() => {
                const time = Date.now();
                if (time >= terminal.expires || time - terminal.lastContact >= IDLE_MS) this.close();
            }, 1000).unref();
        } catch {
            if (this.active === terminal) this.close();
            else if (terminal.directory) await rm(terminal.directory, { recursive: true, force: true }).catch(() => undefined);
            throw new PtbkError('The native sign-in terminal could not start. Sign in on the engine host and check again.', { kind: 'setup' });
        }
    }
}

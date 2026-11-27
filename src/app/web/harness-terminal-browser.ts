import type { HarnessSignInOptions } from '../../onboarding/session.js';
import type { OnboardingState } from '../../onboarding/contract.js';
import type { TerminalFrame } from '../../onboarding/terminal.js';

/** The locally shipped xterm browser build, loaded by the terminal document. */
declare const Terminal: typeof import('@xterm/xterm').Terminal;

const status = document.querySelector('[role="status"]')!;
const open = document.querySelector<HTMLButtonElement>('#open')!;
const container = document.getElementById('terminal')!;

/** Installs xterm's fixed generated styles under the engine's per-document CSP nonce. */
function openTerminal(terminal: InstanceType<typeof Terminal>): void {
    const nonce = document.querySelector<HTMLScriptElement>('script[data-terminal]')!.nonce;
    const createElement = document.createElement;
    document.createElement = ((tag: string, options?: ElementCreationOptions) => {
        const element = createElement.call(document, tag, options);
        if (element instanceof HTMLStyleElement) element.nonce = nonce;
        return element;
    }) as Document['createElement'];
    try { terminal.open(container); } finally { document.createElement = createElement; }
}

/** Sends a transient sign-in command to the same authenticated engine. */
function post(body: object, keepalive = false): Promise<Response> {
    return fetch(location.pathname, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive,
    });
}

/** Attaches one passkey session to the engine PTY for this exact prompt. */
async function connect(promptId: string): Promise<void> {
    const id = crypto.randomUUID();
    const sendCommand = (body: object, keepalive = false) => post({ id, promptId, ...body }, keepalive);
    const call = async <T>(body: object): Promise<T> => {
        const result = await sendCommand(body);
        if (!result.ok) throw new Error(result.status === 409 ? 'The terminal is closed or another client is using it.' : 'The terminal could not continue. You can sign in directly on the engine host.');
        return await result.json() as T;
    };
    const terminal = new Terminal({
        cols: Math.min(100, Math.max(30, Math.floor(window.innerWidth / 9) - 3)), rows: 20, scrollback: 100,
        linkHandler: {
            activate: (_event, uri) => {
                if (URL.canParse(uri) && new URL(uri).protocol === 'https:') window.open(uri, '_blank', 'noopener,noreferrer');
            },
        },
    });
    const close = () => { void sendCommand({ action: 'close' }, true).catch(() => undefined); };
    await call({ action: 'start', cols: terminal.cols, rows: terminal.rows });
    window.addEventListener('pagehide', close, { once: true });
    let send = Promise.resolve();
    let failure: unknown;
    const input = terminal.onData((data) => {
        for (const part of data.match(/[\s\S]{1,4096}/g) ?? []) {
            send = send.then(async () => { if (!failure) await call({ action: 'write', data: part }); }).catch((error: unknown) => { failure = error; });
        }
    });
    try {
        openTerminal(terminal);
        terminal.focus();
        let offset = 0;
        for (;;) {
            if (failure) throw failure;
            const frame = await call<TerminalFrame>({ action: 'read', offset });
            if (frame.output) terminal.write(frame.output);
            offset = frame.offset;
            if (frame.done) break;
            await new Promise((resolve) => window.setTimeout(resolve, 175));
        }
        status.textContent = 'Checking sign-in…';
        const response = await fetch('/api/v1/onboarding/answer', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ promptId, action: 'answer', answer: { kind: 'confirm', confirmed: true } }),
        });
        const state = response.ok ? await response.json() as OnboardingState : undefined;
        if (state?.prompt?.id === promptId) status.textContent = state.prompt.error ?? 'Check sign-in again from setup.';
        else if (response.ok || response.status === 409) location.assign('/');
        else status.textContent = 'Return to setup to check sign-in.';
    } finally {
        input.dispose();
        await send;
        window.removeEventListener('pagehide', close);
        await sendCommand({ action: 'close' }).catch(() => undefined);
        terminal.dispose();
    }
}

/** Loads the active prompt before enabling either way to sign in. */
async function setup(): Promise<void> {
    const response = await fetch(location.pathname + '/options');
    if (!response.ok) throw new Error('The sign-in step has ended. Return to setup.');
    const options = await response.json() as HarnessSignInOptions;
    document.querySelector('h1')!.textContent = options.harness + ' sign-in';
    document.getElementById('instructions')!.textContent = options.instructions;
    open.disabled = false;
    open.onclick = () => {
        open.disabled = true;
        status.textContent = '';
        void connect(options.promptId).catch((error: unknown) => { status.textContent = (error as Error).message; }).finally(() => {
            open.disabled = false;
        });
    };
}

void setup().catch((error: unknown) => { status.textContent = (error as Error).message; });

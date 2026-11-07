import type { OnboardingState } from '../../onboarding/contract.js';
import type { TerminalFrame } from '../../onboarding/terminal.js';

/** The locally shipped xterm browser build, loaded by the terminal document. */
declare const Terminal: typeof import('@xterm/xterm').Terminal;

const status = document.querySelector('[role="status"]')!;
const open = document.querySelector('button')!;
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

/** Attaches one passkey session to the engine PTY without collecting a separate credential field. */
async function connect(): Promise<void> {
    const id = crypto.randomUUID();
    const post = (body: object, keepalive = false) => fetch(location.pathname, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, ...body }), keepalive,
    });
    const call = async <T>(body: object): Promise<T> => {
        const result = await post(body);
        if (!result.ok) throw new Error(result.status === 409 ? 'The terminal is closed or another client is using it.' : 'The terminal could not continue. You can sign in directly on the engine host.');
        return await result.json() as T;
    };
    const state = await (await fetch('/api/v1/onboarding')).json() as OnboardingState;
    const promptId = state.prompt?.id;
    const terminal = new Terminal({ cols: Math.min(100, Math.max(30, Math.floor(window.innerWidth / 9) - 3)), rows: 20, scrollback: 100 });
    const close = () => { void post({ action: 'close' }, true).catch(() => undefined); };
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
        if (promptId) await fetch('/api/v1/onboarding/answer', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ promptId, action: 'answer', answer: { kind: 'confirm', confirmed: true } }),
        });
        status.textContent = 'The native terminal has ended. Return to setup to see whether sign-in succeeded.';
    } finally {
        input.dispose();
        await send;
        window.removeEventListener('pagehide', close);
        await post({ action: 'close' }).catch(() => undefined);
        terminal.dispose();
    }
}

open.onclick = () => {
    open.disabled = true;
    status.textContent = '';
    void connect().catch((error: unknown) => { status.textContent = (error as Error).message; }).finally(() => { open.disabled = false; });
};

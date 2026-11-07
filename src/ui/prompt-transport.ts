import { createConnection } from 'node:net';
import type { ComposedSegment } from './composer.js';
import { stripAnsi } from './ansi.js';

/** A presentation-only prompt; choice values stay in the initializer process. @private prompt presentation */
export type PresentationPrompt = {
    readonly kind: 'one' | 'many' | 'text' | 'secret' | 'toggles' | 'harness-login' | 'complete';
    readonly frame: { readonly title: string; readonly step?: string; readonly summary?: readonly string[]; readonly guide?: { readonly name: string; readonly note?: string } };
    readonly question: string;
    readonly choices?: readonly { readonly label: string; readonly description?: string; readonly disabled?: boolean; readonly value: number | string }[];
    readonly initial?: unknown;
    readonly placeholder?: string;
    readonly hint?: string;
    readonly required?: boolean;
    readonly singleLine?: boolean;
    readonly attachments?: boolean;
    readonly error?: string;
    readonly login?: { readonly url: string; readonly userCode: string; readonly terminalFallback?: boolean };
    readonly completion?: { readonly root?: string; readonly ready: boolean; readonly running: boolean };
};

/** An answer has no domain authority; the original prompt validates it. @private prompt presentation */
export type PresentationAnswer = { readonly action: 'answer' | 'back' | 'cancel' | 'terminal'; readonly value?: unknown };

/** An optional private presentation endpoint, used only by an attended desktop CLI child. @private prompt presentation */
export type PromptPresentation = (prompt: PresentationPrompt, signal?: AbortSignal) => Promise<PresentationAnswer>;

/** Connects to a token-authenticated loopback endpoint; never enables GUI input in an ordinary CLI. @private prompt presentation */
export function promptPresentation(env: NodeJS.ProcessEnv): PromptPresentation | undefined {
    if (!env.PTBK_PROMPT_PORT && !env.PTBK_PROMPT_TOKEN) return undefined;
    const port = Number(env.PTBK_PROMPT_PORT);
    const token = env.PTBK_PROMPT_TOKEN;
    if (!Number.isInteger(port) || port < 1 || port > 65535 || !token || token.length < 32) throw new Error('Invalid private prompt presentation endpoint.');
    return async (prompt, signal) => await new Promise<PresentationAnswer>((resolve, reject) => {
        const socket = createConnection({ host: '127.0.0.1', port });
        let buffer = '';
        let settled = false;
        const finish = (error?: Error, answer?: PresentationAnswer): void => {
            if (settled) return;
            settled = true;
            signal?.removeEventListener('abort', cancel);
            socket.destroy();
            if (error) reject(error);
            else resolve(answer!);
        };
        const cancel = (): void => finish(undefined, { action: 'cancel' });
        if (signal?.aborted) return cancel();
        signal?.addEventListener('abort', cancel, { once: true });
        socket.setEncoding('utf8');
        const presented: PresentationPrompt = {
            ...prompt,
            frame: { ...prompt.frame, title: stripAnsi(prompt.frame.title), step: prompt.frame.step ? stripAnsi(prompt.frame.step) : undefined, summary: prompt.frame.summary?.map(stripAnsi) },
            question: stripAnsi(prompt.question),
            choices: prompt.choices?.map((choice) => ({ ...choice, label: stripAnsi(choice.label), description: choice.description ? stripAnsi(choice.description) : undefined })),
            hint: prompt.hint ? stripAnsi(prompt.hint) : undefined,
            error: prompt.error ? stripAnsi(prompt.error) : undefined,
        };
        socket.once('connect', () => socket.write(`${JSON.stringify({ token, prompt: presented })}\n`));
        socket.on('data', (chunk: string) => {
            buffer += chunk;
            if (Buffer.byteLength(buffer) > 4 * 1024 * 1024) return finish(new Error('Prompt answer is too large.'));
            const end = buffer.indexOf('\n');
            if (end < 0) return;
            try {
                const answer = JSON.parse(buffer.slice(0, end)) as PresentationAnswer;
                if (!answer || !['answer', 'back', 'cancel', 'terminal'].includes(answer.action)) throw new Error('Invalid prompt answer.');
                finish(undefined, answer);
            } catch (error) { finish(error instanceof Error ? error : new Error(String(error))); }
        });
        socket.once('error', (error) => finish(error));
        socket.once('close', () => finish(new Error('The desktop prompt disconnected; initialization was not submitted.')));
    });
}

/** Accepts the same complete text/attachment payload as the terminal composer. @private prompt presentation */
export function presentationSegments(value: unknown, attachments: boolean): readonly ComposedSegment[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const segments: ComposedSegment[] = [];
    for (const item of value) {
        if (!item || typeof item !== 'object') return undefined;
        if (item.type === 'text' && typeof item.text === 'string') segments.push({ type: 'text', text: item.text, ...(item.pasted === true ? { pasted: true } : {}) });
        else if (attachments && item.type === 'attachment' && ['image', 'file'].includes(item.kind) && typeof item.path === 'string' && typeof item.name === 'string') segments.push({ type: 'attachment', kind: item.kind, path: item.path, name: item.name });
        else return undefined;
    }
    return segments;
}

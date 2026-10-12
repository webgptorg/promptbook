import type { Readable, Writable } from 'node:stream';

/** A key shared by the terminal composer and deterministic editing fixtures. @private */
export interface ComposerKey { name?: string; ctrl?: boolean; meta?: boolean; shift?: boolean; }
/** Editable draft and caret, independent of rendering and background output. @private */
export interface ComposerState { text: string; cursor: number; }
/** Wrapped cells retain source positions for keyboard and pointer caret movement. */
interface ComposerRow { text: string; start: number; end: number; }
/** Reusable field settings; the host owns authorization and submission validation. @private */
export interface TextPromptOptions {
    input?: Readable; output?: Writable; signal?: AbortSignal; initial?: string;
    validate?: (value: string) => string | undefined; onCancel?: () => void;
    /** Stop owned work on genuine Ctrl+C, while pasted control characters remain ordinary input. */
    onInterrupt?: () => void;
    heading?: string;
}

/** Remove control sequences from labels, activity and inserted text. */
function safeText(text: string): string { return text.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ''); }

/** Wrap without discarding draft content, retaining source coordinates for the caret. */
function wrapDraft(text: string, width: number): ComposerRow[] {
    const rows: ComposerRow[] = [];
    let start = 0; let line = '';
    for (let index = 0; index < text.length;) {
        const glyph = String.fromCodePoint(text.codePointAt(index)!);
        if (glyph === '\n') { rows.push({ text: line, start, end: index }); index++; start = index; line = ''; continue; }
        if ([...line].length >= width) { rows.push({ text: line, start, end: index }); start = index; line = ''; }
        line += glyph; index += glyph.length;
    }
    rows.push({ text: line, start, end: text.length });
    return rows;
}

/** Unicode-aware multiline editing with explicit submission and safe literal paste.
 * @private Shared input model for setup, planning, task authoring and runtime answers.
 */
export class TextComposer {
    private draft: string;
    private caret: number;
    constructor(initial = '') { this.draft = safeText(initial.replace(/\r\n?/g, '\n')); this.caret = this.draft.length; }
    /** Expose a copy so rendering cannot modify an in-progress draft. */
    state(): ComposerState { return { text: this.draft, cursor: this.caret }; }
    /** Insert pasted newlines as text; paste never submits or triggers runtime shortcuts. */
    insert(text: string): void { const value = safeText(text.replace(/\r\n?/g, '\n')); this.draft = this.draft.slice(0, this.caret) + value + this.draft.slice(this.caret); this.caret += value.length; }
    /** Place the caret on a displayed wrapped row after a supported pointer press. */
    point(row: number, column: number, width: number): void { const line = wrapDraft(this.draft, width)[row]; if (line) this.caret = line.start + [...line.text].slice(0, Math.max(0, column)).join('').length; }
    /** Apply common keyboard editing; submission is deliberately separate from Enter. */
    key(key: ComposerKey, width = 80): 'submit' | 'cancel' | undefined {
        if (key.ctrl && key.name === 's') return 'submit';
        if (key.name === 'escape' || key.ctrl && key.name === 'c') return 'cancel';
        const previous = this.caret - (this.caret > 1 && /[\uDC00-\uDFFF]/.test(this.draft[this.caret - 1]!) ? 2 : 1);
        const next = this.caret + (this.draft.codePointAt(this.caret)! > 0xffff ? 2 : 1);
        if (key.name === 'left') this.caret = Math.max(0, previous);
        else if (key.name === 'right') this.caret = Math.min(this.draft.length, next);
        else if (key.name === 'backspace' && this.caret) { this.draft = this.draft.slice(0, previous) + this.draft.slice(this.caret); this.caret = previous; }
        else if (key.name === 'delete') this.draft = this.draft.slice(0, this.caret) + this.draft.slice(next);
        else if (key.name === 'return' || key.name === 'enter') this.insert('\n');
        else if (key.name === 'home' || key.ctrl && key.name === 'a') this.caret = this.caret ? this.draft.lastIndexOf('\n', this.caret - 1) + 1 : 0;
        else if (key.name === 'end' || key.ctrl && key.name === 'e') { const end = this.draft.indexOf('\n', this.caret); this.caret = end < 0 ? this.draft.length : end; }
        else if (key.ctrl && key.name === 'u') { const start = this.caret ? this.draft.lastIndexOf('\n', this.caret - 1) + 1 : 0; this.draft = this.draft.slice(0, start) + this.draft.slice(this.caret); this.caret = start; }
        else if (key.ctrl && key.name === 'k') { const end = this.draft.indexOf('\n', this.caret); this.draft = this.draft.slice(0, this.caret) + this.draft.slice(end < 0 ? this.draft.length : end); }
        else if (key.ctrl && key.name === 'w') { const start = this.draft.slice(0, this.caret).replace(/\s*\S+\s*$/, '').length; this.draft = this.draft.slice(0, start) + this.draft.slice(this.caret); this.caret = start; }
        else if (key.name === 'up' || key.name === 'down') {
            const rows = wrapDraft(this.draft, width);
            const row = rows.findIndex((line, index) => this.caret >= line.start && this.caret <= line.end && (this.caret < line.end || index === rows.length - 1 || this.draft[line.end] === '\n'));
            const target = Math.max(0, Math.min(rows.length - 1, row + (key.name === 'up' ? -1 : 1)));
            this.point(target, [...this.draft.slice(rows[row]?.start ?? 0, this.caret)].length, width);
        }
        return undefined;
    }
}

/** Compose a bounded multiline field with paste, pointer and resize support, isolating logs.
 * @private Shared terminal input for every interactive workflow.
 */
export async function promptText(label: string, options: TextPromptOptions = {}): Promise<string> {
    const input = (options.input ?? process.stdin) as NodeJS.ReadStream;
    const output = (options.output ?? process.stdout) as NodeJS.WriteStream;
    if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') throw new Error('Text entry requires an interactive terminal; supply the decision through flags or project configuration.');
    if (options.signal?.aborted) throw new DOMException('Text entry cancelled', 'AbortError');
    const composer = new TextComposer(options.initial);
    const originalRaw = input.isRaw;
    const originalWrite = output.write;
    const write = originalWrite.bind(output);
    const activity: string[] = [];
    let error = ''; let carry = ''; let paste = false; let pasted = ''; let offset = 0; let fieldRow = 1;
    let escapeTimer: ReturnType<typeof setTimeout> | undefined;
    let showingPrompt = false; let promptScroll = 0;
    let complete: (value: string) => void; let reject: (error: Error) => void;
    const result = new Promise<string>((resolve, fail) => { complete = resolve; reject = fail; });
    /** Redraw one screen without changing draft or caret when dimensions change. */
    const render = () => {
        const width = Math.max(8, output.columns || 80); const height = Math.max(3, output.rows || 24);
        const inner = Math.max(1, width - 4); const state = composer.state(); const rows = wrapDraft(state.text, inner);
        const caretRow = Math.max(0, rows.findIndex((row, index) => state.cursor >= row.start && state.cursor <= row.end && (state.cursor < row.end || index === rows.length - 1 || state.text[row.end] === '\n')));
        const title = safeText(`${options.heading ? `${options.heading}\n` : ''}${label}`);
        const labels = wrapDraft(title, width).map(row => row.text);
        if (showingPrompt) {
            promptScroll = Math.max(0, Math.min(promptScroll, labels.length - Math.max(1, height - 2)));
            write(`\u001b[H\u001b[2J${['Full prompt · Ctrl+L return to draft'.slice(0, width), ...labels.slice(promptScroll, promptScroll + Math.max(1, height - 2)), '↑↓ scroll · Ctrl+L edit · Esc cancel'.slice(0, width)].join('\r\n')}`);
            return;
        }
        const labelHeight = Math.max(1, Math.min(labels.length, Math.floor(height / 3)));
        const shownLabels = labels.slice(0, labelHeight);
        if (labels.length > labelHeight) shownLabels[labelHeight - 1] = `${shownLabels[labelHeight - 1]!.slice(0, Math.max(0, width - 18))} … Ctrl+L prompt`;
        const available = Math.max(1, height - labelHeight - 4);
        offset = Math.max(0, Math.min(offset, caretRow));
        if (caretRow >= offset + available) offset = caretRow - available + 1;
        fieldRow = height <= 5 ? 1 : labelHeight + 1;
        const visible = rows.slice(offset, offset + available);
        const screen = height <= 5
            ? [shownLabels[0]!, `> ${visible[0]?.text || ''}`, '^S submit · Enter newline · Esc cancel'.slice(0, width), (error || activity.at(-1) || '').slice(0, width)]
            : [...shownLabels, `+${'-'.repeat(Math.max(1, width - 2))}+`, ...visible.map(row => `| ${row.text.padEnd(inner)} |`), `+${'-'.repeat(Math.max(1, width - 2))}+`, 'Ctrl+S submit · Enter newline · Esc cancel · Ctrl+L prompt'.slice(0, width), (error || activity.at(-1) || (offset ? 'Draft scrolls with the caret.' : '')).slice(0, width)];
        const column = [...state.text.slice(rows[caretRow]!.start, state.cursor)].length + 3;
        write(`\u001b[H\u001b[2J${screen.slice(0, height).join('\r\n')}\u001b[${fieldRow + caretRow - offset + 1};${column}H`);
    };
    /** Background writes update a separate bounded detail line rather than overwriting input. */
    const isolate = ((chunk: string | Uint8Array, encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void): boolean => {
        const text = safeText(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
        activity.push(text.slice(-1000).replace(/\s+/g, ' ')); if (activity.length > 40) activity.shift(); render();
        const done = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback; if (done) queueMicrotask(() => done()); return true;
    }) as typeof output.write;
    const stderrWrite = process.stderr.write;
    /** Process an edit or literal printable text without invoking dashboard controls. */
    const edit = (key: ComposerKey, text?: string) => {
        if (key.ctrl && key.name === 'l') { showingPrompt = !showingPrompt; return; }
        if (showingPrompt && ['up', 'down', 'pageup', 'pagedown'].includes(key.name || '')) { promptScroll += (key.name === 'up' || key.name === 'pageup' ? -1 : 1) * (key.name?.startsWith('page') ? Math.max(1, (output.rows || 24) - 2) : 1); return; }
        if (showingPrompt && text) showingPrompt = false;
        const action = composer.key(key, Math.max(1, (output.columns || 80) - 4));
        if (action === 'cancel') {
            if (key.ctrl && key.name === 'c') options.onInterrupt?.();
            options.onCancel?.(); reject(new DOMException('Text entry cancelled; no decision was applied.', 'AbortError'));
        }
        else if (action === 'submit') { error = options.validate?.(composer.state().text) || ''; if (!error) complete(composer.state().text); }
        else if (text) composer.insert(text);
    };
    /** Parse bracketed paste across chunks before interpreting any keys or mouse events. */
    const data = (chunk: Buffer | string) => {
        if (escapeTimer) { clearTimeout(escapeTimer); escapeTimer = undefined; }
        carry += chunk.toString();
        while (carry) {
            if (paste) {
                const end = carry.indexOf('\u001b[201~');
                if (end < 0) { const keep = Math.min(5, carry.length); pasted += carry.slice(0, -keep); carry = carry.slice(-keep); break; }
                pasted += carry.slice(0, end); composer.insert(pasted); pasted = ''; carry = carry.slice(end + 6); paste = false; continue;
            }
            if (carry.startsWith('\u001b[200~')) { carry = carry.slice(6); paste = true; continue; }
            if (carry === '\u001b') { escapeTimer = setTimeout(() => { carry = ''; edit({ name: 'escape' }); }, 25); break; }
            if ('\u001b[200~'.startsWith(carry) && carry.length > 1) break;
            const mouse = /^\u001b\[<(\d+);(\d+);(\d+)([Mm])/.exec(carry);
            if (mouse) { if (mouse[4] === 'M' && Number(mouse[1]) === 0) composer.point(Number(mouse[3]) - fieldRow - 1 + offset, Number(mouse[2]) - 3, Math.max(1, (output.columns || 80) - 4)); carry = carry.slice(mouse[0].length); continue; }
            const sequence = /^\u001b\[(?:([ABCDHF])|([1345678])~)/.exec(carry);
            if (sequence) { const names: Record<string, string> = { A: 'up', B: 'down', C: 'right', D: 'left', H: 'home', F: 'end', '1': 'home', '3': 'delete', '4': 'end', '5': 'pageup', '6': 'pagedown', '7': 'home', '8': 'end' }; edit({ name: names[sequence[1] || sequence[2]!] }); carry = carry.slice(sequence[0].length); continue; }
            if (/^\u001b\[/.test(carry) && !/[A-Za-z~]$/.test(carry)) break;
            const glyph = String.fromCodePoint(carry.codePointAt(0)!); carry = carry.slice(glyph.length);
            if (glyph === '\u0013') edit({ name: 's', ctrl: true });
            else if (glyph === '\u0003') edit({ name: 'c', ctrl: true });
            else if (glyph === '\u001b') edit({ name: 'escape' });
            else if (glyph === '\u007f' || glyph === '\b') edit({ name: 'backspace' });
            else if (glyph === '\r' || glyph === '\n') edit({ name: 'return' });
            else if (glyph === '\u0001') edit({ name: 'a', ctrl: true });
            else if (glyph === '\u0005') edit({ name: 'e', ctrl: true });
            else if (glyph === '\u000c') edit({ name: 'l', ctrl: true });
            else if (glyph === '\u0015') edit({ name: 'u', ctrl: true });
            else if (glyph === '\u000b') edit({ name: 'k', ctrl: true });
            else if (glyph === '\u0017') edit({ name: 'w', ctrl: true });
            else if (glyph >= ' ' || glyph === '\t') edit({}, glyph === '\t' ? '    ' : glyph);
        }
        render();
    };
    const cancel = () => reject(new DOMException('Text entry cancelled', 'AbortError'));
    input.setRawMode(true); input.resume();
    write('\u001b[?1049h\u001b[?2004h\u001b[?1000h\u001b[?1006h');
    output.write = isolate; if (output === process.stdout) process.stderr.write = isolate;
    input.on('data', data); input.on('end', cancel); output.on('resize', render); options.signal?.addEventListener('abort', cancel, { once: true });
    render();
    try { return await result; }
    finally {
        if (escapeTimer) clearTimeout(escapeTimer);
        input.removeListener('data', data); input.removeListener('end', cancel); output.removeListener('resize', render); options.signal?.removeEventListener('abort', cancel);
        output.write = originalWrite; if (output === process.stdout) process.stderr.write = stderrWrite;
        write('\u001b[?2004l\u001b[?1000l\u001b[?1006l\u001b[?1049l'); input.setRawMode(Boolean(originalRaw));
        if (!originalRaw) input.pause();
    }
}

import type { Readable, Writable } from 'node:stream';

/** A labeled option or catalog navigation action, separate from its stored value. @private */
export interface Choice {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
    action?: boolean;
}

/** Shared terminal surfaces and optional catalog navigation for a choice prompt. @private */
export interface ChoicePromptOptions {
    input?: Readable;
    output?: Writable;
    signal?: AbortSignal;
    heading?: string;
    onInterrupt?: () => void;
    onAction?: (value: string, selected: readonly string[]) => readonly Choice[] | Promise<readonly Choice[]>;
}

/** Single-choice defaults focus an option without accepting it. @private */
export interface SingleChoicePromptOptions extends ChoicePromptOptions { initial?: string; }

/** Checkbox defaults are retained while navigating between catalog views. @private */
export interface MultipleChoicePromptOptions extends ChoicePromptOptions { initial?: readonly string[]; }

/** Strip terminal commands and control characters from externally supplied labels and activity. */
function plain(text: string): string {
    return text.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Keep accents, emoji sequences and flags together when fitting terminal cells. */
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** Approximate standard terminal cell widths: combining marks occupy zero cells, wide glyphs two. */
function cellWidth(glyph: string): number {
    if (/^[\p{Mark}\u200d\ufe0e\ufe0f]+$/u.test(glyph)) return 0;
    if (/[\p{Emoji_Presentation}\ufe0f\u20e3]/u.test(glyph)) return 2;
    const point = glyph.codePointAt(0)!;
    const wide = point >= 0x1100 && (
        point <= 0x115f || point === 0x2329 || point === 0x232a ||
        point >= 0x2e80 && point <= 0x3247 && point !== 0x303f ||
        point >= 0x3250 && point <= 0xa4c6 || point >= 0xa960 && point <= 0xa97c ||
        point >= 0xac00 && point <= 0xd7a3 || point >= 0xf900 && point <= 0xfaff ||
        point >= 0xfe10 && point <= 0xfe19 || point >= 0xfe30 && point <= 0xfe6b ||
        point >= 0xff01 && point <= 0xff60 || point >= 0xffe0 && point <= 0xffe6 ||
        point >= 0x1b000 && point <= 0x1b2ff || point >= 0x1f200 && point <= 0x1f251 ||
        point >= 0x20000 && point <= 0x3fffd
    );
    return wide ? 2 : 1;
}

/** Clip to visible cells without splitting accents or multi-code-point emoji. */
function clip(text: string, width: number): string {
    const glyphs = [...graphemes.segment(text)].map(part => part.segment);
    if (glyphs.reduce((sum, glyph) => sum + cellWidth(glyph), 0) <= width) return text;
    let shown = ''; let used = 0;
    for (const glyph of glyphs) {
        if (used + cellWidth(glyph) > width - 1) break;
        shown += glyph; used += cellWidth(glyph);
    }
    return shown + '…';
}

/** Wrap complete labels and descriptions by terminal cells for the detail view. */
function wrap(text: string, width: number): string[] {
    const rows: string[] = [];
    let line = ''; let used = 0;
    for (const { segment } of graphemes.segment(plain(text))) {
        const cells = cellWidth(segment);
        if (used + cells > width && line) { rows.push(line); line = ''; used = 0; }
        if (cells > width) { rows.push(clip(segment, width)); continue; }
        line += segment; used += cells;
    }
    if (line || !rows.length) rows.push(line);
    return rows;
}

/** Reject malformed catalogs before opening a terminal or replacing a usable catalog. */
function checkChoices(choices: readonly Choice[], options: ChoicePromptOptions): void {
    const values = new Set<string>();
    if (!choices.length || !choices.some(choice => !choice.disabled)) throw new Error('A choice prompt requires at least one available option.');
    for (const choice of choices) {
        if (!choice.value || !plain(choice.label) || values.has(choice.value)) throw new Error('Choice values must be nonempty and unique, with readable labels.');
        if (choice.action && !options.onAction) throw new Error('Choice navigation actions require an onAction handler.');
        values.add(choice.value);
    }
}

/** Pick one predefined answer using arrows and Enter, without typing its value.
 * @private Shared terminal control for setup, confirmations and runtime answers.
 */
export async function promptChoice(label: string, choices: readonly Choice[], options: SingleChoicePromptOptions = {}): Promise<string> {
    return (await pick(label, choices, false, options, options.initial ? [options.initial] : []))[0]!;
}

/** Pick any number of predefined answers using Space and Enter.
 * @private Shared checkbox control for harness selection and individual updates.
 */
export async function promptChoices(label: string, choices: readonly Choice[], options: MultipleChoicePromptOptions = {}): Promise<string[]> {
    return pick(label, choices, true, options, options.initial ?? []);
}

/** Keep keyboard focus, checkbox state and catalog navigation independent of terminal output. */
async function pick(label: string, suppliedChoices: readonly Choice[], multiple: boolean, options: ChoicePromptOptions, initial: readonly string[]): Promise<string[]> {
    checkChoices(suppliedChoices, options);
    const input = (options.input ?? process.stdin) as NodeJS.ReadStream;
    const output = (options.output ?? process.stdout) as NodeJS.WriteStream;
    if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') throw new Error('Choice selection requires an interactive terminal; supply the decision through flags or project configuration.');
    if (options.signal?.aborted) throw new DOMException('Choice selection cancelled', 'AbortError');
    let choices = [...suppliedChoices];
    const known = new Map(choices.filter(choice => !choice.action).map(choice => [choice.value, choice]));
    for (const value of initial) {
        if (!known.has(value) || known.get(value)!.disabled) throw new Error(`Unavailable initial choice: ${value}`);
    }
    const selected = new Set(initial);
    let focus = Math.max(0, choices.findIndex(choice => choice.value === initial[0] && !choice.disabled));
    if (choices[focus]!.disabled) focus = choices.findIndex(choice => !choice.disabled);
    let offset = 0; let visibleCount = 1; let firstRow = 1;
    let activity = ''; let error = ''; let busy = false; let closed = false;
    let details = false; let detailScroll = 0; let carry = ''; let paste = false;
    let escapeTimer: ReturnType<typeof setTimeout> | undefined;
    const originalRaw = input.isRaw;
    const originalWrite = output.write;
    const stderrWrite = process.stderr.write;
    const write = originalWrite.bind(output);
    let complete!: (value: string[]) => void;
    let reject!: (error: Error) => void;
    const result = new Promise<string[]>((resolve, fail) => { complete = resolve; reject = fail; });

    /** Return selected values in catalog order, including choices outside the current view. */
    const selection = (): string[] => [...known.keys()].filter(value => selected.has(value));

    /** Redraw a bounded viewport without changing focus or the selected set. */
    const render = (): void => {
        if (closed) return;
        const width = Math.max(1, (output.columns || 80) - 1);
        const height = Math.max(3, output.rows || 24);
        if (details) {
            const choice = choices[focus]!;
            const lines = [...(options.heading ? wrap(options.heading, width) : []), ...wrap(label, width), '', ...wrap(choice.label, width),
                ...(initial.includes(choice.value) && !multiple ? wrap('Default option; Enter confirms it.', width) : []),
                ...(multiple && !choice.action ? wrap(selected.has(choice.value) ? 'Selected; Space unchecks it.' : 'Unchecked; Space selects it.', width) : []),
                ...(choice.description ? wrap(choice.description, width) : [])];
            const count = Math.max(1, height - 2);
            detailScroll = Math.max(0, Math.min(detailScroll, Math.max(0, lines.length - count)));
            write(`\u001b[H\u001b[2J${[clip('Choice details · Ctrl+L return', width), ...lines.slice(detailScroll, detailScroll + count), clip('↑↓ scroll · Ctrl+L return · Esc cancel', width)].join('\r\n')}`);
            return;
        }
        const titles = [...(options.heading ? [plain(options.heading)] : []), plain(label)];
        const titleCount = Math.min(titles.length, Math.max(1, Math.floor(height / 4)));
        const shownTitles = titles.slice(-titleCount).map(title => clip(title, width));
        const footerCount = height >= 5 ? 2 : 1;
        visibleCount = Math.max(1, height - shownTitles.length - footerCount);
        offset = Math.max(0, Math.min(offset, focus, Math.max(0, choices.length - visibleCount)));
        if (focus >= offset + visibleCount) offset = focus - visibleCount + 1;
        firstRow = shownTitles.length + 1;
        const rows = choices.slice(offset, offset + visibleCount).map((choice, index) => {
            const prefix = choice.action ? '  ' : multiple ? `[${selected.has(choice.value) ? 'x' : ' '}] ` : '';
            const suffix = choice.disabled ? ' (unavailable)' : !multiple && initial.includes(choice.value) ? ' (default)' : '';
            return clip(`${offset + index === focus ? '>' : ' '} ${prefix}${plain(choice.label)}${suffix}`, width);
        });
        const hint = multiple ? '↑↓ move · Space toggle · Enter confirm · Esc cancel' : '↑↓ move · Enter confirm · Esc cancel';
        const compactHint = multiple ? '↑↓ Space Enter Esc' : '↑↓ Enter Esc';
        const status = error || (busy ? 'Opening options…' : activity || `${multiple ? `${selected.size} selected · ` : ''}${focus + 1}/${choices.length} · PgUp/PgDn browse · Ctrl+L details`);
        const screen = [...shownTitles, ...rows, clip(width < 40 ? compactHint : hint, width), ...(footerCount > 1 ? [clip(status, width)] : [])];
        write(`\u001b[H\u001b[2J${screen.join('\r\n')}`);
    };

    /** Cancel without applying a focused default or unconfirmed checkbox edits. */
    const cancel = (): void => {
        if (closed) return;
        closed = true;
        reject(new DOMException('Choice selection cancelled; no decision was applied.', 'AbortError'));
    };

    /** Move through enabled options, keeping disabled entries visible but unfocusable. */
    const move = (target: number, direction: number): void => {
        target = Math.max(0, Math.min(choices.length - 1, target));
        while (choices[target]?.disabled) {
            target += direction;
            if (target < 0 || target >= choices.length) return;
        }
        focus = target;
        error = '';
    };

    /** Apply a navigation action without submitting and retain selections from other views. */
    const open = async (choice: Choice): Promise<void> => {
        busy = true; error = ''; render();
        try {
            const next = await options.onAction!(choice.value, selection());
            if (closed) return;
            checkChoices(next, options);
            choices = [...next];
            for (const entry of choices) if (!entry.action) known.set(entry.value, entry);
            focus = choices.findIndex(entry => entry.value === choice.value && !entry.disabled);
            if (focus < 0) focus = choices.findIndex(entry => !entry.disabled);
            offset = 0;
        } catch (failure) { if (!closed) error = plain(failure instanceof Error ? failure.message : String(failure)); }
        finally { busy = false; render(); }
    };

    /** Confirm an answer or open a highlighted browsing action. */
    const confirm = (): void => {
        const choice = choices[focus]!;
        if (choice.action) { void open(choice); return; }
        closed = true;
        complete(multiple ? selection() : [choice.value]);
    };

    /** Route focused input solely to the picker, never to runtime dashboard shortcuts. */
    const key = (name: string): void => {
        if (closed) return;
        if (name === 'cancel') {
            try { options.onInterrupt?.(); }
            catch (failure) { closed = true; reject(failure instanceof Error ? failure : new Error(String(failure))); return; }
            cancel(); return;
        }
        if (name === 'escape') { cancel(); return; }
        if (busy) return;
        if (name === 'details') { details = !details; detailScroll = 0; return; }
        if (details) {
            if (['up', 'down', 'pageup', 'pagedown'].includes(name)) detailScroll += (name === 'up' || name === 'pageup' ? -1 : 1) * (name.startsWith('page') ? Math.max(1, (output.rows || 24) - 2) : 1);
            return;
        }
        if (name === 'up') move(focus - 1, -1);
        else if (name === 'down' || name === 'tab') move(focus + 1, 1);
        else if (name === 'home') move(0, 1);
        else if (name === 'end') move(choices.length - 1, -1);
        else if (name === 'pageup') move(focus - visibleCount, -1);
        else if (name === 'pagedown') move(focus + visibleCount, 1);
        else if (name === 'enter') confirm();
        else if (name === 'space') {
            const choice = choices[focus]!;
            if (choice.action) { void open(choice); return; }
            if (multiple) { if (selected.has(choice.value)) selected.delete(choice.value); else selected.add(choice.value); }
        }
    };

    /** Ignore pasted data before decoding control sequences, including split sequences. */
    const data = (chunk: Buffer | string): void => {
        if (closed) return;
        if (escapeTimer) { clearTimeout(escapeTimer); escapeTimer = undefined; }
        carry += chunk.toString();
        while (carry && !closed) {
            if (paste) {
                const end = carry.indexOf('\u001b[201~');
                if (end < 0) { carry = carry.slice(-5); break; }
                carry = carry.slice(end + 6); paste = false; continue;
            }
            if (carry.startsWith('\u001b[200~')) { carry = carry.slice(6); paste = true; continue; }
            if (carry === '\u001b') { escapeTimer = setTimeout(() => { carry = ''; key('escape'); }, 25); break; }
            if ('\u001b[200~'.startsWith(carry) && carry.length > 1) break;
            const mouse = /^\u001b\[<(\d+);(\d+);(\d+)([Mm])/.exec(carry);
            if (mouse) {
                const row = Number(mouse[3]) - firstRow + offset;
                if (!busy && !details && mouse[4] === 'M' && Number(mouse[1]) === 0 && row >= offset && row < Math.min(choices.length, offset + visibleCount) && !choices[row]!.disabled) {
                    focus = row;
                    if (choices[row]!.action) void open(choices[row]!);
                    else if (multiple) key('space');
                }
                carry = carry.slice(mouse[0].length); continue;
            }
            const sequence = /^\u001b\[(?:([ABCDHF])|([145678])~)/.exec(carry);
            if (sequence) {
                const names: Record<string, string> = { A: 'up', B: 'down', C: 'right', D: 'left', H: 'home', F: 'end', '1': 'home', '4': 'end', '5': 'pageup', '6': 'pagedown', '7': 'home', '8': 'end' };
                key(names[sequence[1] || sequence[2]!]!); carry = carry.slice(sequence[0].length); continue;
            }
            // Consume unsupported complete CSI sequences rather than treating their content as keys.
            if (carry.startsWith('\u001b[')) {
                const csi = /^\u001b\[[0-?]*[ -/]*[@-~]/.exec(carry);
                if (!csi) break;
                carry = carry.slice(csi[0].length); continue;
            }
            if (carry.startsWith('\u001bO')) {
                if (carry.length < 3) break;
                const names: Record<string, string> = { A: 'up', B: 'down', H: 'home', F: 'end' };
                key(names[carry[2]!] || 'unknown'); carry = carry.slice(3); continue;
            }
            const glyph = String.fromCodePoint(carry.codePointAt(0)!); carry = carry.slice(glyph.length);
            if (glyph === '\u0003') key('cancel');
            else if (glyph === '\u001b') key('escape');
            else if (glyph === '\r' || glyph === '\n') key('enter');
            else if (glyph === ' ') key('space');
            else if (glyph === '\t') key('tab');
            else if (glyph === '\u000c') key('details');
        }
        render();
    };

    /** Background output occupies a bounded activity line without resetting the picker. */
    const isolate = ((chunk: string | Uint8Array, encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void): boolean => {
        activity = plain(typeof chunk === 'string' ? chunk.slice(-1000) : Buffer.from(chunk).toString('utf8').slice(-1000));
        render();
        const done = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
        if (done) queueMicrotask(() => done());
        return true;
    }) as typeof output.write;

    input.setRawMode(true); input.resume();
    write('\u001b[?1049h\u001b[?25l\u001b[?2004h\u001b[?1000h\u001b[?1006h');
    output.write = isolate; if (output === process.stdout) process.stderr.write = isolate;
    input.on('data', data); input.on('end', cancel); output.on('resize', render);
    options.signal?.addEventListener('abort', cancel, { once: true });
    try { render(); return await result; }
    finally {
        closed = true;
        if (escapeTimer) clearTimeout(escapeTimer);
        input.removeListener('data', data); input.removeListener('end', cancel); output.removeListener('resize', render);
        options.signal?.removeEventListener('abort', cancel);
        output.write = originalWrite; if (output === process.stdout) process.stderr.write = stderrWrite;
        write('\u001b[?2004l\u001b[?1000l\u001b[?1006l\u001b[?25h\u001b[?1049l');
        input.setRawMode(Boolean(originalRaw)); if (!originalRaw) input.pause();
    }
}

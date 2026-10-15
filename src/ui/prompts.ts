import { ENGINE_VERSION } from '../common/version.js';
import { fit, stringWidth, truncate, wrap } from './ansi.js';
import { TextEditor } from './composer.js';
import { KeyboardSession, type KeyEvent } from './keys.js';
import { InlineRenderer } from './screen.js';
import { symbols, type TerminalProfile } from './terminal.js';

/**
 * Returned when the user cancels a prompt or goes back.
 *
 * @private terminal prompts
 */
export const CANCELLED: unique symbol = Symbol('cancelled');

/**
 * Header context of a wizard step.
 *
 * @private terminal prompts
 */
export type WizardFrame = {
    /** Wizard title, e.g. `ptbk init`. */
    readonly title: string;
    /** Step label, e.g. `Step 2 of 7 · Destination`. */
    readonly step?: string;
    /** Already-answered summary lines. */
    readonly summary?: readonly string[];
};

/**
 * One selectable option.
 *
 * @private terminal prompts
 */
export type Choice<T> = {
    readonly value: T;
    readonly label: string;
    readonly description?: string;
    readonly disabled?: boolean;
    /** Featured options are shown before "More…" in large catalogs. */
    readonly featured?: boolean;
};

/**
 * Renders the shared wizard header.
 */
function header(terminal: TerminalProfile, frame: WizardFrame): string[] {
    const { style } = terminal;
    const width = terminal.columns();
    const title = `${style.bold(style.accent(frame.title))}`;
    const version = style.muted(`ptbk ${ENGINE_VERSION}`);
    const gap = Math.max(1, width - stringWidth(frame.title) - stringWidth(`ptbk ${ENGINE_VERSION}`) - 2);
    const lines = [`${title}${' '.repeat(gap)}${version}`];
    if (frame.step) lines.push(style.muted(frame.step));
    for (const line of frame.summary ?? []) lines.push(style.muted(`  ${terminal.unicode ? '✔' : 'OK'} ${line}`));
    lines.push('');
    return lines;
}

/**
 * Runs an interactive inline prompt until a value is produced.
 */
async function interact<T>(view: () => { lines: string[]; cursor?: { row: number; column: number } }, onKey: (event: KeyEvent) => T | undefined): Promise<T | typeof CANCELLED> {
    const renderer = new InlineRenderer();
    return await new Promise<T | typeof CANCELLED>((resolve) => {
        let finished = false;
        const redraw = (): void => {
            if (finished) return;
            const frame = view();
            renderer.render(frame.lines, frame.cursor);
        };
        const finish = (value: T | typeof CANCELLED): void => {
            if (finished) return;
            finished = true;
            keyboard.stop();
            process.stdout.off('resize', redraw);
            const frame = view();
            renderer.finish(frame.lines.slice(0, 1));
            resolve(value);
        };
        const keyboard = new KeyboardSession((event) => {
            if (event.type === 'key' && event.name === 'c' && event.ctrl) {
                finish(CANCELLED);
                return;
            }
            const result = onKey(event);
            if (result !== undefined) finish(result);
            else redraw();
        });
        keyboard.start();
        process.stdout.on('resize', redraw);
        redraw();
    });
}

/**
 * Legend line with applicable keys.
 */
function legend(terminal: TerminalProfile, parts: readonly string[]): string {
    return terminal.style.muted(`  ${parts.join(' · ')}`);
}

/**
 * Visible window of a long list around the focused index.
 */
function windowAround(length: number, focus: number, size: number): { start: number; end: number } {
    if (length <= size) return { start: 0, end: length };
    const start = Math.min(Math.max(0, focus - Math.floor(size / 2)), length - size);
    return { start, end: start + size };
}

/**
 * Single-choice picker: arrows move focus, Enter confirms; the default is initially focused.
 *
 * @private terminal prompts
 */
export async function selectOne<T>(terminal: TerminalProfile, options: { frame: WizardFrame; question: string; choices: readonly Choice<T>[]; defaultValue?: T; escapeLabel?: string }): Promise<T | typeof CANCELLED> {
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    let focus = Math.max(0, options.choices.findIndex((choice) => choice.value === options.defaultValue));
    const moveFocus = (delta: number): void => {
        for (let step = 0; step < options.choices.length; step++) {
            focus = (focus + delta + options.choices.length) % options.choices.length;
            if (!options.choices[focus]!.disabled) return;
        }
    };
    if (options.choices[focus]?.disabled) moveFocus(1);
    return await interact<T>(
        () => {
            const width = terminal.columns();
            const lines = [...header(terminal, options.frame), style.bold(`${style.accent('?')} ${options.question}`)];
            const available = Math.max(3, terminal.rows() - lines.length - 4);
            const { start, end } = windowAround(options.choices.length, focus, available);
            if (start > 0) lines.push(style.muted(`    ↑ ${start} more`));
            for (let index = start; index < end; index++) {
                const choice = options.choices[index]!;
                const focused = index === focus;
                const pointer = focused ? style.accent(marks.pointer) : ' ';
                const radio = focused ? style.accent(marks.radioOn) : style.muted(marks.radioOff);
                const isDefault = choice.value === options.defaultValue ? style.muted(' (default)') : '';
                const label = choice.disabled ? style.muted(choice.label) : focused ? style.bold(choice.label) : choice.label;
                const prefix = `  ${pointer} ${radio} `;
                const description = choice.description ? style.muted(`  ${choice.description}`) : '';
                lines.push(truncate(`${prefix}${label}${isDefault}${description}`, width - 1));
            }
            if (end < options.choices.length) lines.push(style.muted(`    ↓ ${options.choices.length - end} more`));
            lines.push('', legend(terminal, ['↑↓ move', 'Enter confirm', options.escapeLabel ?? 'Esc back']));
            return { lines };
        },
        (event) => {
            if (event.type !== 'key') return undefined;
            if (event.name === 'up') moveFocus(-1);
            else if (event.name === 'down' || (event.name === 'tab' && !event.shift)) moveFocus(1);
            else if (event.name === 'pageup') focus = Math.max(0, focus - 8);
            else if (event.name === 'pagedown') focus = Math.min(options.choices.length - 1, focus + 8);
            else if (event.name === 'home') focus = 0;
            else if (event.name === 'end') focus = options.choices.length - 1;
            else if (event.name === 'enter') return options.choices[focus]!.disabled ? undefined : options.choices[focus]!.value;
            else if (event.name === 'escape') return CANCELLED as never;
            return undefined;
        },
    ).then((value) => (value === (CANCELLED as unknown) ? CANCELLED : value));
}

/**
 * Yes/no confirmation as a single-choice picker.
 *
 * @private terminal prompts
 */
export async function confirm(terminal: TerminalProfile, options: { frame: WizardFrame; question: string; defaultYes: boolean; yesLabel?: string; noLabel?: string }): Promise<boolean | typeof CANCELLED> {
    return await selectOne<boolean>(terminal, {
        frame: options.frame,
        question: options.question,
        choices: [
            { value: true, label: options.yesLabel ?? 'Yes' },
            { value: false, label: options.noLabel ?? 'No' },
        ],
        defaultValue: options.defaultYes,
    });
}

/**
 * Checkbox picker with featured items and a selectable "More…" action; Space toggles, Enter confirms.
 *
 * @private terminal prompts
 */
export async function selectMany<T>(
    terminal: TerminalProfile,
    options: { frame: WizardFrame; question: string; choices: readonly Choice<T>[]; initial: readonly T[]; minimum?: number; noneLabel?: string },
): Promise<T[] | typeof CANCELLED> {
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const selected = new Set<T>(options.initial);
    const hasFeatured = options.choices.some((choice) => choice.featured) && options.choices.some((choice) => !choice.featured);
    let expanded = !hasFeatured || options.choices.some((choice) => !choice.featured && selected.has(choice.value));
    let focus = 0;
    let message = '';
    type Row = { kind: 'choice'; choice: Choice<T> } | { kind: 'more' } | { kind: 'fewer' };
    const rows = (): Row[] => {
        if (!hasFeatured) return options.choices.map((choice) => ({ kind: 'choice' as const, choice }));
        if (!expanded) return [...options.choices.filter((choice) => choice.featured).map((choice) => ({ kind: 'choice' as const, choice })), { kind: 'more' as const }];
        return [...options.choices.map((choice) => ({ kind: 'choice' as const, choice })), { kind: 'fewer' as const }];
    };
    const result = await interact<T[]>(
        () => {
            const width = terminal.columns();
            const list = rows();
            focus = Math.min(focus, list.length - 1);
            const lines = [...header(terminal, options.frame), style.bold(`${style.accent('?')} ${options.question}`)];
            const available = Math.max(3, terminal.rows() - lines.length - 5);
            const { start, end } = windowAround(list.length, focus, available);
            if (start > 0) lines.push(style.muted(`    ↑ ${start} more`));
            for (let index = start; index < end; index++) {
                const row = list[index]!;
                const focused = index === focus;
                const pointer = focused ? style.accent(marks.pointer) : ' ';
                if (row.kind !== 'choice') {
                    const hidden = options.choices.filter((choice) => !choice.featured).length;
                    const text = row.kind === 'more' ? `More… (${hidden} other integrations)` : 'Fewer (featured only)';
                    lines.push(`  ${pointer}   ${focused ? style.bold(style.accent(text)) : style.accent(text)}`);
                    continue;
                }
                const checked = selected.has(row.choice.value);
                const box = checked ? style.success(marks.checked) : style.muted(marks.unchecked);
                const label = focused ? style.bold(row.choice.label) : row.choice.label;
                lines.push(truncate(`  ${pointer} ${box} ${label}${row.choice.description ? style.muted(`  ${row.choice.description}`) : ''}`, width - 1));
            }
            if (end < list.length) lines.push(style.muted(`    ↓ ${list.length - end} more`));
            const count = selected.size;
            lines.push('', `  ${count ? style.success(`${count} selected`) : style.muted(options.noneLabel ?? 'None selected')}${message ? `  ${style.warning(message)}` : ''}`);
            lines.push(legend(terminal, ['↑↓ move', 'Space toggle', 'Enter confirm', 'Esc back']));
            return { lines: lines.map((line) => fit(line, Math.max(10, width - 1)).trimEnd()) };
        },
        (event) => {
            const list = rows();
            if (event.type === 'text' && event.text === ' ') event = { type: 'key', name: 'space' };
            if (event.type !== 'key') return undefined;
            message = '';
            if (event.name === 'up') focus = (focus - 1 + list.length) % list.length;
            else if (event.name === 'down' || (event.name === 'tab' && !event.shift)) focus = (focus + 1) % list.length;
            else if (event.name === 'pageup') focus = Math.max(0, focus - 8);
            else if (event.name === 'pagedown') focus = Math.min(list.length - 1, focus + 8);
            else if (event.name === 'space' || (event.name === 'enter' && list[focus]!.kind !== 'choice')) {
                const row = list[focus]!;
                if (row.kind === 'more') {
                    expanded = true;
                    focus = options.choices.filter((choice) => choice.featured).length;
                } else if (row.kind === 'fewer') {
                    expanded = false;
                    focus = 0;
                } else if (!row.choice.disabled) {
                    if (selected.has(row.choice.value)) selected.delete(row.choice.value);
                    else selected.add(row.choice.value);
                }
            } else if (event.name === 'enter') {
                if (options.minimum && selected.size < options.minimum) {
                    message = `Select at least ${options.minimum}.`;
                    return undefined;
                }
                return options.choices.filter((choice) => selected.has(choice.value)).map((choice) => choice.value);
            } else if (event.name === 'escape') return CANCELLED as never;
            return undefined;
        },
    );
    return result === (CANCELLED as unknown) ? CANCELLED : result;
}

/**
 * Bounded multiline text field with visible cursor, safe paste and discoverable submit/newline/cancel keys.
 *
 * @private terminal prompts
 */
export async function composeText(
    terminal: TerminalProfile,
    options: { frame: WizardFrame; question: string; initial?: string; placeholder?: string; required?: boolean; hint?: string },
): Promise<string | typeof CANCELLED> {
    const { style } = terminal;
    const editor = new TextEditor(options.initial ?? '');
    let message = '';
    const box = terminal.unicode ? { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' } : { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' };
    const result = await interact<string>(
        () => {
            const width = Math.min(terminal.columns() - 1, 110);
            const inner = width - 4;
            const lines = [...header(terminal, options.frame), style.bold(`${style.accent('?')} ${options.question}`)];
            if (options.hint) for (const line of wrap(options.hint, width - 2)) lines.push(style.muted(`  ${line}`));
            const maxRows = Math.max(3, Math.min(12, terminal.rows() - lines.length - 6));
            const layout = editor.layout(inner, maxRows);
            lines.push(style.accent(`${box.tl}${box.h.repeat(width - 2)}${box.tr}`));
            const top = lines.length;
            const content = editor.value ? layout.lines : [style.muted(options.placeholder ?? '')];
            const minimum = Math.max(3, Math.min(maxRows, content.length));
            for (let row = 0; row < minimum; row++) lines.push(`${style.accent(box.v)} ${fit(content[row] ?? '', inner)} ${style.accent(box.v)}`);
            const scroll = layout.hiddenAbove || layout.hiddenBelow ? ` ${layout.hiddenAbove ? `↑${layout.hiddenAbove}` : ''}${layout.hiddenBelow ? ` ↓${layout.hiddenBelow}` : ''} ` : '';
            lines.push(style.accent(`${box.bl}${box.h.repeat(Math.max(0, width - 2 - stringWidth(scroll)))}${scroll}${box.br}`));
            lines.push(message ? `  ${style.warning(message)}` : legend(terminal, ['Enter submit', 'Ctrl+J newline', 'Esc cancel', 'paste never submits']));
            return { lines, cursor: { row: top + (editor.value ? layout.cursor.row : 0), column: 2 + (editor.value ? layout.cursor.column : 0) } };
        },
        (event) => {
            const action = editor.handle(event);
            message = '';
            if (action === 'submit') {
                if (options.required && !editor.value.trim()) {
                    message = 'A value is required.';
                    return undefined;
                }
                return editor.value;
            }
            if (action === 'cancel') return CANCELLED as never;
            return undefined;
        },
    );
    return result === (CANCELLED as unknown) ? CANCELLED : result;
}

/**
 * Single-line text input (folder names, paths) using the same composer.
 *
 * @private terminal prompts
 */
export async function inputLine(terminal: TerminalProfile, options: { frame: WizardFrame; question: string; initial?: string; placeholder?: string; validate?: (value: string) => string | undefined }): Promise<string | typeof CANCELLED> {
    for (;;) {
        const value = await composeText(terminal, { frame: options.frame, question: options.question, initial: options.initial, placeholder: options.placeholder, required: true });
        if (value === CANCELLED) return CANCELLED;
        const single = value.replace(/\s*\n\s*/g, ' ').trim();
        const problem = options.validate?.(single);
        if (!problem) return single;
        terminal.write(`${terminal.style.warning(`  ${problem}`)}\n`);
        options = { ...options, initial: single };
    }
}

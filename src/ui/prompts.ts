import { ENGINE_VERSION } from '../common/version.js';
import { fit, stringWidth, truncate, wrap } from './ansi.js';
import { inlineSegments } from './attachments.js';
import { inlineBadge, type BadgeActivity } from './badges.js';
import type { ComposedSegment } from './composer.js';
import { RichInput } from './rich-input.js';
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
 * Key that produced the most recent `CANCELLED`: Esc (go back) or Ctrl+C (abandon the wizard).
 */
let lastCancellation: 'escape' | 'interrupt' = 'escape';

/**
 * Whether the most recent cancellation was Ctrl+C (abandon) rather than Esc (go back).
 *
 * @private terminal prompts
 */
export function wasInterrupted(): boolean {
    return lastCancellation === 'interrupt';
}

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
    /** Procedural guide shown with its mascot (Expert in init), reacting to the step. */
    readonly guide?: { readonly name: string; readonly activity: BadgeActivity; readonly note?: string };
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
    if (frame.guide) lines.push(`${inlineBadge(frame.guide.name, frame.guide.activity, style)}${frame.guide.note ? style.muted(` · ${truncate(frame.guide.note, Math.max(10, width - 24))}`) : ''}`);
    for (const line of frame.summary ?? []) lines.push(style.muted(`  ${terminal.unicode ? '✔' : 'OK'} ${line}`));
    lines.push('');
    return lines;
}

/**
 * Runs an interactive inline prompt until a value is produced.
 *
 * `setup` receives a redraw function for asynchronous updates (clipboard reads, dropped files).
 */
async function interact<T>(
    view: () => { lines: string[]; cursor?: { row: number; column: number } },
    onKey: (event: KeyEvent) => T | undefined,
    setup?: (redraw: () => void) => void,
): Promise<T | typeof CANCELLED> {
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
                lastCancellation = 'interrupt';
                finish(CANCELLED);
                return;
            }
            if (event.type === 'key' && event.name === 'escape') lastCancellation = 'escape';
            const result = onKey(event);
            if (result !== undefined) finish(result);
            else redraw();
        });
        keyboard.start();
        process.stdout.on('resize', redraw);
        setup?.(redraw);
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
 *
 * @private terminal prompts
 */
export function windowAround(length: number, focus: number, size: number): { start: number; end: number } {
    if (length <= size) return { start: 0, end: length };
    const start = Math.min(Math.max(0, focus - Math.floor(size / 2)), length - size);
    return { start, end: start + size };
}

/**
 * Whether a text matches a typed filter: every word of the query appears, ignoring case and accents.
 *
 * @private terminal prompts
 */
export function matchesFilter(text: string, query: string): boolean {
    const fold = (value: string): string => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const haystack = fold(text);
    return fold(query)
        .split(/\s+/)
        .filter(Boolean)
        .every((word) => haystack.includes(word));
}

/**
 * Single-choice picker: arrows move focus, Enter confirms; the default is initially focused. A `searchable` picker
 * (long lists such as every agent) also narrows its choices as the user types; Esc clears the filter first.
 *
 * @private terminal prompts
 */
export async function selectOne<T>(terminal: TerminalProfile, options: { frame: WizardFrame; question: string; choices: readonly Choice<T>[]; defaultValue?: T; escapeLabel?: string; searchable?: boolean }): Promise<T | typeof CANCELLED> {
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    let query = '';
    let visible: readonly Choice<T>[] = options.choices;
    let focus = Math.max(0, visible.findIndex((choice) => choice.value === options.defaultValue));
    const moveFocus = (delta: number): void => {
        for (let step = 0; step < visible.length; step++) {
            focus = (focus + delta + visible.length) % visible.length;
            if (!visible[focus]!.disabled) return;
        }
    };
    const refilter = (): void => {
        const focused = visible[focus]?.value;
        visible = query ? options.choices.filter((choice) => matchesFilter(`${choice.label} ${choice.description ?? ''}`, query)) : options.choices;
        focus = Math.max(0, visible.findIndex((choice) => choice.value === focused));
        if (visible[focus]?.disabled) moveFocus(1);
    };
    if (visible[focus]?.disabled) moveFocus(1);
    return await interact<T>(
        () => {
            const width = terminal.columns();
            // Long questions (e.g. a project path) wrap instead of being clipped.
            const [first = '', ...more] = wrap(options.question, Math.max(10, width - 3));
            const lines = [...header(terminal, options.frame), style.bold(`${style.accent('?')} ${first}`), ...more.map((line) => style.bold(`  ${line}`))];
            if (options.searchable) lines.push(query ? `  ${style.accent('Filter:')} ${query}${style.muted(` · ${visible.length} of ${options.choices.length}`)}` : style.muted('  Type to filter'));
            if (!visible.length) lines.push(style.muted('    No match — Backspace edits the filter, Esc clears it.'));
            const available = Math.max(3, terminal.rows() - lines.length - 4);
            const { start, end } = windowAround(visible.length, focus, available);
            if (start > 0) lines.push(style.muted(`    ↑ ${start} more`));
            for (let index = start; index < end; index++) {
                const choice = visible[index]!;
                const focused = index === focus;
                const pointer = focused ? style.accent(marks.pointer) : ' ';
                const radio = focused ? style.accent(marks.radioOn) : style.muted(marks.radioOff);
                const isDefault = choice.value === options.defaultValue ? style.muted(' (default)') : '';
                const label = choice.disabled ? style.muted(choice.label) : focused ? style.bold(choice.label) : choice.label;
                const prefix = `  ${pointer} ${radio} `;
                const description = choice.description ? style.muted(`  ${choice.description}`) : '';
                lines.push(truncate(`${prefix}${label}${isDefault}${description}`, width - 1));
            }
            if (end < visible.length) lines.push(style.muted(`    ↓ ${visible.length - end} more`));
            lines.push('', legend(terminal, ['↑↓ move', 'Enter confirm', ...(options.searchable ? ['type to filter'] : []), options.escapeLabel ?? 'Esc back']));
            return { lines };
        },
        (event) => {
            if (options.searchable && (event.type === 'text' || event.type === 'paste')) {
                query += event.text.replace(/[\r\n\t]+/g, ' ');
                refilter();
                return undefined;
            }
            if (event.type !== 'key') return undefined;
            if (options.searchable && event.name === 'backspace') {
                query = query.slice(0, -1);
                refilter();
            } else if (options.searchable && event.name === 'escape' && query) {
                query = '';
                refilter();
            } else if (event.name === 'up') moveFocus(-1);
            else if (event.name === 'down' || (event.name === 'tab' && !event.shift)) moveFocus(1);
            else if (event.name === 'pageup') focus = Math.max(0, focus - 8);
            else if (event.name === 'pagedown') focus = Math.max(0, Math.min(visible.length - 1, focus + 8));
            else if (event.name === 'home') focus = 0;
            else if (event.name === 'end') focus = Math.max(0, visible.length - 1);
            else if (event.name === 'enter') return !visible[focus] || visible[focus]!.disabled ? undefined : visible[focus]!.value;
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
 * Checkbox picker with featured items and a selectable "More…" action; Space toggles, Enter confirms. Typing filters
 * the whole catalog (featured or not), so large catalogs stay navigable; Backspace edits and Esc clears the filter.
 *
 * @private terminal prompts
 */
export async function selectMany<T>(
    terminal: TerminalProfile,
    options: { frame: WizardFrame; question: string; choices: readonly Choice<T>[]; initial: readonly T[]; minimum?: number; noneLabel?: string; emptyWarning?: string; /** Ctrl+A selects every enabled choice, Ctrl+U none. */ bulk?: boolean },
): Promise<T[] | typeof CANCELLED> {
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const selected = new Set<T>(options.initial);
    // An empty selection with consequences is confirmed by a second Enter after its visible warning.
    let emptyConfirmed = false;
    const hasFeatured = options.choices.some((choice) => choice.featured) && options.choices.some((choice) => !choice.featured);
    let expanded = !hasFeatured || options.choices.some((choice) => !choice.featured && selected.has(choice.value));
    let focus = 0;
    let message = '';
    let query = '';
    type Row = { kind: 'choice'; choice: Choice<T> } | { kind: 'more' } | { kind: 'fewer' };
    const rows = (): Row[] => {
        if (query) return options.choices.filter((choice) => matchesFilter(`${choice.label} ${choice.description ?? ''}`, query)).map((choice) => ({ kind: 'choice' as const, choice }));
        if (!hasFeatured) return options.choices.map((choice) => ({ kind: 'choice' as const, choice }));
        if (!expanded) return [...options.choices.filter((choice) => choice.featured).map((choice) => ({ kind: 'choice' as const, choice })), { kind: 'more' as const }];
        return [...options.choices.map((choice) => ({ kind: 'choice' as const, choice })), { kind: 'fewer' as const }];
    };
    const result = await interact<T[]>(
        () => {
            const width = terminal.columns();
            const list = rows();
            focus = Math.max(0, Math.min(focus, list.length - 1));
            const lines = [...header(terminal, options.frame), style.bold(`${style.accent('?')} ${options.question}`)];
            if (query) lines.push(`  ${style.accent('Filter:')} ${query}${style.muted(` · ${list.length} of ${options.choices.length}`)}`);
            if (!list.length) lines.push(style.muted('    No match — Backspace edits the filter, Esc clears it.'));
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
            if (!count && options.emptyWarning) for (const line of wrap(`${marks.warn} ${options.emptyWarning}`, Math.max(20, width - 4))) lines.push(`  ${style.warning(line)}`);
            lines.push(legend(terminal, ['↑↓ move', 'Space toggle', ...(options.bulk ? ['Ctrl+A all', 'Ctrl+U none'] : []), 'Enter confirm', 'type to filter', query ? 'Esc clear filter' : 'Esc back']));
            return { lines: lines.map((line) => fit(line, Math.max(10, width - 1)).trimEnd()) };
        },
        (event) => {
            if (event.type === 'text' && event.text === ' ') event = { type: 'key', name: 'space' };
            if (event.type === 'text' || event.type === 'paste') {
                // Space toggles, so the filter takes the other printable characters.
                const typed = event.text.replace(/\s+/g, '');
                if (typed) {
                    query += typed;
                    focus = 0;
                }
                return undefined;
            }
            const list = rows();
            message = '';
            if (options.bulk && event.ctrl && (event.name === 'a' || event.name === 'u')) {
                for (const choice of options.choices) {
                    if (choice.disabled) continue;
                    if (event.name === 'a') selected.add(choice.value);
                    else selected.delete(choice.value);
                }
                return undefined;
            }
            if (event.name === 'backspace' && query) {
                query = query.slice(0, -1);
                focus = 0;
            } else if (event.name === 'escape' && query) {
                query = '';
                focus = 0;
            } else if (!list.length && event.name !== 'enter' && event.name !== 'escape') return undefined;
            else if (event.name === 'up') focus = (focus - 1 + list.length) % list.length;
            else if (event.name === 'down' || (event.name === 'tab' && !event.shift)) focus = (focus + 1) % list.length;
            else if (event.name === 'pageup') focus = Math.max(0, focus - 8);
            else if (event.name === 'pagedown') focus = Math.min(list.length - 1, focus + 8);
            else if (event.name === 'space' || (event.name === 'enter' && list[focus] && list[focus]!.kind !== 'choice')) {
                const row = list[focus];
                if (!row) return undefined;
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
                if (!selected.size && options.emptyWarning && !emptyConfirmed) {
                    emptyConfirmed = true;
                    message = 'Press Enter again to continue without any, or Space to select one.';
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
 * A labeled on/off control of a toggle list.
 *
 * @private terminal prompts
 */
export type Toggle<K extends string> = { readonly key: K; readonly label: string; readonly description: string };

/**
 * Several labeled on/off controls on one screen with a live explanation of their combined effect.
 *
 * Space toggles the focused control, Enter confirms all, Esc goes back without applying.
 *
 * @private terminal prompts
 */
export async function toggleList<K extends string>(
    terminal: TerminalProfile,
    options: { frame: WizardFrame; question: string; intro?: string; toggles: readonly Toggle<K>[]; initial: Readonly<Record<K, boolean>>; effect: (values: Readonly<Record<K, boolean>>) => readonly string[] },
): Promise<Record<K, boolean> | typeof CANCELLED> {
    const { style } = terminal;
    const values = { ...options.initial } as Record<K, boolean>;
    let focus = 0;
    const result = await interact<Record<K, boolean>>(
        () => {
            const width = Math.min(terminal.columns() - 1, 110);
            const lines = [...header(terminal, options.frame), style.bold(`${style.accent('?')} ${options.question}`)];
            if (options.intro) for (const line of wrap(options.intro, width - 2)) lines.push(style.muted(`  ${line}`));
            lines.push('');
            options.toggles.forEach((toggle, index) => {
                const box = values[toggle.key] ? (terminal.unicode ? '◉' : '[x]') : terminal.unicode ? '○' : '[ ]';
                const pointer = index === focus ? style.accent(terminal.unicode ? '❯' : '>') : ' ';
                const label = index === focus ? style.bold(toggle.label) : toggle.label;
                lines.push(`${pointer} ${values[toggle.key] ? style.success(box) : box} ${label}  ${style.muted(values[toggle.key] ? 'yes' : 'no')}`);
                for (const line of wrap(toggle.description, width - 6)) lines.push(style.muted(`      ${line}`));
            });
            lines.push('');
            for (const line of options.effect(values)) for (const wrapped of wrap(line, width - 4)) lines.push(`  ${style.accent(wrapped)}`);
            lines.push(legend(terminal, ['↑↓ move', 'Space toggle', 'Enter confirm', 'Esc back']));
            return { lines };
        },
        (event) => {
            if (event.type !== 'key') return undefined;
            if (event.name === 'up') focus = (focus + options.toggles.length - 1) % options.toggles.length;
            else if (event.name === 'down' || event.name === 'tab') focus = (focus + 1) % options.toggles.length;
            else if (event.name === 'space') {
                const key = options.toggles[focus]!.key;
                values[key] = !values[key];
            } else if (event.name === 'enter') return { ...values };
            else if (event.name === 'escape') return CANCELLED as never;
            return undefined;
        },
    );
    return result === (CANCELLED as unknown) ? CANCELLED : result;
}

/**
 * Result of the rich composer: the complete payload in order (pasted blocks in full, attachments at their positions).
 *
 * @private terminal prompts
 */
export type ComposedInput = { readonly segments: readonly ComposedSegment[]; readonly text: string };

/**
 * The rich composer of wizard steps (intent, task descriptions, planning): the shared rich input in its forward
 * `flow` policy (Enter submits), drawn as a bounded field with the shared status and key legend.
 *
 * @private terminal prompts
 */
export async function composeRich(
    terminal: TerminalProfile,
    options: { frame: WizardFrame; question: string; initial?: string | readonly ComposedSegment[]; placeholder?: string; required?: boolean; hint?: string; attachments?: boolean; singleLine?: boolean; aside?: () => readonly string[] },
): Promise<ComposedInput | typeof CANCELLED> {
    const { style } = terminal;
    let refresh: () => void = () => undefined;
    const input = new RichInput({ mode: 'flow', initial: options.initial, attachments: options.attachments, singleLine: options.singleLine, required: options.required, refresh: () => refresh() });
    const editor = input.editor;
    const box = terminal.unicode ? { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' } : { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' };
    const result = await interact<ComposedInput>(
        () => {
            const width = Math.min(terminal.columns() - 1, 110);
            const inner = width - 4;
            const lines = [...header(terminal, options.frame)];
            for (const line of options.aside?.() ?? []) lines.push(line);
            lines.push(style.bold(`${style.accent('?')} ${options.question}`));
            if (options.hint) for (const line of wrap(options.hint, width - 2)) lines.push(style.muted(`  ${line}`));
            const maxRows = options.singleLine ? 1 : Math.max(3, Math.min(14, terminal.rows() - lines.length - 7));
            const layout = editor.layout(inner, maxRows);
            lines.push(style.accent(`${box.tl}${box.h.repeat(width - 2)}${box.tr}`));
            const top = lines.length;
            const content = !editor.empty || editor.value ? layout.lines : [style.muted(options.placeholder ?? '')];
            const minimum = options.singleLine ? 1 : Math.max(3, Math.min(maxRows, content.length));
            for (let row = 0; row < minimum; row++) lines.push(`${style.accent(box.v)} ${fit(content[row] ?? '', inner)} ${style.accent(box.v)}`);
            const scroll = layout.hiddenAbove || layout.hiddenBelow ? ` ${layout.hiddenAbove ? `↑${layout.hiddenAbove}` : ''}${layout.hiddenBelow ? ` ↓${layout.hiddenBelow}` : ''} ` : '';
            lines.push(style.accent(`${box.bl}${box.h.repeat(Math.max(0, width - 2 - stringWidth(scroll)))}${scroll}${box.br}`));
            const attaching = input.attaching;
            if (attaching) {
                const pathLayout = attaching.layout(width - 18, 1);
                lines.push(`  ${style.bold('Attach file:')} ${pathLayout.lines[0] ?? ''}`);
                const status = input.status(width - 2);
                lines.push(status ? `  ${style.warning(status.text)}` : legend(terminal, input.keys()));
                return { lines, cursor: { row: lines.length - 2, column: 15 + pathLayout.cursor.column } };
            }
            const status = input.status(width - 2);
            if (status) lines.push(`  ${status.tone === 'warning' ? style.warning(status.text) : style.muted(status.text)}`);
            lines.push(legend(terminal, input.keys()));
            return { lines, cursor: { row: top + (!editor.empty || editor.value ? layout.cursor.row : 0), column: 2 + (!editor.empty || editor.value ? layout.cursor.column : 0) } };
        },
        (event) => {
            const action = input.handle(event);
            if (action === 'submit') {
                const segments = input.segments();
                return { segments, text: inlineSegments(segments) };
            }
            if (action === 'cancel') return CANCELLED as never;
            return undefined;
        },
        (redraw) => {
            refresh = redraw;
        },
    );
    return result === (CANCELLED as unknown) ? CANCELLED : result;
}

/**
 * Bounded multiline text field (the rich composer without attachments), returning the complete text.
 *
 * @private terminal prompts
 */
export async function composeText(
    terminal: TerminalProfile,
    options: { frame: WizardFrame; question: string; initial?: string; placeholder?: string; required?: boolean; hint?: string; singleLine?: boolean },
): Promise<string | typeof CANCELLED> {
    const result = await composeRich(terminal, options);
    return result === CANCELLED ? CANCELLED : result.text;
}

/**
 * Single-line text input (folder names, paths) using the same composer.
 *
 * @private terminal prompts
 */
export async function inputLine(terminal: TerminalProfile, options: { frame: WizardFrame; question: string; initial?: string; placeholder?: string; validate?: (value: string) => string | undefined }): Promise<string | typeof CANCELLED> {
    for (;;) {
        const value = await composeText(terminal, { frame: options.frame, question: options.question, initial: options.initial, placeholder: options.placeholder, required: true, singleLine: true });
        if (value === CANCELLED) return CANCELLED;
        const single = value.replace(/\s*\n\s*/g, ' ').trim();
        const problem = options.validate?.(single);
        if (!problem) return single;
        terminal.write(`${terminal.style.warning(`  ${problem}`)}\n`);
        options = { ...options, initial: single };
    }
}

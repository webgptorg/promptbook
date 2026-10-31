import { stringWidth, truncate } from './ansi.js';
import type { KeyEvent } from './keys.js';

/**
 * Grapheme segmenter for cursor movement.
 */
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * Splits text into graphemes.
 */
function graphemes(text: string): string[] {
    return [...segmenter.segment(text)].map((segment) => segment.segment);
}

/**
 * Outcome of handling a key in the editor.
 *
 * @private text composer
 */
export type EditorAction = 'submit' | 'cancel' | 'changed' | 'ignored';

/**
 * A compact item inserted into the composer: a long pasted block or an attached image/file.
 *
 * Its token stands at the insertion position and refers to the complete payload (never a summary).
 *
 * @private text composer
 */
export type ComposerItem =
    | { readonly kind: 'paste'; readonly number: number; readonly text: string }
    | { readonly kind: 'image' | 'file'; readonly number: number; readonly path: string; readonly name: string; readonly bytes: number };

/**
 * Composed input in order: typed/pasted text and attachments at their positions.
 *
 * @private text composer
 */
export type ComposedSegment =
    | { readonly type: 'text'; readonly text: string; /** A pasted block (shown as a token when restored). */ readonly pasted?: boolean }
    | { readonly type: 'attachment'; readonly kind: 'image' | 'file'; readonly path: string; readonly name: string };

/**
 * Pasted blocks at least this long (lines) are shown as a compact token.
 */
const PASTE_TOKEN_LINES = 6;

/**
 * Pasted blocks at least this long (characters) are shown as a compact token.
 */
const PASTE_TOKEN_CHARACTERS = 600;

/**
 * First code point used for tokens (Supplementary Private Use Area-A, never typed in practice).
 */
const TOKEN_BASE = 0xf0000;

/**
 * Whether a grapheme is an item token.
 */
function isToken(grapheme: string): boolean {
    const code = grapheme.codePointAt(0) ?? 0;
    return code >= TOKEN_BASE && code < TOKEN_BASE + 0xfffe && grapheme.length <= 2;
}

/**
 * Label of an item token, e.g. `[Pasted text #1, 12,400 characters, 120 lines]`, `[Image #2]` or `[File: brief.md]`.
 *
 * @private text composer
 */
export function itemLabel(item: ComposerItem): string {
    if (item.kind === 'paste') {
        const lines = item.text.split('\n').length;
        return `[Pasted text #${item.number}, ${item.text.length.toLocaleString('en-US')} characters${lines > 1 ? `, ${lines.toLocaleString('en-US')} lines` : ''}]`;
    }
    return item.kind === 'image' ? `[Image #${item.number}]` : `[File: ${item.name}]`;
}

/**
 * Multiline text editing model inspired by the Codex terminal composer:
 * Enter submits, Ctrl+J / Alt+Enter insert a newline, paste never submits.
 *
 * @private text composer
 */
export class TextEditor {
    private characters: string[];
    private cursor: number;
    private readonly items = new Map<string, ComposerItem>();
    private nextNumber = 1;
    /** The first row of the view of a long content. */
    private scrollTop = 0;
    /** Long pastes become compact tokens (multiline fields); single-line fields insert them verbatim. */
    public tokenizePastes = true;

    /** Keeps tabs of inserted text literally (full-source editing preserves the source exactly). */
    private readonly literal: boolean;

    public constructor(initial: string | readonly ComposedSegment[] = '', options: { readonly literal?: boolean } = {}) {
        this.characters = [];
        this.cursor = 0;
        this.literal = options.literal === true;
        if (typeof initial === 'string') this.insert(initial);
        else
            for (const segment of initial) {
                if (segment.type === 'text' && segment.pasted) this.paste(segment.text);
                else if (segment.type === 'text') this.insert(segment.text);
                else this.attach({ kind: segment.kind, path: segment.path, name: segment.name, bytes: 0 });
            }
    }

    /** Current text with pasted blocks expanded (attachments are omitted; see `segments`). */
    public get value(): string {
        return this.segments()
            .map((segment) => (segment.type === 'text' ? segment.text : ''))
            .join('');
    }

    /** Replaces the text (cursor at end, items removed). */
    public set value(text: string) {
        this.characters = [];
        this.items.clear();
        this.cursor = 0;
        this.insert(text);
    }

    /** Whether nothing (no text and no item) was entered. */
    public get empty(): boolean {
        return !this.characters.some((character) => isToken(character) || character.trim());
    }

    /** Inserted items in order of appearance. */
    public get insertedItems(): ComposerItem[] {
        return this.characters.filter(isToken).map((token) => this.items.get(token)!).filter(Boolean);
    }

    /**
     * The complete payload in order: text (pasted blocks expanded in full) and attachments at their positions.
     */
    public segments(): ComposedSegment[] {
        const result: ComposedSegment[] = [];
        let text = '';
        for (const character of this.characters) {
            const item = isToken(character) ? this.items.get(character) : undefined;
            if (!item) {
                text += character;
                continue;
            }
            if (text) result.push({ type: 'text', text });
            text = '';
            if (item.kind === 'paste') result.push({ type: 'text', text: item.text, pasted: true });
            else result.push({ type: 'attachment', kind: item.kind, path: item.path, name: item.name });
        }
        if (text) result.push({ type: 'text', text });
        return result;
    }

    /** Inserts typed text at the cursor (token code points are never accepted from input). */
    private insert(text: string): void {
        const normalized = text.replace(/\r\n?/g, '\n').replace(/[\u{F0000}-\u{FFFFD}]/gu, '');
        const inserted = graphemes(this.literal ? normalized : normalized.replace(/\t/g, '    '));
        this.characters.splice(this.cursor, 0, ...inserted);
        this.cursor += inserted.length;
    }

    /** Inserts an item token at the cursor. */
    private insertItem(item: ComposerItem): void {
        const token = String.fromCodePoint(TOKEN_BASE + item.number);
        this.items.set(token, item);
        this.characters.splice(this.cursor, 0, token);
        this.cursor++;
    }

    /** Inserts pasted text: long blocks become one compact token referring to the full text. */
    public paste(text: string): void {
        const normalized = text.replace(/\r\n?/g, '\n');
        if (this.tokenizePastes && (normalized.split('\n').length >= PASTE_TOKEN_LINES || normalized.length >= PASTE_TOKEN_CHARACTERS)) {
            this.insertItem({ kind: 'paste', number: this.nextNumber++, text: normalized });
        } else this.insert(normalized);
    }

    /** Inserts an attachment token. */
    public attach(attachment: { kind: 'image' | 'file'; path: string; name: string; bytes: number }): ComposerItem {
        const item: ComposerItem = { ...attachment, number: this.nextNumber++ };
        this.insertItem(item);
        return item;
    }

    /** The item token directly before (or under) the cursor, for inspection. */
    public itemAtCursor(): ComposerItem | undefined {
        const before = this.characters[this.cursor - 1];
        const under = this.characters[this.cursor];
        if (before && isToken(before)) return this.items.get(before);
        if (under && isToken(under)) return this.items.get(under);
        return undefined;
    }

    /** Expands the pasted block at the cursor into editable text. */
    public expandAtCursor(): boolean {
        const index = isToken(this.characters[this.cursor - 1] ?? '') ? this.cursor - 1 : isToken(this.characters[this.cursor] ?? '') ? this.cursor : -1;
        if (index < 0) return false;
        const item = this.items.get(this.characters[index]!);
        if (item?.kind !== 'paste') return false;
        const expanded = graphemes(item.text);
        this.characters.splice(index, 1, ...expanded);
        this.items.delete(String.fromCodePoint(TOKEN_BASE + item.number));
        this.cursor = index + expanded.length;
        return true;
    }

    /** Start index of the logical line containing an index. */
    private lineStart(index: number): number {
        let position = index;
        while (position > 0 && this.characters[position - 1] !== '\n') position--;
        return position;
    }

    /** End index of the logical line containing an index. */
    private lineEnd(index: number): number {
        let position = index;
        while (position < this.characters.length && this.characters[position] !== '\n') position++;
        return position;
    }

    /** Handles a key event. */
    public handle(event: KeyEvent): EditorAction {
        if (event.type === 'text') {
            this.insert(event.text);
            return 'changed';
        }
        if (event.type === 'paste') {
            this.paste(event.text);
            return 'changed';
        }
        if (event.type === 'pointer') return 'ignored';
        switch (event.name) {
            case 'enter':
                return 'submit';
            case 'newline':
                this.insert('\n');
                return 'changed';
            case 'escape':
                return 'cancel';
            case 'space':
                this.insert(' ');
                return 'changed';
            case 'tab':
                if (event.shift) return 'ignored';
                this.insert('    ');
                return 'changed';
            case 'backspace': {
                if (this.cursor === 0) return 'ignored';
                const [removed] = this.characters.splice(--this.cursor, 1);
                if (removed && isToken(removed)) this.items.delete(removed);
                return 'changed';
            }
            case 'delete': {
                if (this.cursor >= this.characters.length) return 'ignored';
                const [removed] = this.characters.splice(this.cursor, 1);
                if (removed && isToken(removed)) this.items.delete(removed);
                return 'changed';
            }
            case 'left':
                if (event.ctrl) {
                    while (this.cursor > 0 && /\s/.test(this.characters[this.cursor - 1]!)) this.cursor--;
                    while (this.cursor > 0 && !/\s/.test(this.characters[this.cursor - 1]!)) this.cursor--;
                } else this.cursor = Math.max(0, this.cursor - 1);
                return 'changed';
            case 'right':
                if (event.ctrl) {
                    while (this.cursor < this.characters.length && !/\s/.test(this.characters[this.cursor]!)) this.cursor++;
                    while (this.cursor < this.characters.length && /\s/.test(this.characters[this.cursor]!)) this.cursor++;
                } else this.cursor = Math.min(this.characters.length, this.cursor + 1);
                return 'changed';
            case 'home':
                this.cursor = this.lineStart(this.cursor);
                return 'changed';
            case 'end':
                this.cursor = this.lineEnd(this.cursor);
                return 'changed';
            case 'up':
            case 'down': {
                const start = this.lineStart(this.cursor);
                const column = this.cursor - start;
                if (event.name === 'up') {
                    if (start === 0) return 'ignored';
                    const previousStart = this.lineStart(start - 1);
                    this.cursor = Math.min(previousStart + column, start - 1);
                } else {
                    const end = this.lineEnd(this.cursor);
                    if (end >= this.characters.length) return 'ignored';
                    const nextEnd = this.lineEnd(end + 1);
                    this.cursor = Math.min(end + 1 + column, nextEnd);
                }
                return 'changed';
            }
            case 'a':
                if (!event.ctrl) return 'ignored';
                this.cursor = this.lineStart(this.cursor);
                return 'changed';
            case 'e':
                if (!event.ctrl) return 'ignored';
                this.cursor = this.lineEnd(this.cursor);
                return 'changed';
            case 'u': {
                if (!event.ctrl) return 'ignored';
                const start = this.lineStart(this.cursor);
                this.characters.splice(start, this.cursor - start);
                this.cursor = start;
                return 'changed';
            }
            case 'k': {
                if (!event.ctrl) return 'ignored';
                const end = this.lineEnd(this.cursor);
                this.characters.splice(this.cursor, end - this.cursor);
                return 'changed';
            }
            case 'w': {
                if (!event.ctrl) return 'ignored';
                let start = this.cursor;
                while (start > 0 && /\s/.test(this.characters[start - 1]!)) start--;
                while (start > 0 && !/\s/.test(this.characters[start - 1]!)) start--;
                this.characters.splice(start, this.cursor - start);
                this.cursor = start;
                return 'changed';
            }
            default:
                return 'ignored';
        }
    }

    /** The text with attachment tokens as their placeholder characters (offsets match the edited characters). */
    public get rawText(): string {
        return this.characters.join('');
    }

    /** Places the cursor at a position (from a layout's `offsetAt`). */
    public placeCursor(offset: number): void {
        this.cursor = Math.max(0, Math.min(this.characters.length, offset));
    }

    /**
     * Wraps the text to a width and locates the cursor; long content scrolls to keep the cursor visible. `styleAt`
     * optionally styles the character at a UTF-16 offset of `rawText` (e.g. Book highlighting); widths are measured on
     * the plain text. `offsetAt` tells which cursor position a visible row and column stand for (see `placeCursor`).
     */
    public layout(width: number, maxRows: number, styleAt?: (offset: number) => ((text: string) => string) | undefined): { lines: string[]; cursor: { row: number; column: number }; hiddenAbove: number; hiddenBelow: number; offsetAt: (row: number, column: number) => number } {
        const usable = Math.max(4, width);
        const rows: string[] = [];
        const styledRows: string[] = [];
        let cursorRow = 0;
        let cursorColumn = 0;
        let row = '';
        let styledRow = '';
        let rowWidth = 0;
        let offset = 0;
        // Consecutive characters with the same style are styled as one run (one escape sequence, not one per character).
        let run = '';
        let runStyle: ((text: string) => string) | undefined;
        const closeRun = (): void => {
            styledRow += run && runStyle ? runStyle(run) : run;
            run = '';
            runStyle = undefined;
        };
        // The character each row begins with, for `offsetAt`.
        const rowStarts = [0];
        const shown = (character: string): string => {
            if (!isToken(character)) return character;
            const item = this.items.get(character);
            return truncate(item ? itemLabel(item) : '[?]', usable);
        };
        const flush = (next?: number): void => {
            if (next !== undefined) rowStarts.push(next);
            closeRun();
            rows.push(row);
            styledRows.push(styledRow);
            row = '';
            styledRow = '';
            rowWidth = 0;
        };
        for (let index = 0; index <= this.characters.length; index++) {
            if (index === this.cursor) {
                if (rowWidth >= usable) flush(index);
                cursorRow = rows.length;
                cursorColumn = rowWidth;
            }
            if (index === this.characters.length) break;
            const source = this.characters[index]!;
            const at = offset;
            offset += source.length;
            if (source === '\n') {
                flush(index + 1);
                continue;
            }
            const character = shown(source);
            const characterWidth = stringWidth(character);
            if (rowWidth + characterWidth > usable) flush(index);
            row += character;
            const styled = isToken(source) ? undefined : styleAt?.(at);
            if (styled !== runStyle) closeRun();
            runStyle = styled;
            run += character;
            rowWidth += characterWidth;
        }
        flush();
        const visible = Math.max(1, maxRows);
        // The view stays put while the cursor moves inside it, so a click does not move the text under the pointer.
        const top = Math.max(0, Math.min(this.scrollTop, cursorRow, rows.length - visible), cursorRow - visible + 1);
        this.scrollTop = top;
        return {
            lines: styleAt ? styledRows.slice(top, top + visible) : rows.slice(top, top + visible).map((line) => truncate(line, usable)),
            cursor: { row: cursorRow - top, column: cursorColumn },
            hiddenAbove: top,
            hiddenBelow: Math.max(0, rows.length - top - visible),
            offsetAt: (visibleRow, column) => {
                const start = rowStarts[top + visibleRow];
                if (start === undefined) return this.characters.length;
                const next = rowStarts[top + visibleRow + 1];
                // Beyond the end of a wrapped row the position stays on that row, not at the start of the next one.
                const last = next === undefined ? this.characters.length : next - 1;
                let used = 0;
                for (let index = start; index < (next ?? this.characters.length); index++) {
                    const source = this.characters[index]!;
                    if (source === '\n') return index;
                    const cells = stringWidth(shown(source));
                    // The nearer edge of a wide character or an item token.
                    if (column < used + cells) return column - used < cells / 2 ? index : Math.min(index + 1, last);
                    used += cells;
                }
                return last;
            },
        };
    }
}

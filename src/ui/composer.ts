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

    /**
     * Wraps the text to a width and locates the cursor; long content scrolls to keep the cursor visible.
     */
    public layout(width: number, maxRows: number): { lines: string[]; cursor: { row: number; column: number }; hiddenAbove: number; hiddenBelow: number } {
        const usable = Math.max(4, width);
        const rows: string[] = [];
        let cursorRow = 0;
        let cursorColumn = 0;
        let row = '';
        let rowWidth = 0;
        const flush = (): void => {
            rows.push(row);
            row = '';
            rowWidth = 0;
        };
        for (let index = 0; index <= this.characters.length; index++) {
            if (index === this.cursor) {
                if (rowWidth >= usable) flush();
                cursorRow = rows.length;
                cursorColumn = rowWidth;
            }
            if (index === this.characters.length) break;
            let character = this.characters[index]!;
            if (character === '\n') {
                flush();
                continue;
            }
            if (isToken(character)) {
                const item = this.items.get(character);
                character = truncate(item ? itemLabel(item) : '[?]', usable);
            }
            const characterWidth = stringWidth(character);
            if (rowWidth + characterWidth > usable) flush();
            row += character;
            rowWidth += characterWidth;
        }
        flush();
        const visible = Math.max(1, maxRows);
        let top = 0;
        if (rows.length > visible) top = Math.min(Math.max(0, cursorRow - visible + 1), rows.length - visible);
        return {
            lines: rows.slice(top, top + visible).map((line) => truncate(line, usable)),
            cursor: { row: cursorRow - top, column: cursorColumn },
            hiddenAbove: top,
            hiddenBelow: Math.max(0, rows.length - top - visible),
        };
    }
}

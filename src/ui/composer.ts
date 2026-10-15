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
 * Multiline text editing model inspired by the Codex terminal composer:
 * Enter submits, Ctrl+J / Alt+Enter insert a newline, paste never submits.
 *
 * @private text composer
 */
export class TextEditor {
    private characters: string[];
    private cursor: number;

    public constructor(initial = '') {
        this.characters = graphemes(initial);
        this.cursor = this.characters.length;
    }

    /** Current text. */
    public get value(): string {
        return this.characters.join('');
    }

    /** Replaces the text (cursor at end). */
    public set value(text: string) {
        this.characters = graphemes(text);
        this.cursor = this.characters.length;
    }

    /** Inserts text at the cursor. */
    private insert(text: string): void {
        const inserted = graphemes(text.replace(/\r\n?/g, '\n').replace(/\t/g, '    '));
        this.characters.splice(this.cursor, 0, ...inserted);
        this.cursor += inserted.length;
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
            this.insert(event.text);
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
            case 'backspace':
                if (this.cursor === 0) return 'ignored';
                this.characters.splice(--this.cursor, 1);
                return 'changed';
            case 'delete':
                if (this.cursor >= this.characters.length) return 'ignored';
                this.characters.splice(this.cursor, 1);
                return 'changed';
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
            const character = this.characters[index]!;
            if (character === '\n') {
                flush();
                continue;
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

import { terminalSafe, truncate } from './ansi.js';

/**
 * Renders a block of lines in place (wizard steps, pickers) without flooding scrollback.
 *
 * Lines are made terminal-safe (styling only) and truncated to the terminal width so that the rendered line count
 * stays exact.
 *
 * @private terminal screen
 */
export class InlineRenderer {
    private renderedLines = 0;
    private cursorRow = 0;

    public constructor(private readonly output: NodeJS.WriteStream = process.stdout) {}

    /** Terminal width. */
    private width(): number {
        return Math.max(20, this.output.columns || 80);
    }

    /** Terminal height. */
    public height(): number {
        return Math.max(10, this.output.rows || 24);
    }

    /**
     * Replaces the previously rendered block; optionally places the visible cursor at (row, column) of the block.
     */
    public render(lines: readonly string[], cursor?: { row: number; column: number }): void {
        const width = this.width();
        const fitted = lines.slice(0, Math.max(1, this.height() - 1)).map((line) => truncate(terminalSafe(line), width - 1));
        let output = '\x1b[?25l';
        if (this.renderedLines > 0) output += `${this.cursorRow > 0 ? `\x1b[${this.cursorRow}A` : ''}\r`;
        output += '\x1b[0J';
        output += fitted.join('\n');
        this.renderedLines = fitted.length;
        this.cursorRow = fitted.length - 1;
        if (cursor) {
            const row = Math.min(cursor.row, fitted.length - 1);
            const up = this.cursorRow - row;
            output += `${up > 0 ? `\x1b[${up}A` : ''}\r${cursor.column > 0 ? `\x1b[${cursor.column}C` : ''}\x1b[?25h`;
            this.cursorRow = row;
        }
        this.output.write(output);
    }

    /** Finishes the block: leaves the final lines in scrollback and moves below them. */
    public finish(lines?: readonly string[]): void {
        if (lines) this.render(lines);
        const down = this.renderedLines - 1 - this.cursorRow;
        this.output.write(`${down > 0 ? `\x1b[${down}B` : ''}\r\n\x1b[?25h`);
        this.renderedLines = 0;
        this.cursorRow = 0;
    }

    /** Removes the block entirely. */
    public clear(): void {
        if (this.renderedLines > 0) this.output.write(`${this.cursorRow > 0 ? `\x1b[${this.cursorRow}A` : ''}\r\x1b[0J\x1b[?25h`);
        this.renderedLines = 0;
        this.cursorRow = 0;
    }
}

/**
 * Full-screen renderer on the alternate screen with line-level diffing (no flicker, no scrollback flooding).
 *
 * @private terminal screen
 */
export class FullScreen {
    private previous: string[] = [];
    private active = false;

    public constructor(private readonly output: NodeJS.WriteStream = process.stdout) {}

    /** Enters the alternate screen. */
    public enter(): void {
        if (this.active) return;
        this.active = true;
        this.output.write('\x1b[?1049h\x1b[?25l\x1b[2J\x1b[H');
        this.previous = [];
    }

    /** Leaves the alternate screen and restores the cursor. */
    public leave(): void {
        if (!this.active) return;
        this.active = false;
        this.output.write('\x1b[?25h\x1b[?1049l');
    }

    /** Forces a full repaint on the next render (after resize). */
    public invalidate(): void {
        this.previous = [];
        if (this.active) this.output.write('\x1b[2J');
    }

    /** Draws a frame, rewriting only changed lines. */
    public draw(lines: readonly string[], cursor?: { row: number; column: number }): void {
        if (!this.active) return;
        const height = Math.max(5, this.output.rows || 24);
        const width = Math.max(20, this.output.columns || 80);
        const frame = lines.slice(0, height).map((line) => truncate(terminalSafe(line), width));
        let output = '\x1b[?25l';
        for (let row = 0; row < height; row++) {
            const line = frame[row] ?? '';
            if (this.previous[row] === line) continue;
            output += `\x1b[${row + 1};1H\x1b[2K${line}`;
        }
        this.previous = [...frame];
        while (this.previous.length < height) this.previous.push('');
        if (cursor) output += `\x1b[${cursor.row + 1};${cursor.column + 1}H\x1b[?25h`;
        this.output.write(output);
    }
}

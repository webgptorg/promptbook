import { terminalSafe, truncate } from './ansi.js';
import type { ImageOverlay } from './terminal-images.js';

/** Invocation-scoped project control displayed by every nested screen and protected prompt. */
let projectFooter: (() => string) | undefined;

/** Active renderers refresh only presentation when the shared project control changes. */
const FOOTER_RENDERERS = new Set<() => void>();

/** Repaints the shared control even while a protected form owns input. @private terminal screen */
export function refreshProjectFooter(): void { for (const render of FOOTER_RENDERERS) render(); }

/** Number of frame rows reserved by the invocation's shared control. @private terminal screen */
export function projectFooterRows(): number { return projectFooter ? 1 : 0; }

/** Installs the shared project control without teaching individual forms its handlers. @private terminal screen */
export function setProjectFooter(footer: () => string): () => void {
    const previous = projectFooter;
    projectFooter = footer;
    return () => { projectFooter = previous; };
}

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
    /** The block's row within the block at the latest position question. */
    private askedAt?: number;
    /** The block's first row on the screen (0-based), known once the terminal has answered. */
    private top?: number;
    private latest?: { readonly lines: readonly string[]; readonly cursor?: { row: number; column: number } };
    private readonly refreshFooter = (): void => { if (this.latest) this.render(this.latest.lines, this.latest.cursor); };

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
        this.latest = { lines, cursor };
        FOOTER_RENDERERS.add(this.refreshFooter);
        const width = this.width();
        const footer = projectFooter?.();
        const fitted = [...lines.slice(0, Math.max(1, this.height() - (footer ? 2 : 1))), ...(footer ? [footer] : [])].map((line) => truncate(terminalSafe(line), width - 1));
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

    /**
     * Asks the terminal where the block now stands: an inline block moves with what was printed before it and scrolls
     * at the bottom of the screen. The answer arrives on stdin, for `located`.
     */
    public locate(): void {
        this.askedAt = this.cursorRow;
        this.output.write('\x1b[6n');
    }

    /**
     * Takes the terminal's answer (1-based row). Answers come in order, so the one to the latest question settles it,
     * also after a late answer to the previous prompt.
     */
    public located(row: number): void {
        if (this.askedAt !== undefined) this.top = row - 1 - this.askedAt;
    }

    /** The row of the block at a screen row (0-based), if the block is there. */
    public rowAt(screenRow: number): number | undefined {
        if (this.top === undefined) return undefined;
        const row = screenRow - this.top;
        return row >= 0 && row < this.renderedLines ? row : undefined;
    }

    /** Finishes the block: leaves the final lines in scrollback and moves below them. */
    public finish(lines?: readonly string[]): void {
        if (lines) this.render(lines);
        this.latest = undefined;
        FOOTER_RENDERERS.delete(this.refreshFooter);
        const down = this.renderedLines - 1 - this.cursorRow;
        this.output.write(`${down > 0 ? `\x1b[${down}B` : ''}\r\n\x1b[?25h`);
        this.renderedLines = 0;
        this.cursorRow = 0;
    }

    /** Removes the block entirely. */
    public clear(): void {
        this.latest = undefined;
        FOOTER_RENDERERS.delete(this.refreshFooter);
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
    /**
     * The latest frame not written yet because the terminal is applying back-pressure (hidden, minimized, throttled or
     * slow): only the newest one is kept, obsolete frames are discarded, and it is written once the output drains.
     */
    private pending?: { readonly lines: readonly string[]; readonly cursor?: { row: number; column: number }; readonly image?: ImageOverlay; readonly displayed?: () => void };
    private waitingForDrain = false;
    /** The image currently shown over the frame, which is sent once and again only after its area was repainted. */
    private shownImage?: ImageOverlay;
    private latest?: { readonly lines: readonly string[]; readonly cursor?: { row: number; column: number }; readonly image?: ImageOverlay };
    private readonly refreshFooter = (): void => { if (this.latest && !this.backpressured) this.draw(this.latest.lines, this.latest.cursor, this.latest.image); };

    public constructor(private readonly output: NodeJS.WriteStream = process.stdout) {}

    /** Whether the output currently refuses more data (a stream without the signal never blocks). */
    private get backpressured(): boolean {
        return this.waitingForDrain || this.output.writableNeedDrain === true;
    }

    /** Writes the newest pending frame once the output drained (never a backlog of missed screens). */
    private awaitDrain(): void {
        if (this.waitingForDrain || typeof this.output.once !== 'function') return;
        this.waitingForDrain = true;
        this.output.once('drain', () => {
            this.waitingForDrain = false;
            const pending = this.pending;
            this.pending = undefined;
            if (pending) this.draw(pending.lines, pending.cursor, pending.image, pending.displayed);
        });
    }

    /** Enters the alternate screen. */
    public enter(): void {
        if (this.active) return;
        this.active = true;
        FOOTER_RENDERERS.add(this.refreshFooter);
        this.output.write('\x1b[?1049h\x1b[?25l\x1b[2J\x1b[H');
        this.previous = [];
        this.shownImage = undefined;
    }

    /** Leaves the alternate screen and restores the cursor. */
    public leave(): void {
        if (!this.active) return;
        this.active = false;
        this.latest = undefined;
        FOOTER_RENDERERS.delete(this.refreshFooter);
        this.pending = undefined;
        this.output.write(`${this.shownImage?.clear ?? ''}\x1b[?25h\x1b[?1049l`);
        this.shownImage = undefined;
    }

    /** Forces a full repaint on the next render (after resize). */
    public invalidate(): void {
        this.previous = [];
        if (this.active) this.output.write(`${this.shownImage?.clear ?? ''}\x1b[2J`);
        this.shownImage = undefined;
    }

    /**
     * Draws a frame, rewriting only changed lines. While the terminal applies back-pressure the frame only replaces the
     * pending one; after the drain the latest frame is rendered at the then-current size. Presentation never blocks
     * the caller, and real events stay in the engine's state, not in discarded frames.
     */
    public draw(lines: readonly string[], cursor?: { row: number; column: number }, image?: ImageOverlay, displayed?: () => void): void {
        if (!this.active) return;
        this.latest = { lines, cursor, image };
        if (this.backpressured) {
            this.pending = { lines, cursor, image, displayed };
            this.awaitDrain();
            return;
        }
        // A replaced or removed image goes with one full repaint: blank cells of the next frame would not erase it.
        if (this.shownImage && this.shownImage.key !== image?.key) this.invalidate();
        const height = Math.max(5, this.output.rows || 24);
        const width = Math.max(20, this.output.columns || 80);
        const footer = projectFooter?.();
        const frame = lines.slice(0, height - (footer ? 1 : 0)).map((line) => truncate(terminalSafe(line), width));
        if (footer) {
            while (frame.length < height - 1) frame.push('');
            frame.push(truncate(terminalSafe(footer), width));
        }
        let output = '\x1b[?25l';
        let imageErased = !this.shownImage;
        for (let row = 0; row < height; row++) {
            const line = frame[row] ?? '';
            if (this.previous[row] === line) continue;
            output += `\x1b[${row + 1};1H\x1b[2K${line}`;
            if (image && row >= image.row && row < image.row + image.rows) imageErased = true;
        }
        this.previous = [...frame];
        while (this.previous.length < height) this.previous.push('');
        if (image && imageErased) output += `${image.clear ?? ''}\x1b[${image.row + 1};${image.column + 1}H${image.sequence}`;
        this.shownImage = image;
        if (cursor) output += `\x1b[${cursor.row + 1};${cursor.column + 1}H\x1b[?25h`;
        if (this.output.write(output) === false) {
            if (displayed) this.output.once('drain', () => { if (this.active) displayed(); });
            this.awaitDrain();
        } else displayed?.();
    }
}

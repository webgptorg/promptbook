import type { string_book } from './string_book';

/**
 * Helper for manipulating agent books in-memory.
 *
 * @private internal helper for `@promptbook/core`
 */
export class BookEditable {
    private readonly lines: string[];

    /**
     * Creates a mutable view over the supplied book content.
     *
     * @param book - Agent source text to work with.
     */
    constructor(book: string_book) {
        this.lines = book.split(/\r?\n/);
    }

    /**
     * Creates a new instance from the supplied book text.
     *
     * @param book - Agent source text to work with.
     * @returns Editable view over the book content.
     */
    public static from(book: string_book): BookEditable {
        return new BookEditable(book);
    }

    /**
     * Returns the editable content as a string_book.
     *
     * @returns Current book content with original line breaks preserved.
     */
    public toString(): string_book {
        return this.lines.join('\n') as string_book;
    }

    /**
     * Checks whether the book contains any non-empty lines.
     *
     * @returns `true` when the book has meaningful content beyond blank lines.
     */
    public hasNonEmptyContent(): boolean {
        return this.lines.some((line) => line.trim() !== '');
    }

    /**
     * Finds the last line index whose trimmed text matches the commitment name.
     *
     * @param commitment - Commitment keyword to locate (for example `CLOSED`).
     * @returns Zero-based line index or `null` when the commitment is absent.
     */
    public findLastCommitmentLineIndex(commitment: string): number | null {
        const normalized = commitment.trim().toUpperCase();

        for (let lineIndex = this.lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
            const line = this.lines[lineIndex];
            if (line?.trim().toUpperCase() === normalized) {
                return lineIndex;
            }
        }

        return null;
    }
}

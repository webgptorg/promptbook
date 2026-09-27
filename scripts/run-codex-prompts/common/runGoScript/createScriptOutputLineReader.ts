/**
 * Turns the arbitrarily chopped chunks of one shell output stream into completed lines.
 *
 * @private internal type of the script runners
 */
export type ScriptOutputLineReader = {
    /**
     * Returns every line which the given chunk has completed, keeping the unterminated rest for the next chunk.
     */
    readCompletedLines(chunk: string): readonly string[];
    /** Reads the pending fragment without treating it as a complete protocol record. */
    getPendingLine(): string;
    /** Drains a final unterminated line when a presentation capture ends. */
    flush(): string;
};

/**
 * Creates a line reader for one shell output stream.
 *
 * A chunk boundary can fall into the middle of a line, so the unterminated rest is remembered until the next chunk
 * completes it. Every observer of the live output therefore sees whole lines only, exactly as the finished output
 * would contain them. One reader belongs to one stream, because interleaving `stdout` and `stderr` into a single
 * buffer would splice two unrelated halves into one nonexistent line.
 *
 * @private internal utility of the script runners
 */
export function createScriptOutputLineReader(): ScriptOutputLineReader {
    let unterminatedLine = '';

    return {
        readCompletedLines(chunk: string): readonly string[] {
            const lines = `${unterminatedLine}${chunk}`.split(/\r?\n/);
            unterminatedLine = lines.pop() ?? '';

            return lines;
        },
        getPendingLine: () => unterminatedLine,
        flush(): string {
            const line = unterminatedLine;
            unterminatedLine = '';
            return line;
        },
    };
}

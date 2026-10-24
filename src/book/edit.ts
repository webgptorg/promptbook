import { parseBook } from './parse.js';

/**
 * Joins lines with the source's newline style and guarantees exactly one trailing newline.
 */
function joinLines(lines: readonly string[], newline: string): string {
    const result = [...lines];
    while (result.length && result[result.length - 1]!.trim() === '') result.pop();
    return result.join(newline) + newline;
}

/**
 * Formats one commitment line.
 */
function commitmentLine(keyword: string, value: string): string {
    return value ? `${keyword} ${value}` : keyword;
}

/**
 * Appends a commitment line at the end of a Book, preserving everything else.
 *
 * @private Book language
 */
export function appendCommitment(source: string, keyword: string, value: string): string {
    const document = parseBook(source);
    const lines = [...document.lines];
    while (lines.length && lines[lines.length - 1]!.trim() === '') lines.pop();
    const last = lines[lines.length - 1] ?? '';
    const lastIsCommitment = document.commitments.some((commitment) => commitment.startLine === lines.length - 1);
    if (lines.length && !lastIsCommitment && last.trim() !== '') lines.push('');
    lines.push(commitmentLine(keyword, value));
    return joinLines(lines, document.newline);
}

/**
 * Sets a single-value control commitment: replaces the keyword line of its first occurrence (keeping continuation
 * text) or appends it when absent.
 *
 * @private Book language
 */
export function setControlCommitment(source: string, keyword: string, value: string): string {
    const document = parseBook(source);
    const existing = document.commitments.find((commitment) => commitment.keyword === keyword);
    if (!existing) return appendCommitment(source, keyword, value);
    const lines = [...document.lines];
    lines[existing.startLine] = commitmentLine(existing.written === keyword ? keyword : existing.written, value);
    return joinLines(lines, document.newline);
}


/**
 * Replaces every commitment with one of the keywords (including continuation lines) by new lines, written where the
 * first of them stood, otherwise after the first `after` commitment, otherwise at the end. Everything else is kept.
 *
 * @private Book language
 */
export function replaceCommitments(source: string, keywords: readonly string[], replacement: readonly string[], options: { readonly after?: string } = {}): string {
    const document = parseBook(source);
    const removed = document.commitments.filter((commitment) => keywords.includes(commitment.keyword));
    const lines = [...document.lines];
    if (!removed.length) {
        const anchor = options.after ? document.commitments.find((commitment) => commitment.keyword === options.after) : undefined;
        if (!anchor) return replacement.reduce((text, line) => appendLine(text, line), source);
        // Directly after the anchor's own lines (its trailing blank lines stay after the insertion).
        let end = anchor.endLine;
        while (end > anchor.startLine + 1 && lines[end - 1]!.trim() === '') end--;
        lines.splice(end, 0, ...replacement);
        return joinLines(lines, document.newline);
    }
    const insertAt = removed[0]!.startLine;
    // Remove from the end so earlier indexes stay valid; trailing blank lines of a removed block are kept.
    for (const commitment of [...removed].reverse()) {
        let end = commitment.endLine;
        while (end > commitment.startLine + 1 && lines[end - 1]!.trim() === '') end--;
        lines.splice(commitment.startLine, end - commitment.startLine);
    }
    const shift = removed.filter((commitment) => commitment.startLine < insertAt).length;
    lines.splice(insertAt - shift, 0, ...replacement);
    return joinLines(lines, document.newline);
}

/**
 * Appends one raw line as a commitment line at the end of a Book.
 */
function appendLine(source: string, line: string): string {
    const [keyword, ...rest] = line.split(' ');
    return appendCommitment(source, keyword!, rest.join(' '));
}

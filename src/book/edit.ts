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


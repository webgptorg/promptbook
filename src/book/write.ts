import { matchCommitmentKeyword } from './commitments.js';
import { fenceMarker, parseBook, type EntityKind } from './parse.js';

/**
 * Declaration keyword of each entity kind.
 *
 * @private Book language
 */
export const DECLARATION_KEYWORD: Readonly<Record<EntityKind, 'AGENT' | 'TASK' | 'CHAT'>> = { agent: 'AGENT', task: 'TASK', chat: 'CHAT' };

/**
 * Whether a content line must be escaped (leading backslash) so it stays literal: it would start a commitment, begin
 * a fence or already starts with the escape character.
 *
 * @private Book language
 */
export function needsLiteralEscape(line: string): boolean {
    return line.startsWith('\\') || fenceMarker(line) !== undefined || matchCommitmentKeyword(line) !== undefined;
}

/**
 * Escapes arbitrary text as commitment continuation lines (lossless: the parser removes exactly one backslash).
 *
 * @private Book language
 */
export function literalLines(text: string): string[] {
    return text
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => (needsLiteralEscape(line) ? `\\${line}` : line));
}

/**
 * Renders one commitment with arbitrary multi-line content: the first line stays on the keyword line when it cannot
 * be mistaken for part of the keyword, everything else is escaped literal continuation.
 *
 * @private Book language
 */
export function renderCommitment(keyword: string, content: string): string[] {
    const text = content.replace(/\r\n?/g, '\n').trim();
    if (!text) return [keyword];
    const [first, ...rest] = text.split('\n');
    const inline = `${keyword} ${first!.trim()}`;
    const fitsInline = !first!.startsWith('\\') && fenceMarker(first!) === undefined && matchCommitmentKeyword(inline)?.definition.keyword === keyword;
    if (!fitsInline) return [keyword, ...literalLines(text)];
    return rest.length ? [inline, ...literalLines(rest.join('\n'))] : [inline];
}

/**
 * Representable single-line spelling of a declared name.
 *
 * Whitespace collapses to single spaces; an all-uppercase first word (which would join the keyword under the boundary
 * rule) is recased (`API cleanup` → `Api cleanup`, `A plan` → `a plan`), which keeps the normalized identity.
 *
 * @private Book language
 */
export function declarationName(name: string): string {
    const single = name.replace(/\s+/g, ' ').trim();
    const [first = '', ...rest] = single.split(' ');
    if (!/^\p{Lu}[\p{Lu}\p{M}]*$/u.test(first)) return single;
    const recased = first.length > 1 ? `${first[0]}${first.slice(1).toLowerCase()}` : first.toLowerCase();
    return [recased, ...rest].join(' ');
}

/**
 * Renders the opening declaration of a Book (`AGENT <name>`, `TASK <name>`, `CHAT <name>`).
 *
 * @private Book language
 */
export function renderDeclaration(kind: EntityKind, name: string): string {
    const line = `${DECLARATION_KEYWORD[kind]} ${declarationName(name)}`;
    const document = parseBook(line);
    if (document.kind !== kind) throw new Error(`Cannot declare "${name}" as a ${kind}: ${document.diagnostics.map((diagnostic) => diagnostic.message).join(' ')}`);
    return line;
}

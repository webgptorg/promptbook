/**
 * Engine-supplied system agents.
 *
 * @private Book language
 */
export type SystemAgentName = 'Void' | 'User' | 'Expert';

/**
 * Normalized spellings of every system agent (Void has the aliases Null and `0`).
 */
const SYSTEM_AGENT_BY_NORMALIZED: ReadonlyMap<string, SystemAgentName> = new Map([
    ['void', 'Void'],
    ['null', 'Void'],
    ['0', 'Void'],
    ['user', 'User'],
    ['expert', 'Expert'],
]);

/**
 * Normalizes an agent name or reference for comparison.
 *
 * Case, diacritics and word separators (whitespace, underscores, hyphens) are ignored; the original spelling is
 * preserved elsewhere for display.
 *
 * @private Book language
 */
export function normalizeAgentName(name: string): string {
    return name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[\s_\-‐-―]+/g, '');
}

/**
 * Resolves a normalized name to a system agent, if reserved.
 *
 * @private Book language
 */
export function systemAgentOf(normalized: string): SystemAgentName | undefined {
    return SYSTEM_AGENT_BY_NORMALIZED.get(normalized);
}

/**
 * A parsed agent reference.
 *
 * @private Book language
 */
export type AgentReference = {
    /** Exact source text, e.g. `@Developer` or `{Frontend Developer}`. */
    readonly raw: string;
    /** Name without reference syntax, e.g. `Frontend Developer`. */
    readonly name: string;
    /** Normalized comparison key. */
    readonly normalized: string;
    /** Offset in the scanned text. */
    readonly index: number;
    /** Written with the active `+` action prefix in a valid position (`+@Name`, `+{Name}`); the plus is never part of the name. */
    readonly active?: boolean;
};

/**
 * Characters ending an unbraced `@` reference (besides whitespace).
 */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>"'`]+$/;

/**
 * Explains why a value is not a valid reference; a double-brace `{{Name}}` is pointed to the single-brace `{Name}`.
 *
 * @private Book language
 */
export function invalidReferenceMessage(value: string): string {
    const doubleBraced = /^\{\{([^{}\n]*)\}\}$/.exec(value.trim());
    return `"${value.trim()}" is not a valid reference.${doubleBraced ? ` References use single braces: {${doubleBraced[1]!.trim()}}.` : ''}`;
}

/**
 * Parses a single dedicated reference field value (`@Name`, `{Name}` or a bare name, as in `FROM Adam`).
 *
 * Returns `undefined` for an empty or malformed value, including the double-brace `{{Name}}`.
 *
 * @private Book language
 */
export function parseReferenceValue(value: string): AgentReference | undefined {
    const text = value.trim();
    if (!text) return undefined;
    let name: string;
    if (text.startsWith('{')) {
        const end = text.indexOf('}');
        if (end < 0) return undefined;
        name = text.slice(1, end).trim();
        if (/[{}]/.test(name) || text.slice(end + 1).trim()) return undefined;
    } else if (text.startsWith('@')) {
        name = text.slice(1).replace(TRAILING_PUNCTUATION, '');
        if (/\s/.test(name)) return undefined;
    } else {
        name = text;
    }
    const normalized = normalizeAgentName(name);
    if (!normalized) return undefined;
    return { raw: text, name, normalized, index: 0 };
}

/**
 * Whether the `+` before a reference can start an action: at the message start or after whitespace or opening
 * punctuation. A preceding identifier, digit or escape leaves the reference passive (`x+@Adam`, `\\+@Adam`).
 */
function isActionBoundary(previous: string | undefined): boolean {
    return previous === undefined || previous === '' || /[\s([<«‹]/.test(previous);
}

/**
 * Finds references (`@Token` and `{Name}`) in natural text, skipping fenced/inline code, email addresses and
 * double-brace `{{…}}` text. A `+` action prefix is reported on the same passive reference, never in its name.
 *
 * @private Book language
 */
export function findAgentReferences(text: string): AgentReference[] {
    const references: AgentReference[] = [];
    const masked = maskCode(text);
    const pattern = /\{([^{}\n]{1,240})\}|@([^\s@{}()[\]<>,;:!?"'`]+)/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(masked)) !== null) {
        const index = match.index;
        const previous = index > 0 ? masked[index - 1]! : '';
        const active = previous === '+' && isActionBoundary(index > 1 ? masked[index - 2] : undefined);
        if (match[2] !== undefined) {
            if (/[A-Za-z0-9._%+-]/.test(previous) && !active) continue; // e-mail address or similar
            const name = match[2].replace(TRAILING_PUNCTUATION, '');
            const normalized = normalizeAgentName(name);
            if (!normalized) continue;
            references.push({ raw: `@${name}`, name, normalized, index, ...(active ? { active } : {}) });
        } else {
            const name = match[1]!.trim();
            // Double braces (`{{…}}`, `${{ … }}`) are template text, not a reference.
            if (previous === '{' || masked[index + match[0].length] === '}') continue;
            // Braces around code-like or template content are not references.
            if (!name || /[=$%#|\\/]/.test(name) || /^\d+(,\d*)?$/.test(name)) continue;
            const normalized = normalizeAgentName(name);
            if (!normalized) continue;
            references.push({ raw: match[0], name, normalized, index, ...(active ? { active } : {}) });
        }
    }
    return references;
}

/**
 * Words that introduce an illustrative example of the syntax rather than an action.
 */
const EXAMPLE_LEAD_IN = /(?:\be\.g\.|\bi\.e\.|\bfor example|\bfor instance|\bsuch as|\bsyntax|\bnapříklad|\bnapř\.)[:,]?\s*$/i;

/**
 * Replaces quoted passages (Markdown block quotes and double-quoted spans) with spaces, keeping every offset.
 */
function maskQuoted(text: string): string {
    return text
        .split('\n')
        .map((line) => (/^\s{0,3}>/.test(line) ? ' '.repeat(line.length) : line.replace(/"[^"]*"|“[^”]*”|„[^“”]*[“”]|«[^»]*»/g, (quoted) => ' '.repeat(quoted.length))))
        .join('\n');
}

/**
 * Finds the explicit invitations and addresses of a newly accepted chat message (`+@Name`, `+{Full Name}`), once per
 * target in written order. Code, quoted passages, escaped forms and illustrative examples are never actions.
 *
 * @private Book language
 */
export function findActiveReferences(text: string): AgentReference[] {
    const masked = maskQuoted(maskCode(text));
    const seen = new Set<string>();
    return findAgentReferences(masked).filter((reference) => {
        if (!reference.active || seen.has(reference.normalized)) return false;
        const lineStart = masked.lastIndexOf('\n', reference.index) + 1;
        if (EXAMPLE_LEAD_IN.test(masked.slice(lineStart, reference.index - 1))) return false;
        seen.add(reference.normalized);
        return true;
    });
}

/**
 * Whether newly accepted chat text explicitly invites or pings the human with the active `+@User` / `+{User}` prefix.
 * A plain `@User`/`{User}` stays a passive mention, and code, quotes, escapes and examples never ping.
 *
 * @private Book language
 */
export function pingsUser(text: string): boolean {
    return findActiveReferences(text).some((reference) => reference.normalized === 'user');
}

/**
 * A structured human question written as the canonical active User ping: unchanged when it already pings, otherwise
 * prefixed with `+@User` (on a line of its own before text that starts with Markdown structure, so the structure stays).
 *
 * @private Book language
 */
export function withUserPing(text: string): string {
    if (pingsUser(text)) return text;
    const body = text.replace(/^\s*\n/, '');
    return /^\s*(?:`{3,}|~{3,}|>|#|[-*+]\s|\d+[.)]\s|\\)/.test(body) ? `+@User\n${body}` : `+@User ${body.trimStart()}`;
}

/**
 * The text of a question without the canonical `+@User` prefix that {@link withUserPing} adds (for recognizing the
 * same question asked before the prefix existed).
 *
 * @private Book language
 */
export function withoutUserPing(text: string): string {
    return text.replace(/^\+(?:@User\b|\{\s*User\s*\})[ \t]*\n?/i, '');
}

/**
 * Replaces fenced blocks and inline code spans with spaces so their content is never interpreted.
 *
 * @private Book language
 */
export function maskCode(text: string): string {
    let result = '';
    let fence: string | undefined;
    for (const line of text.split('\n')) {
        const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
        if (fence) {
            if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
            result += `${' '.repeat(line.length)}\n`;
            continue;
        }
        if (marker) {
            fence = marker;
            result += `${' '.repeat(line.length)}\n`;
            continue;
        }
        result += `${line.replace(/`[^`\n]*`/g, (code) => ' '.repeat(code.length))}\n`;
    }
    return result.slice(0, text.length);
}

/**
 * Formats a name as a reference (`@Name` for a single word, `{Name}` otherwise).
 *
 * @private Book language
 */
export function formatAgentReference(name: string): string {
    return /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(name) && !/[-_]$/.test(name) ? `@${name}` : `{${name}}`;
}

/**
 * Keeps a written reference (`@Name`, `{Name}`) as it is and formats a bare name as one.
 *
 * @private Book language
 */
export function toReference(value: string): string {
    return value.startsWith('@') || value.startsWith('{') ? value : formatAgentReference(value);
}

/**
 * The plain name of a reference (`@Developer`, `{Frontend Developer}` or a bare name).
 *
 * @private Book language
 */
export function referenceName(value: string): string {
    return parseReferenceValue(value)?.name ?? value.trim();
}

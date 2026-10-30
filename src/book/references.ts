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
 * Finds references (`@Token` and `{Name}`) in natural text, skipping fenced/inline code, email addresses and
 * double-brace `{{…}}` text.
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
        if (match[2] !== undefined) {
            if (/[A-Za-z0-9._%+-]/.test(previous)) continue; // e-mail address or similar
            const name = match[2].replace(TRAILING_PUNCTUATION, '');
            const normalized = normalizeAgentName(name);
            if (!normalized) continue;
            references.push({ raw: `@${name}`, name, normalized, index });
        } else {
            const name = match[1]!.trim();
            // Double braces (`{{…}}`, `${{ … }}`) are template text, not a reference.
            if (previous === '{' || masked[index + match[0].length] === '}') continue;
            // Braces around code-like or template content are not references.
            if (!name || /[=$%#|\\/]/.test(name) || /^\d+(,\d*)?$/.test(name)) continue;
            const normalized = normalizeAgentName(name);
            if (!normalized) continue;
            references.push({ raw: match[0], name, normalized, index });
        }
    }
    return references;
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

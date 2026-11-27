/** Built-in VS Code grammar suffixes and language IDs for tagged templates. */
export const templateHosts = { js: 'javascript', 'js.jsx': 'javascriptreact', ts: 'typescript', tsx: 'typescriptreact' };

/** Book references outside literal text, shared by standalone and embedded Books. */
const reference = { name: 'variable.other.reference.book', match: "(?<![A-Za-z0-9._%+@-])@[^\\s@{}()\\[\\]<>,;:!?\"'`]+|(?<!\\{)\\{[^{}\\n]+\\}(?!\\})" };

/** Build both forms from the engine's complete commitment vocabulary and uppercase-word boundary. */
function commitmentRules(keywords, embedded) {
    const alternatives = [...keywords].sort((a, b) => b.length - a.length || a.localeCompare(b))
        .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll(' ', '[ \\t]+')).join('|');
    const boundary = embedded ? '(?=[ \\t`]|\\$\\{|$)' : '(?=[ \\t]|$)';
    const known = `(?:${alternatives})(?![ \\t]+\\p{Lu}[\\p{Lu}\\p{M}]*${boundary})${boundary}`;
    const unknown = `(?=(?:[ \\t]*[\\p{Lu}\\p{M}]){3})\\p{Lu}[\\p{Lu}\\p{M}]*(?:[ \\t]+\\p{Lu}[\\p{Lu}\\p{M}]*)*${boundary}`;
    const start = embedded ? '\\G' : '^';
    return [
        { name: 'keyword.control.commitment.book', match: `${start}\\x{FEFF}?${known}` },
        { name: 'invalid.illegal.unknown-commitment.book', match: `${start}\\x{FEFF}?${unknown}` },
    ];
}

/** Offline TextMate fallback for .book files. */
export function bookGrammar(keywords) {
    return {
        name: 'Book', scopeName: 'text.book', patterns: [
            { name: 'markup.raw.block.book', begin: '^\\s{0,3}(`{3,})(.*)$', end: '^\\s{0,3}\\1`*[ \\t]*$' },
            { name: 'markup.raw.block.book', begin: '^\\s{0,3}(~{3,})(.*)$', end: '^\\s{0,3}\\1~*[ \\t]*$' },
            { name: 'string.quoted.literal.book', match: '^\\\\.*$' },
            ...commitmentRules(keywords, false),
            { name: 'markup.inline.raw.book', begin: '(`+)', end: '\\1' },
            reference,
            { include: 'text.html.markdown' },
        ],
    };
}

/** Keep the host in charge of template boundaries, escaping and all code inside substitutions. */
export function bookTemplateGrammar(host, keywords) {
    const scope = `source.${host}`;
    const hostPatterns = [
        { include: `${scope}#template-substitution-element` },
        { include: `${scope}#string-character-escape` },
    ];
    const expression = `meta.embedded.line.${host}`;
    const fences = ['~', '\\\\`'].map((marker) => ({
        name: 'markup.raw.block.book',
        begin: `\\G((?:${marker}){3,})`,
        end: `^[ \\t]*\\1(?:${marker})*[ \\t]*(?=\\x60|$)|(?=\\x60)`,
        patterns: hostPatterns,
    }));
    // A JS delimiter must also close an unfinished Book literal. Markdown runs are limited to static text.
    return {
        scopeName: `book.template.${host}`,
        injectionSelector: [
            `L:${scope} -comment -string -meta.embedded.block.book`,
            `L:${expression} - (${expression} comment) - (${expression} string) - (${expression} meta.embedded.block.book)`,
        ].join(', '),
        repository: {
            prose: { patterns: [reference, { include: 'text.html.markdown#inline' }] },
            line: { patterns: [
                ...fences,
                { name: 'string.quoted.literal.book', begin: '\\G\\\\\\\\', end: '(?=`|$)', patterns: hostPatterns },
                { name: 'markup.inline.raw.book', begin: '((?:\\\\`)+)', end: '\\1|(?=`)', patterns: hostPatterns },
                ...hostPatterns,
                ...commitmentRules(keywords, true),
                { match: '(?:[^`\\\\$\\r\\n]|\\$(?!\\{))+', captures: { 0: { patterns: [{ include: '#prose' }] } } },
                // TextMate discovers grammar dependencies through includes outside of capture rules.
                { include: '#prose' },
            ] },
        },
        patterns: [{
            begin: '(?<![_$[:alnum:]])(book)[ \\t]*(`)',
            beginCaptures: { 1: { name: `entity.name.function.tagged-template.${host}` }, 2: { name: `punctuation.definition.string.template.begin.${host}` } },
            end: '`', endCaptures: { 0: { name: `punctuation.definition.string.template.end.${host}` } },
            contentName: 'meta.embedded.block.book',
            patterns: [
                // Only commitments at the literal's left margin are active. Deeper lines remain content.
                { begin: '^([ \\t]*)(?=[^ \\t`\\r\\n])', end: '(?=`)|^(?!\\G)(?!\\1[ \\t])(?=[ \\t]*[^ \\t\\r\\n])', patterns: [{ include: '#line' }] },
                { include: '#line' },
            ],
        }],
    };
}

/**
 * The thin Monaco adapter of Promptbook's shared Book language services (`src/book/editor-language.ts`, also used by the
 * VS Code extension). The services work on UTF-16 offsets or line/character spans of the original text; this adapter only
 * converts them to Monaco's 1-based line numbers and columns and registers the providers. It never parses Books itself.
 *
 * The pure conversion functions are exported separately so tests can compare them with the VS Code adapter without
 * loading Monaco.
 */

/** Monaco's 1-based position of a UTF-16 offset of the text (CRLF counts both characters, as in both editors' models). */
export function positionAt(text, offset) {
    const lines = text.slice(0, offset).split('\n');
    return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 };
}

/** Monaco range of an offset range. */
export function rangeOf(text, start, end) {
    const from = positionAt(text, start);
    const to = positionAt(text, end);
    return { startLineNumber: from.lineNumber, startColumn: from.column, endLineNumber: to.lineNumber, endColumn: to.column };
}

/** Line texts without their line terminator (a CR of CRLF is not part of the line, as in Monaco). */
function lineTexts(text) {
    return text.split('\n').map((line) => line.replace(/\r$/, ''));
}

/** Shared highlight spans as Monaco ranges with their Book token kind (clipped to each line's visible text). */
export function tokenRanges(language, text) {
    const lines = lineTexts(text);
    return language.highlightBook(text).flatMap((span) => {
        const length = (lines[span.line] ?? '').length;
        const start = Math.min(span.start, length);
        const end = Math.min(span.end, length);
        return end > start ? [{ kind: span.kind, startLineNumber: span.line + 1, startColumn: start + 1, endLineNumber: span.line + 1, endColumn: end + 1 }] : [];
    });
}

/** Engine syntax and MODEL diagnostics as Monaco markers on their whole (1-based) line. */
export function diagnosticMarkers(language, text) {
    const lines = lineTexts(text);
    return language.analyze(text).diagnostics.map((problem) => {
        const index = Math.max(0, Math.min(lines.length - 1, problem.line - 1));
        return { severity: problem.severity === 'error' ? 'error' : 'warning', message: problem.message, source: 'Book', startLineNumber: index + 1, startColumn: 1, endLineNumber: index + 1, endColumn: lines[index].length + 1 };
    });
}

/** The complete references of the text as Monaco ranges with their normalized name. */
export function referenceRanges(language, text) {
    return language.referencesIn(text).map((reference) => ({ name: reference.name, normalized: reference.normalized, raw: reference.raw, ...rangeOf(text, reference.index, reference.index + reference.raw.length) }));
}

/** Commitment completions at a Monaco position, replacing the typed column-zero prefix. */
export function completionItems(language, text, lineNumber, column) {
    const line = lineTexts(text)[lineNumber - 1] ?? '';
    const start = lineNumber === 1 && line.startsWith('﻿') ? 2 : 1;
    return language.keywordCompletions(text, lineNumber - 1, column - 1).map(({ keyword, definition }) => ({
        label: keyword, detail: definition.description, insertText: `${keyword} `,
        range: { startLineNumber: lineNumber, startColumn: start, endLineNumber: lineNumber, endColumn: column },
    }));
}

/** Occurrences of the reference (or local declaration) at an offset, as Monaco ranges. */
export function occurrenceRanges(language, text, offset) {
    return language.referenceHighlights(text, offset).map((item) => ({ declaration: item.declaration, ...rangeOf(text, item.index, item.index + item.raw.length) }));
}

/** The reference under an offset with its Monaco range, or undefined (punctuation, code and escapes never link). */
export function referenceAtOffset(language, text, offset) {
    const reference = language.referenceAt(text, offset);
    return reference && { name: reference.name, normalized: reference.normalized, ...rangeOf(text, reference.index, reference.index + reference.raw.length) };
}

/** Folding regions of multi-line commitments (1-based, inclusive), as in the VS Code adapter. */
export function foldingRegions(language, text) {
    return language.parseBook(text).commitments.filter((item) => item.endLine > item.startLine + 1).map((item) => ({ start: item.startLine + 1, end: item.endLine }));
}

/** The URI scheme of a resolved Book reference handed to the workspace (never a file path the page could forge). */
export const REFERENCE_SCHEME = 'ptbk-reference';

/**
 * Registers the `book` language with Monaco. `hooks.openReference(name)` opens the referenced Book through the desktop
 * workspace (Ctrl/Cmd+click and Go to Definition). Returns a function that refreshes one model's highlighting and
 * markers, debounced like the VS Code adapter.
 */
export function registerBook(monaco, language, configuration, hooks) {
    monaco.languages.register({ id: 'book', extensions: ['.book'], aliases: ['Book'] });
    monaco.languages.setLanguageConfiguration('book', { ...configuration, wordPattern: new RegExp(configuration.wordPattern) });
    const isBook = (model) => model.getLanguageId() === 'book';
    monaco.languages.registerCompletionItemProvider('book', {
        triggerCharacters: [' '],
        provideCompletionItems(model, position) {
            return { suggestions: completionItems(language, model.getValue(), position.lineNumber, position.column).map((item) => ({ ...item, kind: monaco.languages.CompletionItemKind.Keyword })) };
        },
    });
    monaco.languages.registerHoverProvider('book', {
        provideHover(model, position) {
            const text = model.getValue();
            if (language.isLiteral(text, position.lineNumber - 1)) return;
            const line = model.getLineContent(position.lineNumber);
            const bom = line.startsWith('﻿') ? 1 : 0;
            const match = language.matchCommitmentKeyword(line.slice(bom));
            if (!match || match.definition.unknown || position.column - 1 >= match.written.length + bom) return;
            return { contents: [{ value: `\`\`\`book\n${match.definition.keyword}\n\`\`\`` }, { value: match.definition.description }] };
        },
    });
    monaco.languages.registerFoldingRangeProvider('book', {
        provideFoldingRanges(model) {
            return foldingRegions(language, model.getValue()).map((region) => ({ ...region, kind: monaco.languages.FoldingRangeKind.Region }));
        },
    });
    monaco.languages.registerDefinitionProvider('book', {
        provideDefinition(model, position) {
            const reference = referenceAtOffset(language, model.getValue(), model.getOffsetAt(position));
            if (!reference) return;
            const { name, normalized, ...range } = reference;
            return [{ uri: monaco.Uri.from({ scheme: REFERENCE_SCHEME, path: `/${encodeURIComponent(name)}` }), range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, originSelectionRange: range }];
        },
    });
    monaco.languages.registerDocumentHighlightProvider('book', {
        provideDocumentHighlights(model, position) {
            return occurrenceRanges(language, model.getValue(), model.getOffsetAt(position)).map(({ declaration, ...range }) => ({ range, kind: declaration ? monaco.languages.DocumentHighlightKind.Write : monaco.languages.DocumentHighlightKind.Read }));
        },
    });
    // Desktop navigation opens the resolved source through its workspace instead of a Monaco model.
    monaco.editor.registerEditorOpener({
        openCodeEditor(_source, resource) {
            if (resource.scheme !== REFERENCE_SCHEME) return false;
            hooks.openReference(decodeURIComponent(resource.path.slice(1)));
            return true;
        },
    });
    const collections = new WeakMap();
    const timers = new WeakMap();
    const severity = { error: monaco.MarkerSeverity.Error, warning: monaco.MarkerSeverity.Warning };
    const refresh = (model, editor) => {
        if (model.isDisposed() || !isBook(model)) return;
        const text = model.getValue();
        let collection = collections.get(editor);
        if (!collection) collections.set(editor, (collection = editor.createDecorationsCollection()));
        collection.set(tokenRanges(language, text).map(({ kind, ...range }) => ({ range, options: { inlineClassName: `ptbk-book-${kind}` } })));
        monaco.editor.setModelMarkers(model, 'book', diagnosticMarkers(language, text).map((marker) => ({ ...marker, severity: severity[marker.severity] })));
    };
    return (model, editor, immediately = false) => {
        clearTimeout(timers.get(editor));
        if (immediately) refresh(model, editor);
        else timers.set(editor, setTimeout(() => refresh(model, editor), 150));
    };
}

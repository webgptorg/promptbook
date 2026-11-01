import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

/** Minimal VS Code position used to inspect the real bundled providers' editor ranges. */
class Position {
    constructor(line, character) { this.line = line; this.character = character; }
}

/** Both overloads of VS Code Range used by activation and the reference providers. */
class Range {
    constructor(start, character, endLine, endCharacter) {
        this.start = typeof start === 'number' ? new Position(start, character) : start;
        this.end = typeof start === 'number' ? new Position(endLine, endCharacter) : character;
    }
}

/** Mutable editor buffer with UTF-16/CRLF offsets, so tests can change a document without saving it. */
export function bookDocument(path, text) {
    return {
        uri: { toString: () => `file://${path}` }, text, languageId: 'book', isClosed: false,
        get lineCount() { return this.text.split('\n').length; },
        getText() { return this.text; },
        lineAt(position) {
            const line = typeof position === 'number' ? position : position.line;
            const text = this.text.split('\n')[line].replace(/\r$/, '');
            return { text, range: new Range(line, 0, line, text.length) };
        },
        positionAt(offset) {
            const lines = this.text.slice(0, offset).split('\n');
            return new Position(lines.length - 1, lines.at(-1).length);
        },
        offsetAt(position) {
            return this.text.split('\n').slice(0, position.line).reduce((offset, line) => offset + line.length + 1, 0) + position.character;
        },
    };
}

/** Activate the actual release bundle with a small editor boundary; no alternate provider implementation is tested. */
export function activateEditor(documents, disk = new Map(), visibleDocuments = documents) {
    const providers = {};
    const searches = [];
    const listeners = {};
    const decorationTypes = [];
    const folder = { uri: { toString: () => 'file:///project' } };
    const disposable = () => ({ dispose() {} });
    /** Record the editor boundary without implementing any reference parsing or styling. */
    const textEditor = (document) => ({
        document, decorations: new Map(),
        setDecorations(type, ranges) { this.decorations.set(type, Array.from(ranges)); },
    });
    /** Capture the actual extension listeners so tests can deliver workspace and visibility events. */
    const listen = (name) => (listener) => {
        listeners[name] = listener;
        return { dispose() { delete listeners[name]; } };
    };
    const registrations = Object.fromEntries([
        ['registerDocumentSemanticTokensProvider', 'tokens'], ['registerCompletionItemProvider', 'completion'],
        ['registerHoverProvider', 'hover'], ['registerDocumentSymbolProvider', 'symbols'],
        ['registerFoldingRangeProvider', 'folding'], ['registerDefinitionProvider', 'definition'],
        ['registerDocumentHighlightProvider', 'highlights'],
    ].map(([method, name]) => [method, (_selector, provider) => { providers[name] = provider; return disposable(); }]));
    const vscode = {
        Range, DiagnosticSeverity: { Error: 0, Warning: 1 }, DocumentHighlightKind: { Read: 1, Write: 2 },
        ThemeColor: class { constructor(id) { this.id = id; } },
        DecorationRangeBehavior: { ClosedClosed: 1 },
        Diagnostic: class { constructor(range, message) { this.range = range; this.message = message; } },
        DocumentHighlight: class { constructor(range, kind) { this.range = range; this.kind = kind; } },
        SemanticTokensLegend: class {},
        SemanticTokensBuilder: class {
            spans = [];
            push(line, start, length, type) { this.spans.push({ line, start, length, type }); }
            build() { return this.spans; }
        },
        RelativePattern: class { constructor(base, pattern) { this.base = base; this.pattern = pattern; } },
        languages: { ...registrations, createDiagnosticCollection: () => ({ ...disposable(), set() {}, delete() {} }) },
        workspace: {
            textDocuments: documents,
            getWorkspaceFolder: (uri) => uri.toString().startsWith('file:///project/') ? folder : undefined,
            async findFiles(pattern, exclude) {
                searches.push({ pattern, exclude });
                return [...disk.keys()].filter((uri) => uri.startsWith('file:///project/'))
                    .map((uri) => ({ toString: () => uri }));
            },
            fs: { async readFile(uri) {
                if (!disk.has(uri.toString())) throw new Error('File disappeared');
                return new TextEncoder().encode(disk.get(uri.toString()));
            } },
            onDidOpenTextDocument: listen('open'), onDidChangeTextDocument: listen('change'), onDidCloseTextDocument: listen('close'),
        },
        window: {
            visibleTextEditors: visibleDocuments.map(textEditor),
            createTextEditorDecorationType(options) {
                const type = { options, disposed: false, dispose() { this.disposed = true; } };
                decorationTypes.push(type);
                return type;
            },
            onDidChangeVisibleTextEditors: listen('visible'),
            registerCustomEditorProvider: disposable,
        },
    };
    const entry = new URL('../../../dist-vscode/extension/out/extension.cjs', import.meta.url);
    const require = createRequire(entry);
    const module = { exports: {} };
    runInNewContext(readFileSync(entry, 'utf8'), {
        module, exports: module.exports, require: (name) => name === 'vscode' ? vscode : require(name),
        TextDecoder, TextEncoder, Buffer, process, setTimeout, clearTimeout, setImmediate, clearImmediate,
    }, { filename: entry.pathname });
    const context = { subscriptions: [] };
    module.exports.activate(context);
    return {
        ...providers, searches, decorationTypes,
        get editors() { return vscode.window.visibleTextEditors; },
        change(document) { listeners.change?.({ document }); },
        show(...visible) {
            vscode.window.visibleTextEditors = visible.map(textEditor);
            listeners.visible?.(vscode.window.visibleTextEditors);
        },
        dispose() { for (const subscription of context.subscriptions) subscription.dispose(); },
    };
}

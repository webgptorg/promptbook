import * as vscode from 'vscode';
import { analyze, declarationIn, highlightBook, isLiteral, keywordCompletions, matchCommitmentKeyword, parseBook, referenceAt, referenceHighlights, referencesIn } from './language.js';
import { MAX_BOOKC_BYTES, previewHtml, readBookc } from './bookc.js';

/** Connect the bundled engine language services to VS Code without starting an engine or an AI harness. */
export function activate(context: vscode.ExtensionContext): void {
    const selector: vscode.DocumentSelector = { language: 'book' };
    const diagnostics = vscode.languages.createDiagnosticCollection('book');
    // A generic variable token can remain plain text in a theme or with semantic highlighting disabled.
    // Use the theme's link foreground for cross-references; ThemeColor also follows theme changes automatically.
    const referenceColor = vscode.window.createTextEditorDecorationType({
        color: new vscode.ThemeColor('textLink.foreground'),
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
    /** Color the same complete references used by navigation, including in split and newly visible editors. */
    const colorReferences = (editor: vscode.TextEditor): void => {
        const { document } = editor;
        const ranges = document.languageId === 'book' && !document.isClosed
            ? referencesIn(document.getText()).map((reference) => new vscode.Range(
                document.positionAt(reference.index), document.positionAt(reference.index + reference.raw.length),
            )) : [];
        editor.setDecorations(referenceColor, ranges);
    };
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const update = (document: vscode.TextDocument): void => {
        for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.toString() === document.uri.toString()) colorReferences(editor);
        }
        if (document.languageId !== 'book' || document.isClosed) return;
        diagnostics.set(document.uri, analyze(document.getText()).diagnostics.map((problem) => {
            const line = document.lineAt(Math.max(0, Math.min(document.lineCount - 1, problem.line - 1)));
            const diagnostic = new vscode.Diagnostic(line.range, problem.message,
                problem.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning);
            diagnostic.source = 'Book';
            return diagnostic;
        }));
    };
    context.subscriptions.push(diagnostics, referenceColor, { dispose: () => {
        for (const timer of timers.values()) clearTimeout(timer);
        timers.clear();
    } });
    context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors((editors) => {
        for (const editor of editors) colorReferences(editor);
    }));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(update));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(({ document }) => {
        if (document.languageId !== 'book') return;
        const key = document.uri.toString();
        clearTimeout(timers.get(key));
        timers.set(key, setTimeout(() => { timers.delete(key); update(document); }, 150));
    }));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((document) => {
        const key = document.uri.toString();
        clearTimeout(timers.get(key));
        timers.delete(key);
        diagnostics.delete(document.uri);
    }));
    for (const document of vscode.workspace.textDocuments) update(document);

    // Standard token names inherit the user's theme. Ranges come directly from the shared engine highlighter.
    const legend = new vscode.SemanticTokensLegend(['keyword', 'class', 'variable', 'string', 'comment']);
    const tokenTypes = { declaration: 0, name: 1, keyword: 0, unknown: 4, reference: 2, literal: 3 } as const;
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider(selector, {
        provideDocumentSemanticTokens(document) {
            const builder = new vscode.SemanticTokensBuilder(legend);
            for (const span of highlightBook(document.getText())) {
                if (span.end > span.start) builder.push(span.line, span.start, span.end - span.start, tokenTypes[span.kind], 0);
            }
            return builder.build();
        },
    }, legend));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, {
        provideCompletionItems(document, position) {
            return keywordCompletions(document.getText(), position.line, position.character).map(({ keyword, definition }) => {
                const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
                item.detail = definition.description;
                item.insertText = `${keyword} `;
                const start = position.line === 0 && document.lineAt(0).text.startsWith('\uFEFF') ? 1 : 0;
                item.range = new vscode.Range(position.line, start, position.line, position.character);
                return item;
            });
        },
    }, ' '));
    context.subscriptions.push(vscode.languages.registerHoverProvider(selector, {
        provideHover(document, position) {
            if (isLiteral(document.getText(), position.line)) return;
            const line = document.lineAt(position).text;
            const bom = line.startsWith('\uFEFF') ? 1 : 0;
            const match = matchCommitmentKeyword(line.slice(bom));
            if (!match || match.definition.unknown || position.character >= match.written.length + bom) return;
            const text = new vscode.MarkdownString();
            text.appendCodeblock(match.definition.keyword, 'book');
            text.appendMarkdown(`\n${match.definition.description}`);
            text.isTrusted = false;
            return new vscode.Hover(text);
        },
    }));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, {
        provideDocumentSymbols(document) {
            const parsed = parseBook(document.getText());
            const last = document.lineAt(document.lineCount - 1).range.end;
            const symbols = parsed.commitments.map((commitment) => new vscode.DocumentSymbol(
                commitment.written, commitment.value, vscode.SymbolKind.Property,
                new vscode.Range(commitment.startLine, 0, Math.max(commitment.startLine, commitment.endLine - 1),
                    document.lineAt(Math.max(commitment.startLine, commitment.endLine - 1)).text.length),
                new vscode.Range(commitment.startLine, 0, commitment.startLine, commitment.written.length),
            ));
            if (parsed.headerLine < 0) return symbols;
            const root = new vscode.DocumentSymbol(parsed.name || 'Book', parsed.kind, vscode.SymbolKind.Module,
                new vscode.Range(parsed.headerLine, 0, last.line, last.character), document.lineAt(parsed.headerLine).range);
            root.children = symbols;
            return [root];
        },
    }));
    context.subscriptions.push(vscode.languages.registerFoldingRangeProvider(selector, {
        provideFoldingRanges(document) {
            return parseBook(document.getText()).commitments
                .filter((item) => item.endLine > item.startLine + 1)
                .map((item) => new vscode.FoldingRange(item.startLine, item.endLine - 1, vscode.FoldingRangeKind.Region));
        },
    }));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, {
        async provideDefinition(document, position, token) {
            const reference = referenceAt(document.getText(), document.offsetAt(position));
            if (!reference) return;
            const originSelectionRange = new vscode.Range(document.positionAt(reference.index), document.positionAt(reference.index + reference.raw.length));
            const folder = vscode.workspace.getWorkspaceFolder(document.uri);
            const files = folder ? await vscode.workspace.findFiles(
                new vscode.RelativePattern(folder, '**/*.{book,book.md,ptbk,ptbk.md}'),
                '**/{node_modules,.git,.ptbk,traces,actions,dist,dist-vscode}/**', undefined, token,
            ) : [];
            // Newly created/unsaved Books are not necessarily returned by findFiles; editor buffers win over disk.
            const candidates = new Map(files.map((uri) => [uri.toString(), uri]));
            for (const open of vscode.workspace.textDocuments) {
                if (open.languageId !== 'book' || open.isClosed) continue;
                if (open.uri.toString() === document.uri.toString() || (folder &&
                    vscode.workspace.getWorkspaceFolder(open.uri)?.uri.toString() === folder.uri.toString())) {
                    candidates.set(open.uri.toString(), open.uri);
                }
            }
            candidates.set(document.uri.toString(), document.uri);
            const locations: vscode.DefinitionLink[] = [];
            for (const uri of candidates.values()) {
                if (token.isCancellationRequested) return;
                try {
                    const open = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri.toString());
                    const source = open ? open.getText() : new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
                    const declaration = declarationIn(source);
                    if (!declaration || declaration.normalized !== reference.normalized) continue;
                    const lines = source.slice(0, declaration.index).split('\n');
                    const line = lines.length - 1;
                    const start = lines[line]!.length;
                    locations.push({
                        originSelectionRange, targetUri: uri,
                        targetRange: new vscode.Range(line, 0, line, start + declaration.raw.length),
                        targetSelectionRange: new vscode.Range(line, start, line, start + declaration.raw.length),
                    });
                } catch {
                    // A file can disappear or become unreadable during a workspace search.
                }
            }
            return locations;
        },
    }));
    context.subscriptions.push(vscode.languages.registerDocumentHighlightProvider(selector, {
        provideDocumentHighlights(document, position) {
            return referenceHighlights(document.getText(), document.offsetAt(position)).map((item) => new vscode.DocumentHighlight(
                new vscode.Range(document.positionAt(item.index), document.positionAt(item.index + item.raw.length)),
                item.declaration ? vscode.DocumentHighlightKind.Write : vscode.DocumentHighlightKind.Read,
            ));
        },
    }));
    context.subscriptions.push(vscode.window.registerCustomEditorProvider('bookc.preview', {
        async openCustomDocument(uri: vscode.Uri) {
            return { uri, dispose() {} };
        },
        async resolveCustomEditor(document: vscode.CustomDocument, panel: vscode.WebviewPanel) {
            panel.webview.options = { enableScripts: false, localResourceRoots: [] };
            let content: string;
            try {
                if ((await vscode.workspace.fs.stat(document.uri)).size > MAX_BOOKC_BYTES) throw new Error('The legacy archive exceeds the 4 MiB preview limit.');
                content = await readBookc(await vscode.workspace.fs.readFile(document.uri));
            } catch (error) {
                content = error instanceof Error ? error.message : String(error);
            }
            panel.webview.html = previewHtml(vscode.workspace.asRelativePath(document.uri), content);
        },
    }));
}

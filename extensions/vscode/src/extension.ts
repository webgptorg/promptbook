import * as vscode from 'vscode';
import { normalizeAgentName } from '../../../src/book/references.js';
import { analyze, highlightBook, isLiteral, keywordCompletions, matchCommitmentKeyword, parseBook, referencesIn } from './language.js';
import { MAX_BOOKC_BYTES, previewHtml, readBookc } from './bookc.js';

/** Connect the bundled engine language services to VS Code without starting an engine or an AI harness. */
export function activate(context: vscode.ExtensionContext): void {
    const selector: vscode.DocumentSelector = { language: 'book' };
    const diagnostics = vscode.languages.createDiagnosticCollection('book');
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const update = (document: vscode.TextDocument): void => {
        if (document.languageId !== 'book' || document.isClosed) return;
        diagnostics.set(document.uri, analyze(document.getText()).diagnostics.map((problem) => {
            const line = document.lineAt(Math.max(0, Math.min(document.lineCount - 1, problem.line - 1)));
            const diagnostic = new vscode.Diagnostic(line.range, problem.message,
                problem.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning);
            diagnostic.source = 'Book';
            return diagnostic;
        }));
    };
    context.subscriptions.push(diagnostics, { dispose: () => {
        for (const timer of timers.values()) clearTimeout(timer);
        timers.clear();
    } });
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
            const offset = document.offsetAt(position);
            const reference = referencesIn(document.getText()).find((item) => offset >= item.index && offset < item.index + item.raw.length);
            if (!reference) return;
            const folder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (!folder) return;
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(folder, '**/*.{book,book.md,ptbk,ptbk.md}'),
                '**/{node_modules,.git,.ptbk,traces,dist,dist-vscode}/**', undefined, token,
            );
            const locations: vscode.Location[] = [];
            for (const uri of files) {
                if (token.isCancellationRequested) return;
                try {
                    const open = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri.toString());
                    const source = open ? open.getText() : new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
                    const parsed = parseBook(source);
                    if (!['agent', 'task', 'chat'].includes(parsed.kind) || normalizeAgentName(parsed.name) !== reference.normalized) continue;
                    locations.push(new vscode.Location(uri, new vscode.Range(parsed.headerLine, 0, parsed.headerLine, parsed.lines[parsed.headerLine]!.length)));
                } catch {
                    // A file can disappear or become unreadable during a workspace search.
                }
            }
            return locations;
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

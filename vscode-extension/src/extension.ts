import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Promptbook extension is now active!');

    // Register validation command
    let disposable = vscode.commands.registerCommand('promptbook.validate', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            validateDocument(document);
        }
    });

    // Register document change handler
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'book') {
            validateDocument(event.document);
        }
    });

    context.subscriptions.push(disposable);
}

function validateDocument(document: vscode.TextDocument) {
    const text = document.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    // Basic validation rules
    if (!text.includes('BOOK VERSION')) {
        diagnostics.push(
            createDiagnostic(document, 'Missing BOOK VERSION declaration', vscode.DiagnosticSeverity.Warning),
        );
    }

    // Add more validation rules here

    // Create diagnostic collection
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('promptbook');
    diagnosticCollection.set(document.uri, diagnostics);
}

function createDiagnostic(
    document: vscode.TextDocument,
    message: string,
    severity: vscode.DiagnosticSeverity,
): vscode.Diagnostic {
    const range = new vscode.Range(0, 0, 0, 0);
    return new vscode.Diagnostic(range, message, severity);
}

export function deactivate() {}

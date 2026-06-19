import * as vscode from 'vscode';

/**
 * Activates the Book Language VSCode extension.
 * Syntax highlighting, snippets, and language configuration are registered
 * declaratively via package.json contributions — this activation entry point
 * is reserved for future imperative features (hover docs, diagnostics, etc.).
 */
export function activate(_context: vscode.ExtensionContext): void {
    console.log('Book Language extension activated');
}

export function deactivate(): void {
    // No cleanup needed
}

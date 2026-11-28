import * as vscode from 'vscode';

/**
 * Activates the Book Language extension.
 *
 * Syntax highlighting is handled automatically via the grammar contributed in
 * package.json (`contributes.grammars`), so no explicit activation logic is needed.
 * This function is required by the VSCode extension API.
 */
export function activate(_context: vscode.ExtensionContext): void {
    // Syntax highlighting and language configuration are registered declaratively
    // via package.json contributes.languages and contributes.grammars.
    // The grammar file (syntaxes/book.tmLanguage.json) is generated from
    // COMMITMENT_REGISTRY by running: npm run generate-vscode-grammar
}

/**
 * Deactivates the Book Language extension.
 */
export function deactivate(): void {}

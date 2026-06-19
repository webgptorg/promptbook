"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
/**
 * Activates the Book Language VSCode extension.
 * Syntax highlighting, snippets, and language configuration are registered
 * declaratively via package.json contributions — this activation entry point
 * is reserved for future imperative features (hover docs, diagnostics, etc.).
 */
function activate(_context) {
    console.log('Book Language extension activated');
}
function deactivate() {
    // No cleanup needed
}

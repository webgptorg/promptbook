/**
 * The desktop workspace's text and Book editor, loaded by the project dashboard of a desktop window from the private
 * `ptbk-editor:` scheme. It exposes `window.PromptbookEditor` to the page: Monaco with the shared Book language logic
 * (one adapter per editor; the VS Code extension has the other) and transferable edit history. Drafts, saving and
 * revisions stay with the page, which saves through the engine's operations.
 */
import * as monaco from './monaco.js';
import * as language from '../../../src/book/editor-language.ts';
import configuration from '../../../extensions/vscode/language-configuration.json';
import { registerBook } from './book-monaco.mjs';
import { trackHistory } from './history.mjs';
import './editor.css';

/** Monaco's editor worker, embedded at build time and started from a blob (the page's origin cannot serve it). */
/* global __PTBK_EDITOR_WORKER__ */
const workerUrl = URL.createObjectURL(new Blob([__PTBK_EDITOR_WORKER__], { type: 'text/javascript' }));
self.MonacoEnvironment = { getWorker: () => new Worker(workerUrl, { name: 'editor' }) };

/** Reference navigation of the editor currently asking (each editor passes its own workspace callback). */
const openers = new WeakMap();
let lastFocused;
const refreshBook = registerBook(monaco, language, configuration, {
    openReference: (name) => openers.get(lastFocused)?.(name),
});

/** The system appearance, followed live (the desktop app's appearance setting changes it for every view). */
const dark = window.matchMedia('(prefers-color-scheme: dark)');
const theme = () => (dark.matches ? 'vs-dark' : 'vs');
dark.addEventListener('change', () => monaco.editor.setTheme(theme()));

/** Monaco language of a Files kind or path. */
function languageOf(kind, path) {
    if (kind === 'book' || /\.book(\.md)?$/i.test(path || '')) return 'book';
    if (kind === 'markdown' || /\.(md|markdown)$/i.test(path || '')) return 'markdown';
    return 'plaintext';
}

/**
 * Creates an editor in `container`. Options: `text`, `kind`/`path`, `readOnly`, `history` (a transferred
 * `{ base, undo, redo }`, whose result must equal `text`), `viewState`, `label`, and the callbacks `onChange(text)`,
 * `onSave()` (Ctrl/Cmd+S) and `onOpenReference(name)` (Ctrl/Cmd+click on a Book reference).
 */
function create(container, options) {
    const model = monaco.editor.createModel(options.history ? options.history.base : options.text, languageOf(options.kind, options.path));
    const editor = monaco.editor.create(container, {
        model, theme: theme(), readOnly: Boolean(options.readOnly), automaticLayout: true, minimap: { enabled: false },
        wordWrap: 'off', fontSize: 14, scrollBeyondLastLine: false, unicodeHighlight: { ambiguousCharacters: true, invisibleCharacters: true },
        ariaLabel: options.label || options.path || 'Text editor', renderWhitespace: 'selection', occurrencesHighlight: 'singleFile',
        quickSuggestions: false, wordBasedSuggestions: 'off', links: false, fixedOverflowWidgets: true,
    });
    const history = trackHistory(model, options.history);
    if (options.history && model.getValue() !== options.text) {
        // A history that does not reproduce the text is not trusted: the moved text is kept without it.
        model.setValue(options.text);
    }
    if (options.viewState) editor.restoreViewState(options.viewState);
    if (options.onOpenReference) openers.set(editor, options.onOpenReference);
    editor.onDidFocusEditorText(() => { lastFocused = editor; });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => options.onSave?.());
    const content = model.onDidChangeContent(() => {
        refreshBook(model, editor);
        options.onChange?.(model.getValue());
    });
    refreshBook(model, editor, true);
    return {
        editor,
        getText: () => model.getValue(),
        /** Replaces the whole text as one edit the user can undo (loading the current source after a conflict). */
        setText(text) {
            editor.pushUndoStop();
            editor.executeEdits('ptbk', [{ range: model.getFullModelRange(), text }]);
            editor.pushUndoStop();
        },
        setReadOnly: (readOnly) => editor.updateOptions({ readOnly }),
        focus: () => editor.focus(),
        layout: () => editor.layout(),
        revealLine(line) {
            editor.revealLineInCenter(line);
            editor.setSelection({ startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: model.getLineMaxColumn(line) });
            editor.focus();
        },
        /** The state a moved document carries: its text, edit history and view (cursor, selection and scroll). */
        exportState: () => ({ text: model.getValue(), history: history.export(), viewState: editor.saveViewState() }),
        viewState: () => editor.saveViewState(),
        dispose() {
            content.dispose();
            history.dispose();
            monaco.editor.setModelMarkers(model, 'book', []);
            editor.dispose();
            model.dispose();
        },
    };
}

window.PromptbookEditor = Object.freeze({ version: 1, create });
window.dispatchEvent(new Event('ptbk-editor-ready'));

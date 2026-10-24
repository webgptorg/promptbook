import { truncate } from './ansi.js';
import { MAX_ATTACHMENT_BYTES, clipboardText, droppedFile, isImagePath, richClipboard } from './attachments.js';
import { TextEditor, itemLabel, type ComposedSegment } from './composer.js';
import type { KeyEvent } from './keys.js';

/**
 * Interaction policy of an entry point (the editing, paste and attachment behavior itself is shared):
 *
 * - `flow` (initialization, chat, answers): Enter accepts/submits; Shift+Enter (where distinguishable), Ctrl+J or
 *   Alt+Enter insert a newline
 * - `source` (full Book source editing): Enter inserts a newline; Ctrl+S saves without closing
 *
 * @private rich input
 */
export type RichInputMode = 'flow' | 'source';

/**
 * Outcome of one input event.
 *
 * @private rich input
 */
export type RichInputAction = 'submit' | 'save' | 'cancel' | 'changed' | 'ignored';

/**
 * Largest pasted block accepted in one paste.
 *
 * @private rich input
 */
export const MAX_PASTE_CHARACTERS = 10 * 1024 * 1024;

/**
 * Options of a rich input.
 *
 * @private rich input
 */
export type RichInputOptions = {
    /** Enter policy of the entry point. */
    readonly mode: RichInputMode;
    /** Initial content (text or restored segments). */
    readonly initial?: string | readonly ComposedSegment[];
    /** Images and files may be attached (Ctrl+V, Ctrl+O, dropped paths). */
    readonly attachments?: boolean;
    /** One line only (folder names, paths): no tokens and no newlines. */
    readonly singleLine?: boolean;
    /** Submitting empty content is refused with a visible message. */
    readonly required?: boolean;
    /** Redraws after asynchronous work (clipboard reads, dropped files). */
    readonly refresh: () => void;
    /** Environment for clipboard access. */
    readonly env?: NodeJS.ProcessEnv;
    /** Keep the initial text literally (tabs stay tabs; full-source editing). */
    readonly literal?: boolean;
};

/**
 * The one rich-input implementation of every interactive text entry: multiline editing with a visible cursor,
 * paste that never submits, compact tokens for long pasted blocks (inspectable, expandable with Ctrl+T, removable),
 * Ctrl+V rich paste of text, images and documents, Ctrl+O file attachment and dropped file paths. Entry points only
 * choose the Enter/save policy (`mode`) and render it; they never copy paste, clipboard or attachment handling.
 *
 * @private rich input
 */
export class RichInput {
    /** The editing model (text, tokens and cursor). */
    public readonly editor: TextEditor;
    private attachPath?: TextEditor;
    private message = '';
    private busy = '';

    public constructor(private readonly options: RichInputOptions) {
        this.editor = new TextEditor(options.initial ?? '', { literal: options.literal });
        this.editor.tokenizePastes = !options.singleLine;
    }

    /** The complete payload in order (pasted blocks in full, attachments at their positions). */
    public segments(): ComposedSegment[] {
        return this.editor.segments();
    }

    /** Whether nothing was entered. */
    public get empty(): boolean {
        return this.editor.empty;
    }

    /** The attach-file path field while it is open. */
    public get attaching(): TextEditor | undefined {
        return this.attachPath;
    }

    /** Shows a message under the field (cleared by the next input). */
    public notify(text: string): void {
        this.message = text;
    }

    /** Replaces the content (e.g. after a sent message); items are removed. */
    public clear(): void {
        this.editor.value = '';
    }

    /** Attaches a file by path (dropped, pasted or typed), refusing missing and oversized files visibly. */
    private async attachFile(raw: string): Promise<boolean> {
        const found = await droppedFile(raw);
        if (!found) {
            this.message = `No readable file at ${raw.trim() || '(empty path)'}.`;
            return false;
        }
        if (found.bytes > MAX_ATTACHMENT_BYTES) {
            this.message = `That file is larger than ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB and was not attached.`;
            return false;
        }
        this.editor.attach({ kind: isImagePath(found.path) ? 'image' : 'file', path: found.path, name: found.path.split(/[\\/]/).pop() ?? 'file', bytes: found.bytes });
        return true;
    }

    /** Runs asynchronous acquisition with a visible busy line, then redraws. */
    private background(label: string, work: () => Promise<void>): void {
        this.busy = label;
        void work().finally(() => {
            this.busy = '';
            this.options.refresh();
        });
    }

    /** Handles one input event under the entry point's policy. */
    public handle(event: KeyEvent): RichInputAction {
        if (this.busy) return 'ignored';
        const multiline = !this.options.singleLine;
        const attachments = this.options.attachments === true && multiline;
        if (this.attachPath) {
            if (event.type === 'key' && event.name === 'escape') {
                this.attachPath = undefined;
                this.message = '';
                return 'changed';
            }
            if (event.type === 'key' && event.name === 'enter') {
                const raw = this.attachPath.value;
                this.background('Checking the file…', async () => {
                    if (await this.attachFile(raw)) {
                        this.attachPath = undefined;
                        this.message = '';
                    }
                });
                return 'changed';
            }
            this.message = '';
            this.attachPath.handle(event);
            return 'changed';
        }
        this.message = '';
        if (event.type === 'paste') {
            if (event.text.length > MAX_PASTE_CHARACTERS) {
                this.message = `The pasted text is larger than ${MAX_PASTE_CHARACTERS / 1024 / 1024} MB and was not inserted.`;
                return 'changed';
            }
            // Terminals paste the path of a dropped file: it becomes an attachment when the file exists.
            if (attachments && /^\s*['"]?(file:\/\/|[/~]|[A-Za-z]:[\\/])/.test(event.text) && !event.text.trim().includes('\n')) {
                const text = event.text;
                this.background('Checking the pasted path…', async () => {
                    if (!(await droppedFile(text))) this.editor.paste(text);
                    else if (!(await this.attachFile(text))) this.editor.paste(text);
                });
                return 'changed';
            }
            this.editor.paste(this.options.singleLine ? event.text.replace(/\s*\n\s*/g, ' ') : event.text);
            return 'changed';
        }
        if (event.type === 'key' && event.ctrl && event.name === 'v') {
            if (!attachments) {
                this.background('Reading the clipboard…', async () => {
                    const text = await clipboardText(this.options.env);
                    if ('problem' in text) this.message = text.problem;
                    else this.editor.paste(this.options.singleLine ? text.text.replace(/\s*\n\s*/g, ' ') : text.text);
                });
                return 'changed';
            }
            this.background('Reading the clipboard…', async () => {
                const content = await richClipboard(this.options.env);
                if ('problem' in content) this.message = content.problem;
                else if (content.kind === 'text') this.editor.paste(content.text);
                else if (content.bytes > MAX_ATTACHMENT_BYTES) this.message = 'The clipboard content is too large to attach.';
                else this.editor.attach({ kind: content.kind, path: content.path, name: content.path.split(/[\\/]/).pop() ?? 'clipboard', bytes: content.bytes });
            });
            return 'changed';
        }
        if (event.type === 'key' && event.ctrl && event.name === 'o' && attachments) {
            this.attachPath = new TextEditor('');
            this.attachPath.tokenizePastes = false;
            return 'changed';
        }
        if (event.type === 'key' && event.ctrl && event.name === 't' && multiline) {
            if (!this.editor.expandAtCursor()) this.message = 'Move the cursor next to a [Pasted text] item to expand it for editing.';
            return 'changed';
        }
        if (event.type === 'key' && event.name === 'escape') return 'cancel';
        if (this.options.mode === 'source') {
            if (event.type === 'key' && event.ctrl && event.name === 's') return 'save';
            // Enter always inserts a line in a source; it never saves or leaves the editor.
            if (event.type === 'key' && (event.name === 'enter' || event.name === 'newline')) {
                this.editor.handle({ type: 'key', name: 'newline' });
                return 'changed';
            }
            return this.editor.handle(event) === 'ignored' ? 'ignored' : 'changed';
        }
        if (this.options.singleLine && event.type === 'key' && event.name === 'newline') return 'ignored';
        if (event.type === 'key' && event.name === 'enter') {
            if (this.options.required && this.editor.empty) {
                this.message = 'A value is required.';
                return 'changed';
            }
            return 'submit';
        }
        const action = this.editor.handle(event);
        return action === 'submit' || action === 'cancel' ? action : action === 'ignored' ? 'ignored' : 'changed';
    }

    /** The line under the field: work in progress, a message, or the inspected item at the cursor. */
    public status(width: number): { readonly text: string; readonly tone: 'muted' | 'warning' } | undefined {
        if (this.busy) return { text: this.busy, tone: 'muted' };
        if (this.message) return { text: this.message, tone: 'warning' };
        const item = this.editor.itemAtCursor();
        if (!item) return undefined;
        if (item.kind === 'paste') {
            const first = item.text.split('\n').find((line) => line.trim()) ?? '';
            return { text: truncate(`${itemLabel(item)} “${truncate(first.trim(), 50)}” · Ctrl+T expand to edit · Backspace remove`, width), tone: 'muted' };
        }
        return { text: truncate(`${itemLabel(item)} ${item.path}${item.bytes ? ` (${Math.max(1, Math.round(item.bytes / 1024))} KB)` : ''} · Backspace remove`, width), tone: 'muted' };
    }

    /** The discoverable keys of this entry point's policy. */
    public keys(): string[] {
        if (this.attachPath) return ['Enter attach', 'Esc back', 'paste or drop a path'];
        const items = this.editor.insertedItems.length;
        const counted = items ? [`${items} item${items === 1 ? '' : 's'} attached/pasted`] : [];
        if (this.options.singleLine) return ['Enter submit', 'Ctrl+V paste', 'Esc cancel'];
        const attach = this.options.attachments ? ['Ctrl+V paste text/image/file', 'Ctrl+O attach file'] : ['Ctrl+V paste'];
        if (this.options.mode === 'source') return [...counted, 'Enter newline', 'Ctrl+S save (stays open)', ...attach, 'Esc leave'];
        return [...counted, 'Enter submit', 'Shift+Enter/Ctrl+J newline', ...attach, 'Esc cancel', 'paste never submits'];
    }
}

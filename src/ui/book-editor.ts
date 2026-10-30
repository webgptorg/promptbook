import { errorMessage } from '../common/errors.js';
import type { BookSaveOutcome } from '../engine/agenda.js';
import type { BookSource } from '../project/book-sources.js';
import { highlightKinds, type BookHighlightKind } from '../book/highlight.js';
import { bookHighlightStyle, fit, truncate } from './ansi.js';
import type { ComposedSegment } from './composer.js';
import { KeyboardSession, type KeyEvent } from './keys.js';
import { renderPanel } from './panels.js';
import { RichInput } from './rich-input.js';
import { FullScreen } from './screen.js';
import { symbols, type TerminalProfile } from './terminal.js';

/**
 * Where an editor reads and saves Book sources (the engine's shared operations).
 *
 * @private Book editor
 */
export type BookSourceClient = {
    readonly read: (input: { readonly reference?: string; readonly path?: string }) => Promise<BookSource>;
    readonly save: (input: { readonly path: string; readonly text: string; readonly revision: string; readonly segments?: readonly ComposedSegment[] }) => Promise<BookSaveOutcome>;
};

/**
 * An unsaved draft kept by the caller across navigation (leaving the editor never loses it).
 *
 * @private Book editor
 */
export type BookDraft = { readonly segments: readonly ComposedSegment[]; readonly revision: string };

/**
 * Full-screen editing of a real Book source, like composing a Git commit message: the shared rich input in its
 * `source` policy (Enter inserts a line, Ctrl+S saves without closing, Ctrl+V pastes text/images/documents). Saving
 * is never refused for problematic content: warnings are shown and Fixer gets an ordinary repair task. Engine-owned
 * Expert is read-only. Esc leaves; an unsaved draft is kept in `drafts`.
 *
 * @private Book editor
 */
export async function runBookEditor(
    terminal: TerminalProfile,
    books: BookSourceClient,
    target: { readonly reference?: string; readonly path?: string },
    options: {
        readonly screen?: FullScreen;
        readonly drafts?: Map<string, BookDraft>;
        /** Inside the dashboard, which keeps its PTBK title. */
        readonly embedded?: boolean;
        /** The shared viewer mode (Files, the full report): the same parser and navigation, no save path at all. */
        readonly readOnly?: boolean;
    } = {},
): Promise<void> {
    const screen = options.screen ?? new FullScreen();
    const ownsScreen = !options.screen;
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    let source: BookSource;
    try {
        source = await books.read(target);
    } catch (error) {
        terminal.write(`${style.error('Cannot open the Book:')} ${errorMessage(error)}\n`);
        return;
    }
    if (options.readOnly && source.editable) source = { ...source, editable: false, reason: 'Opened for viewing; edit it from its Agents, Tasks or Chats page.' };
    const draft = options.drafts?.get(source.path);
    // A kept draft based on the current revision is restored; a stale one is offered as the editor content but its
    // base revision makes the save a visible conflict instead of silently overwriting another edit.
    let revision = draft?.revision ?? source.revision;
    let input: RichInput;
    // The text last loaded or saved: the editor is dirty only when its content differs (cursor moves never count).
    // Line endings are edited as LF and restored to the source's own style on save.
    const crlf = source.text.includes('\r\n');
    const lf = (text: string): string => text.replace(/\r\n/g, '\n');
    let baseline = lf(source.text);
    const serialized = (): string => input.segments().map((segment) => (segment.type === 'text' ? segment.text : `\u0000${segment.path}`)).join('');
    const dirty = (): boolean => serialized() !== baseline;
    let saved = '';
    let notice = draft ? (draft.revision === source.revision ? 'Restored your unsaved draft.' : 'Restored your unsaved draft; the Book changed meanwhile, so saving reports a conflict to reconcile.') : '';
    let busy = '';
    let closed = false;
    let finish: (() => void) | undefined;
    const done = new Promise<void>((resolve) => {
        finish = resolve;
    });
    // Shared Book highlighting from the one parser, recomputed only when the text changed (long sources stay fluid).
    let highlighted: { readonly text: string; readonly kinds: readonly (BookHighlightKind | undefined)[] } | undefined;
    const styleAt = (): ((offset: number) => ((text: string) => string) | undefined) | undefined => {
        if (!terminal.style.enabled) return undefined;
        const text = input.editor.rawText;
        if (highlighted?.text !== text) highlighted = { text, kinds: highlightKinds(text) };
        const { kinds } = highlighted;
        // One styler per kind, so the editor can merge equally styled characters into runs.
        const stylers = new Map<BookHighlightKind, (text: string) => string>();
        return (offset) => {
            const kind = kinds[offset];
            if (!kind) return undefined;
            if (!stylers.has(kind)) stylers.set(kind, bookHighlightStyle(kind, terminal.style));
            return stylers.get(kind);
        };
    };
    const draw = (): void => {
        if (closed) return;
        if (!options.embedded) terminal.title.update({ mode: 'Book', detail: source.name || source.path });
        const width = Math.min(terminal.columns(), 160);
        const height = terminal.rows();
        const header = renderPanel({
            title: `${marks.bullet} ${source.kind === 'engine' ? 'Expert (engine-owned)' : `${source.kind === 'invalid' ? 'Book' : source.kind[0]!.toUpperCase()}${source.kind === 'invalid' ? '' : source.kind.slice(1)} source`}`,
            titleRight: source.editable ? 'Ctrl+S save · Esc leave' : 'read-only · Esc leave',
            lines: [`${style.bold(truncate(source.name || '(unnamed)', width - 6))}`, style.muted(`${source.path}${source.editable ? ` · revision ${source.revision.slice(0, 8)}` : ''}${source.editable ? (dirty() ? ' · unsaved changes' : saved ? ` · ${saved}` : '') : ''}`)],
            width,
            tone: 'accent',
            unicode: terminal.unicode,
            style,
        });
        const warnings = source.diagnostics.slice(0, 6).map((diagnostic) => `${diagnostic.severity === 'error' ? style.error(marks.fail) : style.warning(marks.warn)} ${diagnostic.line ? style.muted(`line ${diagnostic.line}: `) : ''}${truncate(diagnostic.message, width - 16)}`);
        if (source.diagnostics.length > 6) warnings.push(style.muted(`… ${source.diagnostics.length - 6} more`));
        const warningPanel = warnings.length
            ? renderPanel({ title: `${marks.warn} Detected problems (${source.diagnostics.length}) — saving stays allowed; Fixer repairs them`, lines: warnings, width, tone: 'attention', unicode: terminal.unicode, style })
            : [];
        const status = input.status(width - 4);
        const keys = source.editable ? input.keys() : ['↑↓ move', 'Esc leave'];
        const legend = style.muted(fit(`  ${busy || keys.join(' · ')}${notice ? `   ${marks.arrow} ${notice}` : ''}`, width));
        const statusLines = status ? [status.tone === 'warning' ? style.warning(`  ${status.text}`) : style.muted(`  ${status.text}`)] : [];
        const attaching = input.attaching;
        const attachLines = attaching ? [`  ${style.bold('Attach file:')} ${attaching.layout(width - 18, 1).lines[0] ?? ''}`] : [];
        const available = Math.max(3, height - header.length - warningPanel.length - statusLines.length - attachLines.length - 3);
        const layout = input.editor.layout(width - 4, available, styleAt());
        const body = layout.lines.map((line) => `  ${line}`);
        while (body.length < available) body.push('');
        const top = header.length + warningPanel.length;
        const scroll = layout.hiddenAbove || layout.hiddenBelow ? style.muted(fit(`  ${layout.hiddenAbove ? `↑ ${layout.hiddenAbove} line(s) above` : ''}${layout.hiddenBelow ? `  ↓ ${layout.hiddenBelow} below` : ''}`, width)) : '';
        screen.draw([...header, ...warningPanel, ...body, scroll, ...attachLines, ...statusLines, legend], attaching ? undefined : { row: top + layout.cursor.row, column: 2 + layout.cursor.column });
    };
    input = new RichInput({ mode: 'source', attachments: source.editable, literal: true, initial: draft?.segments ?? source.text, refresh: () => draw() });
    const keepDraft = (): void => {
        if (!source.editable || !options.drafts) return;
        if (!dirty()) options.drafts.delete(source.path);
        else options.drafts.set(source.path, { segments: input.segments(), revision });
    };
    const close = (): void => {
        if (closed) return;
        keepDraft();
        closed = true;
        keyboard.stop();
        process.stdout.off('resize', onResize);
        if (ownsScreen) screen.leave();
        finish?.();
    };
    const save = async (): Promise<void> => {
        if (busy) return;
        busy = 'Saving…';
        draw();
        try {
            const segments = input.segments();
            const edited = segments.map((segment) => (segment.type === 'text' ? segment.text : '')).join('');
            const text = crlf ? edited.replace(/\n/g, '\r\n') : edited;
            const outcome = await books.save({ path: source.path, text, revision, segments: segments.some((segment) => segment.type === 'attachment') ? segments.map((segment) => (segment.type === 'text' && crlf ? { ...segment, text: segment.text.replace(/\n/g, '\r\n') } : segment)) : undefined });
            revision = outcome.revision;
            source = { ...source, revision: outcome.revision, diagnostics: outcome.diagnostics };
            if (outcome.unchanged) notice = 'Nothing changed; no commit.';
            else notice = `Saved${outcome.commit ? ` and committed ${outcome.commit.slice(0, 8)}` : ' (not committed)'}${outcome.diagnostics.length ? ` with ${outcome.diagnostics.length} warning(s)${outcome.repair ? '; Fixer got a repair task' : '; Fixer already has a repair task'}` : ''}.`;
            saved = 'saved';
            baseline = edited;
            // Attachments were written as project assets: the editor continues with the saved readable source.
            if (segments.some((segment) => segment.type === 'attachment')) {
                const reread = await books.read({ path: source.path });
                source = reread;
                baseline = lf(reread.text);
                input = new RichInput({ mode: 'source', attachments: true, literal: true, initial: reread.text, refresh: () => draw() });
            }
            options.drafts?.delete(source.path);
        } catch (error) {
            // Disk, permission, conflict or persistence failures keep the draft; they are not content warnings.
            notice = `Not saved: ${errorMessage(error)}`;
        } finally {
            busy = '';
            draw();
        }
    };
    const onKey = (event: KeyEvent): void => {
        if (event.type === 'key' && event.name === 'c' && event.ctrl) return close();
        if (!source.editable) {
            if (event.type === 'key' && event.name === 'escape') return close();
            if (event.type === 'key' && ['up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown'].includes(event.name)) input.editor.handle(event);
            else if (event.type !== 'key' || event.name !== 'escape') notice = source.reason ?? 'This Book is read-only here.';
            draw();
            return;
        }
        const action = input.handle(event);
        if (action === 'cancel') return close();
        if (action === 'save') void save();
        else if (action === 'changed' && dirty()) {
            saved = '';
            notice = '';
        }
        draw();
    };
    const keyboard = new KeyboardSession(onKey);
    const onResize = (): void => {
        screen.invalidate();
        draw();
    };
    if (ownsScreen) screen.enter();
    else screen.invalidate();
    keyboard.start();
    process.stdout.on('resize', onResize);
    draw();
    await done;
}

import { readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { confinePath, sha256, toProjectRelative } from '../common/fs.js';
import { modelOfDocument } from '../book/model.js';
import { parseBook, type BookDiagnostic, type EntityKind } from '../book/parse.js';
import { parseChatBook } from '../chats/chat-book.js';
import { readTaskBook } from '../tasks/book-task.js';
import { resolveEffectiveAgent, type AgentCatalog } from './agents.js';
import { expertInstructions } from './expert.js';
import { RUNTIME_DIRECTORY_NAME } from './workspace.js';

/**
 * The readable source of one Book as an editor shows it.
 *
 * @private Book sources
 */
export type BookSource = {
    /** Project-relative source path (`engine` for Expert). */
    readonly path: string;
    /** Declared name. */
    readonly name: string;
    /** Declared kind (`engine` for the engine-owned Expert). */
    readonly kind: EntityKind | 'invalid' | 'engine';
    /** The literal source text (never regenerated). */
    readonly text: string;
    /** Content revision; a save based on another revision is a conflict. */
    readonly revision: string;
    /** Whether it is a project-owned Book that can be edited here. */
    readonly editable: boolean;
    /** Why it is not editable. */
    readonly reason?: string;
    /** Detected problems with source context (warnings never prevent saving). */
    readonly diagnostics: readonly BookDiagnostic[];
};

/**
 * Detected problems of a Book's content: syntax, unknown or misplaced commitments, invalid MODEL and the kind's own
 * controls. They describe whether the source can be interpreted safely; they are never a reason to refuse saving.
 *
 * @private Book sources
 */
export function bookContentDiagnostics(text: string, relativePath: string): BookDiagnostic[] {
    const document = parseBook(text);
    const diagnostics: BookDiagnostic[] = [...document.diagnostics];
    const add = (items: readonly BookDiagnostic[]): void => {
        for (const item of items) if (!diagnostics.some((existing) => existing.line === item.line && existing.message === item.message)) diagnostics.push(item);
    };
    if (document.kind === 'agent') add(modelOfDocument(document).diagnostics);
    else if (document.kind === 'task') add(readTaskBook({ source: text, path: relativePath, relativePath, order: 0, timeZone: 'UTC' })?.diagnostics ?? []);
    else if (document.kind === 'chat') add(parseChatBook(text).diagnostics);
    return diagnostics.sort((a, b) => a.line - b.line);
}

/**
 * Whether a project-relative path may hold an editable project Book (never runtime state, evidence or Git data).
 */
function editablePath(relativePath: string): boolean {
    const first = relativePath.split('/')[0];
    return relativePath.toLowerCase().endsWith('.book') && first !== RUNTIME_DIRECTORY_NAME && first !== 'traces' && first !== 'actions' && first !== '.git' && first !== 'node_modules' && !relativePath.startsWith('..');
}

/**
 * Reads a Book by reference (`@Developer`, `{Task name}`) or project-relative path, with its revision and detected
 * problems. Engine-owned Expert is shown read-only and is never materialized as a project file.
 *
 * @private Book sources
 */
export async function readBookSource(projectRoot: string, catalog: AgentCatalog, input: { readonly reference?: string; readonly path?: string }): Promise<BookSource> {
    let path: string | undefined;
    if (input.path) path = await confinePath(projectRoot, resolve(projectRoot, input.path));
    else if (input.reference) {
        const resolution = await catalog.index.resolve(input.reference);
        if (resolution.kind === 'system-agent') {
            if (resolution.name !== 'Expert') throw new PtbkError(`${resolution.name} is an engine system agent without a source.`, { kind: 'usage' });
            const text = await expertInstructions();
            return { path: 'engine', name: 'Expert', kind: 'engine', text, revision: sha256(text), editable: false, reason: 'Expert is engine-owned (updated with ptbk itself); inherit it with FROM @Expert to customize.', diagnostics: [] };
        }
        if (resolution.kind !== 'book') throw new PtbkError(`No Book named ${input.reference}.`, { kind: 'not-found' });
        path = resolution.entry.path;
    } else throw new PtbkError('Name a Book by reference or path.', { kind: 'usage' });
    const relativePath = toProjectRelative(projectRoot, path).split(sep).join('/');
    if (!editablePath(relativePath)) throw new PtbkError(`${relativePath} is not an editable project Book.`, { kind: 'usage', next: ['Open agent, task or chat Books of the project (.book files outside .ptbk/, traces/ and actions/).'] });
    const text = await readFile(path, 'utf8').catch(() => {
        throw new PtbkError(`The Book ${relativePath} cannot be read.`, { kind: 'not-found' });
    });
    const document = parseBook(text);
    const diagnostics = bookContentDiagnostics(text, relativePath);
    // Effective-agent problems (inheritance, references, inherited MODEL) are reported with the agent's own source.
    if (document.kind === 'agent') {
        const effective = await resolveEffectiveAgent(catalog, `{${document.name}}`);
        for (const diagnostic of effective.diagnostics) {
            if (diagnostic.path && relative(diagnostic.path, relativePath) !== '') continue;
            if (!diagnostics.some((existing) => existing.message === diagnostic.message)) diagnostics.push({ line: diagnostic.line, message: diagnostic.message, severity: diagnostic.severity });
        }
    }
    return { path: relativePath, name: document.name, kind: document.kind === 'empty' ? 'invalid' : document.kind, text, revision: sha256(text), editable: true, diagnostics };
}

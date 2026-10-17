import { readFile, realpath } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { isPathInside, listDirectory, sha256, toProjectRelative } from '../common/fs.js';
import { parseBook, type BookDocument, type EntityKind } from '../book/parse.js';
import { nonAgentOf, normalizeAgentName, parseReferenceValue, type NonAgentName } from '../book/references.js';
import { inspectGit, listIgnoredEntries, listProjectFiles } from './git.js';
import { RUNTIME_DIRECTORY_NAME } from './workspace.js';

/**
 * Conventional root-level directory of chat Books.
 *
 * @private Book index
 */
export const CHATS_DIRECTORY = 'chats';

/**
 * Root-level task audit evidence: never a source of Book definitions.
 */
const TRACES_DIRECTORY = 'traces';

/**
 * Upper bound of files inspected in ignored content (keeps lookup bounded in huge dependency trees).
 */
const MAX_IGNORED_FILES = 60_000;

/**
 * Lookup tier (tier 1 are the engine built-ins).
 *
 * - 2: non-ignored common locations (`agents/`, `tasks/`, `chats/`)
 * - 3: other non-ignored project Books
 * - 4: Git-ignored project content (e.g. `node_modules`)
 *
 * @private Book index
 */
export type BookTier = 2 | 3 | 4;

/**
 * Common location of a Book, in resolution order.
 *
 * @private Book index
 */
export type CommonRoot = 'agents' | 'tasks' | 'chats';

/**
 * One Book found in the project.
 *
 * @private Book index
 */
export type BookEntry = {
    /** Declared display name (first nonempty line). */
    readonly name: string;
    /** Normalized name: the logical identity. */
    readonly normalized: string;
    /** Entity kind, or `invalid` when unclassifiable/conflicting. */
    readonly kind: EntityKind | 'invalid';
    /** Absolute path. */
    readonly path: string;
    /** Project-relative POSIX path. */
    readonly relativePath: string;
    /** Lookup tier. */
    readonly tier: BookTier;
    /** Common location, when inside one. */
    readonly root?: CommonRoot;
    /** Nesting depth below its common root (tier 2) or the project root. */
    readonly depth: number;
    /** Inside a hidden directory (supporting definitions such as `agents/.core/`). */
    readonly hidden: boolean;
    /** Inside `agents/.core/`. */
    readonly core: boolean;
    /** Parsed document. */
    readonly document: BookDocument;
    /** Content hash. */
    readonly hash: string;
};

/**
 * A problem of the project's Books, located in a file.
 *
 * @private Book index
 */
export type BookDiagnostic = {
    readonly path: string;
    readonly line: number;
    readonly message: string;
    readonly severity: 'error' | 'warning';
};

/**
 * Result of resolving a name.
 *
 * @private Book index
 */
export type NameResolution =
    | { readonly kind: 'non-agent'; readonly name: NonAgentName }
    | { readonly kind: 'book'; readonly entry: BookEntry; readonly shadowed: readonly BookEntry[] }
    | { readonly kind: 'missing'; readonly incomplete?: string }
    | { readonly kind: 'invalid'; readonly reason: string };

/**
 * Order of common roots.
 */
const ROOT_ORDER: Readonly<Record<CommonRoot, number>> = { agents: 0, tasks: 1, chats: 2 };

/**
 * Deterministic resolution order: tier, shallow before deep, common-root order, then path.
 *
 * @private Book index
 */
export function compareEntries(a: BookEntry, b: BookEntry): number {
    return a.tier - b.tier || a.depth - b.depth || (a.root ? ROOT_ORDER[a.root] : 3) - (b.root ? ROOT_ORDER[b.root] : 3) || (a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0);
}

/**
 * Recursively collects `.book` files without following directory symlinks out of the project.
 */
async function walkBooks(directory: string, root: string, budget: { files: number }, skip: (path: string, name: string) => boolean): Promise<string[]> {
    const found: string[] = [];
    const stack = [directory];
    while (stack.length) {
        const current = stack.pop()!;
        for (const entry of await listDirectory(current)) {
            if (--budget.files < 0) return found;
            const path = join(current, entry.name);
            if (entry.isDirectory) {
                if (entry.name === '.git' || entry.name === RUNTIME_DIRECTORY_NAME || skip(path, entry.name)) continue;
                stack.push(path);
            } else if ((entry.isFile || entry.isSymbolicLink) && entry.name.toLowerCase().endsWith('.book')) {
                if (entry.isSymbolicLink) {
                    try {
                        if (!isPathInside(await realpath(root), await realpath(path))) continue;
                    } catch {
                        continue;
                    }
                }
                found.push(path);
            }
        }
    }
    return found;
}

/**
 * Locations of the common Book roots.
 *
 * @private Book index
 */
export type BookLocations = { readonly agents: string; readonly tasks: string; readonly chats?: string };

/**
 * Every named Book of a project with one deterministic resolver for agents, tasks and chats.
 *
 * Read-only: discovery never creates or rewrites files. Duplicates are shadowed (first wins) and diagnosed.
 *
 * @private Book index
 */
export class BookIndex {
    private readonly entries: BookEntry[] = [];
    /** Problems found while indexing. */
    public readonly diagnostics: BookDiagnostic[] = [];
    private ignoredLoaded = false;
    private ignoredIncomplete?: string;
    private readonly roots: ReadonlyArray<{ readonly root: CommonRoot; readonly path: string }>;

    private constructor(
        /** Absolute project root. */
        public readonly projectRoot: string,
        locations: BookLocations,
        private readonly inGit: boolean,
    ) {
        this.roots = [
            { root: 'agents', path: resolve(projectRoot, locations.agents) },
            { root: 'tasks', path: resolve(projectRoot, locations.tasks) },
            { root: 'chats', path: resolve(projectRoot, locations.chats ?? CHATS_DIRECTORY) },
        ];
    }

    /** Absolute directory of a common root. */
    public rootPath(root: CommonRoot): string {
        return this.roots.find((item) => item.root === root)!.path;
    }

    /**
     * Indexes the non-ignored tiers (2 and 3); the ignored tier is loaded only when a lookup needs it.
     */
    public static async load(projectRoot: string, locations: BookLocations = { agents: 'agents', tasks: 'tasks' }): Promise<BookIndex> {
        const gitInfo = await inspectGit(projectRoot);
        const index = new BookIndex(projectRoot, locations, gitInfo.state === 'repository');
        const budget = { files: MAX_IGNORED_FILES };
        const files = index.inGit
            ? (await listProjectFiles(projectRoot)).filter((path) => path.toLowerCase().endsWith('.book'))
            : await walkBooks(projectRoot, projectRoot, budget, (path, name) => name === 'node_modules' || index.excluded(path));
        for (const path of files) if (!index.excluded(path)) await index.add(path, false);
        index.finish();
        return index;
    }

    /** Paths never indexed: runtime state, traces evidence and task templates. */
    private excluded(path: string): boolean {
        if (path.split(sep).includes(RUNTIME_DIRECTORY_NAME) || path.split(sep).includes('.git')) return true;
        if (isPathInside(join(this.projectRoot, TRACES_DIRECTORY), path)) return true;
        return isPathInside(join(this.rootPath('tasks'), 'templates'), path);
    }

    /**
     * Reads and classifies one Book.
     */
    private async add(path: string, ignored: boolean): Promise<void> {
        const absolute = resolve(path);
        if (this.entries.some((entry) => entry.path === absolute)) return;
        let source: string;
        try {
            source = await readFile(absolute, 'utf8');
        } catch (error) {
            this.diagnostics.push({ path: toProjectRelative(this.projectRoot, absolute), line: 0, message: `Unreadable Book: ${(error as Error).message}`, severity: 'warning' });
            return;
        }
        const common = this.roots.find((item) => isPathInside(item.path, absolute));
        const document = parseBook(source, { defaultKind: common ? (common.root === 'agents' ? 'agent' : common.root === 'tasks' ? 'task' : 'chat') : undefined });
        if (document.kind === 'empty') return;
        const relativePath = toProjectRelative(this.projectRoot, absolute);
        const segments = toProjectRelative(common?.path ?? this.projectRoot, absolute).split('/').slice(0, -1);
        const entry: BookEntry = {
            name: document.name,
            normalized: normalizeAgentName(document.name),
            kind: document.kind,
            path: absolute,
            relativePath,
            tier: ignored ? 4 : common ? 2 : 3,
            root: common?.root,
            depth: segments.length,
            hidden: common?.root === 'agents' && segments.some((segment) => segment.startsWith('.')),
            core: common?.root === 'agents' && segments[0] === '.core',
            document,
            hash: sha256(source),
        };
        for (const diagnostic of document.diagnostics) this.diagnostics.push({ path: relativePath, line: diagnostic.line, message: diagnostic.message, severity: diagnostic.severity });
        if (!entry.normalized) {
            this.diagnostics.push({ path: relativePath, line: document.headerLine + 1, message: 'The Book name is empty after normalization.', severity: 'error' });
            return;
        }
        const reserved = nonAgentOf(entry.normalized);
        if (reserved) {
            this.diagnostics.push({ path: relativePath, line: document.headerLine + 1, message: `"${document.name}" is reserved for the engine-supplied ${reserved}; this file cannot replace it.`, severity: 'error' });
            return;
        }
        this.entries.push(entry);
    }

    /** Sorts entries and reports shadowed duplicates. */
    private finish(): void {
        this.entries.sort(compareEntries);
        const groups = new Map<string, BookEntry[]>();
        for (const entry of this.entries) groups.set(entry.normalized, [...(groups.get(entry.normalized) ?? []), entry]);
        const reported = new Set(this.diagnostics.map((diagnostic) => diagnostic.message));
        for (const group of groups.values()) {
            if (group.length < 2) continue;
            const [winner, ...shadowed] = group;
            const message = `Name "${winner!.name}" is defined ${group.length} times: ${winner!.relativePath} (${winner!.kind}) wins; shadowed: ${shadowed.map((entry) => `${entry.relativePath} (${entry.kind})`).join(', ')}.`;
            if (reported.has(message)) continue;
            this.diagnostics.push({ path: shadowed[0]!.relativePath, line: 0, message, severity: 'warning' });
        }
    }

    /**
     * Loads Git-ignored content (tier 4) once, bounded.
     */
    public async loadIgnoredTier(): Promise<void> {
        if (this.ignoredLoaded) return;
        this.ignoredLoaded = true;
        const budget = { files: MAX_IGNORED_FILES };
        try {
            const candidates = this.inGit ? await listIgnoredEntries(this.projectRoot) : [join(this.projectRoot, 'node_modules')];
            for (const entry of candidates) {
                if (this.excluded(entry)) continue;
                if (entry.toLowerCase().endsWith('.book')) await this.add(entry, true);
                else for (const path of await walkBooks(entry, this.projectRoot, budget, (candidate) => this.excluded(candidate))) await this.add(path, true);
                if (budget.files < 0) break;
            }
            if (budget.files < 0) this.ignoredIncomplete = `the ignored-content search stopped after ${MAX_IGNORED_FILES} entries`;
        } catch (error) {
            this.ignoredIncomplete = `the ignored-content search failed: ${(error as Error).message}`;
        }
        this.finish();
    }

    /** Every indexed Book in resolution order. */
    public all(): readonly BookEntry[] {
        return this.entries;
    }

    /** Books of one kind that win their name (not shadowed). */
    public winners(kind?: EntityKind): BookEntry[] {
        return this.entries.filter((entry) => (!kind || entry.kind === kind) && this.winnerOf(entry.normalized) === entry);
    }

    /** The winning Book of a normalized name among loaded tiers. */
    public winnerOf(normalized: string): BookEntry | undefined {
        return this.entries.find((entry) => entry.normalized === normalized);
    }

    /** Normalized names of every loaded Book (for distinct new names). */
    public names(): Set<string> {
        return new Set(this.entries.map((entry) => entry.normalized));
    }

    /**
     * Resolves a reference (`@Name`, `{Name}` or a bare name): built-ins, then the ordered tiers; first match wins.
     */
    public async resolve(reference: string): Promise<NameResolution> {
        const parsed = parseReferenceValue(reference);
        if (!parsed) return { kind: 'invalid', reason: `"${reference}" is not a valid name reference.` };
        const nonAgent = nonAgentOf(parsed.normalized);
        if (nonAgent) return { kind: 'non-agent', name: nonAgent };
        let matches = this.entries.filter((entry) => entry.normalized === parsed.normalized);
        if (!matches.length) {
            await this.loadIgnoredTier();
            matches = this.entries.filter((entry) => entry.normalized === parsed.normalized);
        }
        if (!matches.length) return { kind: 'missing', incomplete: this.ignoredIncomplete };
        return { kind: 'book', entry: matches[0]!, shadowed: matches.slice(1) };
    }
}

import { readFile, readdir, realpath } from 'fs/promises';
import { dirname, isAbsolute, join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { spaceTrim } from 'spacetrim';
import { normalizeAgentName } from '../../../book-2.0/agent-source/normalizeAgentName';
import { parseAgentSource } from '../../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import type { TeammateProfile } from '../../../book-2.0/agent-source/TeammateProfileResolver';
import { NotFoundError } from '../../../errors/NotFoundError';
import { ParseError } from '../../../errors/ParseError';
import { isValidAgentUrl } from '../../../utils/validators/url/isValidAgentUrl';
import { ADAM_AGENT_BOOK_RELATIVE_PATH, ensureAdamAgentBook } from './ensureAdamAgentBook';

/**
 * A book's source and identity, retaining its location for nested relative references.
 *
 * @private internal type of CLI agent resolution
 */
export type LocalAgentBook = {
    readonly url: string;
    readonly filePath?: string;
    readonly source: string_book;
    readonly profile: TeammateProfile;
};

/**
 * Internal URLs allow the shared Book commitments to identify local books without an HTTP server.
 * These identifiers are always intercepted by this collection and are never fetched.
 */
const LOCAL_AGENT_URL_PREFIX = 'https://local-agent.promptbook/';

/**
 * Directories which cannot contain project-owned agent definitions.
 */
const IGNORED_DIRECTORY_NAMES = new Set(['.git', 'node_modules']);

/**
 * Reads repository books and indexes their first-line names for CLI reference resolution.
 *
 * @private internal utility of CLI agent resolution
 */
export class LocalAgentBookCollection {
    private readonly booksByUrl = new Map<string, LocalAgentBook>();
    private readonly booksByName = new Map<string, LocalAgentBook[]>();
    /** Stable default ancestor selected from the initial repository scan. */
    private adamAgentUrl: string | undefined;
    /** Files initialized by this collection, for the coder's normal commit handling. */
    public readonly createdAgentBookPaths: string[] = [];

    /** Creates a collection rooted at the primary book's directory. */
    public constructor(private readonly agentDirectoryPath: string, private readonly currentWorkingDirectory: string) {}

    /** Discovers nested books, including the hidden `.core` directory. */
    public async initialize(): Promise<void> {
        await this.readDirectory(this.agentDirectoryPath);
    }

    /** Identifies the default ancestor without creating an unused book for FROM null/void. */
    public getAdamAgentUrl(): string {
        this.adamAgentUrl ??= this.booksByName.has(normalizeAgentName('Adam'))
            ? this.findByName('Adam').url
            : createLocalAgentBookUrl(join(this.agentDirectoryPath, ADAM_AGENT_BOOK_RELATIVE_PATH));
        return this.adamAgentUrl;
    }

    /** Resolves a unique first-line name, refusing ambiguous matches. */
    public findByName(name: string): LocalAgentBook {
        const matches = this.booksByName.get(normalizeAgentName(name)) || [];
        if (matches.length === 1) {
            return matches[0]!;
        }

        if (matches.length > 1) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                Agent reference \`${name}\` is ambiguous. Use an explicit book path.

                Matching books:
                ${block(matches.map((book) => `- \`${book.filePath || book.url}\``).join('\n'))}
            `,
                ),
            );
        }

        throw new NotFoundError(
            spaceTrim(`
            Agent \`${name}\` was not found in \`${this.agentDirectoryPath}\` or its subdirectories.

            References use the agent's **first-line name**. You can also use an explicit \`.book\` path or URL.
        `),
        );
    }

    /** Resolves a name, a path relative to its declaring book, or a path relative to the CLI cwd. */
    public async resolveReference(reference: string, declaringBook: LocalAgentBook): Promise<string> {
        const isRemoteReference = Boolean(isValidAgentUrl(reference));
        if (isRemoteReference) {
            return reference;
        }

        const isBookPath = /\.book$/i.test(reference) || isAbsolute(reference);
        if (!isBookPath) {
            if (normalizeAgentName(reference) === normalizeAgentName('Adam')) {
                return this.getAdamAgentUrl();
            }
            return this.findByName(reference).url;
        }

        const isRelativeToBook = /^\.{1,2}[\\/]/.test(reference);
        if (!declaringBook.filePath && isRelativeToBook) {
            return new URL(reference.replaceAll('\\', '/'), declaringBook.url).href;
        }

        const directoryPath =
            isRelativeToBook && declaringBook.filePath ? dirname(declaringBook.filePath) : this.currentWorkingDirectory;
        return (await this.readBook(resolve(directoryPath, reference))).url;
    }

    /** Reads a local book once, canonicalizing symlinks so aliases cannot bypass cycle detection. */
    public async readBook(filePath: string): Promise<LocalAgentBook> {
        try {
            const canonicalFilePath = await realpath(filePath);
            const url = createLocalAgentBookUrl(canonicalFilePath);
            const existingBook = this.booksByUrl.get(url);
            if (existingBook) {
                return existingBook;
            }

            return this.registerBook(url, await readFile(canonicalFilePath, 'utf-8'), canonicalFilePath);
        } catch (error) {
            if (['ENOENT', 'EISDIR', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code || '')) {
                throw new NotFoundError(spaceTrim(`Agent book \`${filePath}\` was not found or is not a file.`));
            }
            throw error;
        }
    }

    /** Loads a referenced remote book, while keeping local identifiers entirely inside the collection. */
    public async getBook(url: string): Promise<LocalAgentBook> {
        const existingBook = this.booksByUrl.get(url);
        if (existingBook) {
            return existingBook;
        }
        if (url === this.getAdamAgentUrl()) {
            const adamBookPath = join(this.agentDirectoryPath, ADAM_AGENT_BOOK_RELATIVE_PATH);
            if ((await ensureAdamAgentBook(this.agentDirectoryPath)) === 'created') {
                this.createdAgentBookPaths.push(adamBookPath);
            }
            const adamBook = await this.readBook(adamBookPath);
            this.booksByUrl.set(url, adamBook);
            return adamBook;
        }
        if (url.startsWith(LOCAL_AGENT_URL_PREFIX)) {
            throw new NotFoundError(spaceTrim(`Local agent book \`${url}\` is not registered.`));
        }

        const bookUrl = new URL(url);
        if (!/\.(book|md)$/i.test(bookUrl.pathname) && !bookUrl.pathname.endsWith('/api/book')) {
            bookUrl.pathname = bookUrl.pathname.replace(/\/$/, '') + '/api/book';
        }
        const response = await fetch(bookUrl.href);
        if (!response.ok) {
            throw new NotFoundError(
                spaceTrim(`Cannot load agent book \`${url}\`: **${response.status} ${response.statusText}**.`),
            );
        }
        let source: unknown;
        if (response.headers.get('content-type')?.includes('application/json')) {
            const payload: unknown = await response.json();
            source = typeof payload === 'string' ? payload : (payload as { source?: unknown } | null)?.source;
        } else {
            source = await response.text();
        }
        if (typeof source !== 'string') {
            throw new ParseError(spaceTrim(`Agent book \`${url}\` did not return a text source.`));
        }
        return this.registerBook(url, source);
    }

    /** Adds a book under its normalized first-line name and preserves the display name for TEAM. */
    private registerBook(url: string, source: string, filePath?: string): LocalAgentBook {
        const agentSource = source as string_book;
        const parsedSource = parseAgentSource(agentSource);
        const book: LocalAgentBook = {
            url,
            filePath,
            source: agentSource,
            profile: {
                agentName: parsedSource.meta.fullname || parsedSource.agentName,
                personaDescription: parsedSource.personaDescription,
            },
        };
        this.booksByUrl.set(url, book);
        // Remote titles must not shadow repository-local names.
        if (filePath) {
            const agentName = normalizeAgentName(parsedSource.agentName);
            this.booksByName.set(agentName, [...(this.booksByName.get(agentName) || []), book]);
        }
        return book;
    }

    /** Walks real directories in deterministic order without following directory symlink loops. */
    private async readDirectory(directoryPath: string): Promise<void> {
        const entries = await readdir(directoryPath, { withFileTypes: true });
        for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
            const entryPath = join(directoryPath, entry.name);
            if (entry.isDirectory() && !IGNORED_DIRECTORY_NAMES.has(entry.name)) {
                await this.readDirectory(entryPath);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.book')) {
                await this.readBook(entryPath);
            }
        }
    }
}

/** Creates an internal URL for a local path without requiring that the file already exists. */
function createLocalAgentBookUrl(filePath: string): string {
    return LOCAL_AGENT_URL_PREFIX + encodeURIComponent(pathToFileURL(filePath).href);
}

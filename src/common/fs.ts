import { createHash, randomBytes } from 'node:crypto';
import { constants, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { access, chmod, lstat, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { PtbkError } from './errors.js';

/**
 * Error codes of transient Windows file-sharing failures that justify a bounded retry.
 */
const TRANSIENT_FILE_ERRORS = new Set(['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY']);

/**
 * Maximal number of attempts for an atomic replacement during transient sharing failures.
 */
const ATOMIC_RENAME_ATTEMPTS = 12;

/**
 * Checks whether a path exists (following symlinks).
 *
 * @private shared filesystem helper
 */
export async function pathExists(path: string): Promise<boolean> {
    try {
        await access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Checks whether a path is an existing directory.
 *
 * @private shared filesystem helper
 */
export async function isDirectory(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}

/**
 * Reads a UTF-8 file or returns `undefined` when it does not exist.
 *
 * @private shared filesystem helper
 */
export async function readTextIfExists(path: string): Promise<string | undefined> {
    try {
        return await readFile(path, 'utf8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw error;
    }
}

/**
 * Reads and parses a JSON file or returns `undefined` when it does not exist.
 *
 * Invalid JSON is an error that names the file.
 *
 * @private shared filesystem helper
 */
export async function readJsonIfExists<T>(path: string): Promise<T | undefined> {
    const text = await readTextIfExists(path);
    if (text === undefined) return undefined;
    try {
        return JSON.parse(text) as T;
    } catch (error) {
        throw new PtbkError(`Invalid JSON in ${path}`, { kind: 'configuration', reason: (error as Error).message, cause: error });
    }
}

/**
 * Creates a directory (recursively) and returns it.
 *
 * @private shared filesystem helper
 */
export async function ensureDirectory(path: string): Promise<string> {
    await mkdir(path, { recursive: true });
    return path;
}

/**
 * Atomically replaces a file: the content is written to a sibling temporary file and renamed.
 *
 * Transient Windows sharing failures are retried a bounded number of times; the destination is never deleted
 * to force the replacement.
 *
 * @private shared filesystem helper
 */
export async function writeFileAtomic(path: string, content: string | Uint8Array, options: { mode?: number } = {}): Promise<void> {
    await ensureDirectory(dirname(path));
    const temporary = `${path}.${randomBytes(6).toString('hex')}.tmp`;
    await writeFile(temporary, content, options.mode === undefined ? undefined : { mode: options.mode });
    for (let attempt = 1; ; attempt++) {
        try {
            await rename(temporary, path);
            if (options.mode !== undefined) await chmod(path, options.mode).catch(() => undefined);
            return;
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code ?? '';
            if (!TRANSIENT_FILE_ERRORS.has(code) || attempt >= ATOMIC_RENAME_ATTEMPTS) {
                await rm(temporary, { force: true }).catch(() => undefined);
                throw error;
            }
            await sleep(25 * attempt);
        }
    }
}

/**
 * Synchronous {@link writeFileAtomic} for small runtime records that must be durable before a synchronous operation
 * returns (e.g. an accepted pause, or a just-spawned owned process). Transient Windows sharing failures are retried a
 * few times without waiting.
 *
 * @private shared filesystem helper
 */
export function writeFileAtomicSync(path: string, content: string, options: { mode?: number } = {}): void {
    mkdirSync(dirname(path), { recursive: true });
    const temporary = `${path}.${randomBytes(6).toString('hex')}.tmp`;
    writeFileSync(temporary, content, options.mode === undefined ? undefined : { mode: options.mode });
    for (let attempt = 1; ; attempt++) {
        try {
            renameSync(temporary, path);
            return;
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code ?? '';
            if (!TRANSIENT_FILE_ERRORS.has(code) || attempt >= ATOMIC_RENAME_ATTEMPTS) {
                rmSync(temporary, { force: true });
                throw error;
            }
        }
    }
}

/**
 * Atomically writes JSON with a trailing newline.
 *
 * @private shared filesystem helper
 */
export async function writeJsonAtomic(path: string, value: unknown, options: { mode?: number } = {}): Promise<void> {
    await writeFileAtomic(path, `${JSON.stringify(value, null, 4)}\n`, options);
}

/**
 * Checks whether `child` is equal to or inside `parent` (purely lexical).
 *
 * @private shared filesystem helper
 */
export function isPathInside(parent: string, child: string): boolean {
    const relation = relative(resolve(parent), resolve(child));
    return relation === '' || (!relation.startsWith('..') && !isAbsolute(relation));
}

/**
 * Resolves the real path of the nearest existing ancestor of `path` and re-appends the missing tail.
 */
async function realpathOfNearestAncestor(path: string): Promise<string> {
    const missing: string[] = [];
    let current = resolve(path);
    for (;;) {
        try {
            const real = await realpath(current);
            return missing.length ? join(real, ...missing.reverse()) : real;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            const parent = dirname(current);
            if (parent === current) return resolve(path);
            missing.push(current.slice(parent.length + (parent.endsWith(sep) ? 0 : 1)));
            current = parent;
        }
    }
}

/**
 * Resolves `target` (relative to `root`) and verifies that it cannot escape `root` through `..` or symlinks.
 *
 * @private shared filesystem helper
 */
export async function confinePath(root: string, target: string): Promise<string> {
    const resolved = resolve(root, target);
    const realRoot = await realpathOfNearestAncestor(root);
    const realTarget = await realpathOfNearestAncestor(resolved);
    if (!isPathInside(realRoot, realTarget)) {
        throw new PtbkError(`Refusing to access ${target}: it is outside the selected project.`, {
            kind: 'conflict',
            project: root,
            reason: `${realTarget} escapes ${realRoot}`,
            next: ['Use paths inside the project directory.'],
        });
    }
    return resolved;
}

/**
 * Converts an absolute path to a project-relative POSIX path for display and Git.
 *
 * @private shared filesystem helper
 */
export function toProjectRelative(root: string, path: string): string {
    return relative(root, path).split(sep).join('/');
}

/**
 * Lists directory entries, returning an empty list for a missing directory.
 *
 * @private shared filesystem helper
 */
export async function listDirectory(path: string): Promise<{ name: string; isDirectory: boolean; isFile: boolean; isSymbolicLink: boolean }[]> {
    try {
        const entries = await readdir(path, { withFileTypes: true });
        return entries
            .map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory(), isFile: entry.isFile(), isSymbolicLink: entry.isSymbolicLink() }))
            .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ENOTDIR') return [];
        throw error;
    }
}

/**
 * Checks whether a path is a symbolic link.
 *
 * @private shared filesystem helper
 */
export async function isSymbolicLink(path: string): Promise<boolean> {
    try {
        return (await lstat(path)).isSymbolicLink();
    } catch {
        return false;
    }
}

/**
 * SHA-256 hex digest of a text or binary value.
 *
 * @private shared filesystem helper
 */
export function sha256(content: string | Uint8Array): string {
    return createHash('sha256').update(content).digest('hex');
}

/**
 * SHA-256 of a file's bytes, or `undefined` when the file is missing.
 *
 * @private shared filesystem helper
 */
export async function hashFileIfExists(path: string): Promise<string | undefined> {
    try {
        return sha256(await readFile(path));
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ENOENT' || code === 'EISDIR') return undefined;
        throw error;
    }
}

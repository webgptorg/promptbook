import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';

/**
 * Whether POSIX ownership and modes protect files on this platform.
 */
const POSIX_MODES = process.platform !== 'win32';

/**
 * Refuses an App data directory or file that is a symbolic link, of the wrong type, owned by another user or
 * accessible to group or others. Names the path and mode, never the content.
 *
 * @private App connection
 */
export async function assertPrivate(path: string, kind: 'directory' | 'file'): Promise<void> {
    const stats = await lstat(path);
    if (stats.isSymbolicLink()) throw new PtbkError(`The App connection refuses ${path}: it is a symbolic link.`, { kind: 'configuration' });
    if (kind === 'directory' ? !stats.isDirectory() : !stats.isFile()) throw new PtbkError(`The App connection refuses ${path}: it is not a ${kind === 'directory' ? 'directory' : 'regular file'}.`, { kind: 'configuration' });
    if (!POSIX_MODES) return;
    const uid = process.getuid?.();
    if (uid !== undefined && stats.uid !== uid) throw new PtbkError(`The App connection refuses ${path}: it is owned by user ${String(stats.uid)}, not by this engine's user ${String(uid)}.`, { kind: 'configuration' });
    const mode = stats.mode & 0o777;
    if (mode & 0o077) throw new PtbkError(`The App connection refuses ${path}: its mode is ${mode.toString(8).padStart(4, '0')}; it must not be accessible to group or others (${kind === 'directory' ? '0700' : '0600'}).`, { kind: 'configuration' });
}

/**
 * Creates the App data directory (mode 0700) when missing and checks that it is private.
 *
 * @private App connection
 */
export async function ensurePrivateDirectory(path: string): Promise<void> {
    try {
        await lstat(path);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        await mkdir(path, { recursive: true, mode: 0o700 });
        if (POSIX_MODES) await chmod(path, 0o700);
    }
    await assertPrivate(path, 'directory');
}

/**
 * Flushes a directory entry (skipped where the platform cannot open directories).
 *
 * @private App connection
 */
export async function syncDirectory(directory: string): Promise<void> {
    if (!POSIX_MODES) return;
    const handle = await open(directory, constants.O_RDONLY);
    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}

/**
 * Writes a new private file (mode 0600) exclusively, flushing it and then its directory. Fails with `EEXIST` when the
 * file exists.
 *
 * @private App connection
 */
export async function createPrivateFile(directory: string, name: string, content: string | Uint8Array): Promise<void> {
    const handle = await open(join(directory, name), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    try {
        await handle.writeFile(content);
        await handle.sync();
    } finally {
        await handle.close();
    }
    await syncDirectory(directory);
}

/**
 * Replaces a private file durably: a fresh 0600 temporary file is written and flushed, renamed over the target and
 * the directory is flushed, so a crash leaves either the old or the new content.
 *
 * @private App connection
 */
export async function writePrivateFile(directory: string, name: string, content: string): Promise<void> {
    const temporary = `.${name}.${randomBytes(6).toString('hex')}.tmp`;
    await createPrivateFile(directory, temporary, content);
    try {
        for (let attempt = 1; ; attempt++) {
            try {
                await rename(join(directory, temporary), join(directory, name));
                break;
            } catch (error) {
                const code = (error as NodeJS.ErrnoException).code ?? '';
                if (!['EPERM', 'EACCES', 'EBUSY'].includes(code) || attempt >= 8) throw error;
                await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
            }
        }
    } catch (error) {
        await rm(join(directory, temporary), { force: true }).catch(() => undefined);
        throw error;
    }
    await syncDirectory(directory);
}

/**
 * Reads a private file after checking it, or `undefined` when it does not exist.
 *
 * @private App connection
 */
export async function readPrivateFile(directory: string, name: string): Promise<string | undefined> {
    const path = join(directory, name);
    try {
        await lstat(path);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw error;
    }
    await assertPrivate(directory, 'directory');
    await assertPrivate(path, 'file');
    return await readFile(path, 'utf8');
}

/**
 * Removes a private file when it exists, flushing the directory.
 *
 * @private App connection
 */
export async function removePrivateFile(directory: string, name: string): Promise<void> {
    await rm(join(directory, name), { force: true });
    await syncDirectory(directory).catch(() => undefined);
}

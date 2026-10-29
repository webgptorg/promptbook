import { lstat, open, readdir, realpath, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { isPathInside } from '../common/fs.js';

/**
 * Kind of a project file as Files presents it (formatting is presentation only).
 *
 * @private project files
 */
export type FileKind = 'book' | 'markdown' | 'json' | 'text' | 'image' | 'video' | 'binary';

/**
 * One entry of a Files listing (never a hidden or protected path).
 *
 * @private project files
 */
export type FileEntry = {
    readonly name: string;
    /** Project-relative POSIX path. */
    readonly path: string;
    readonly type: 'directory' | 'file' | 'link-outside';
    readonly kind?: FileKind;
    readonly size?: number;
    readonly modifiedAt?: string;
};

/**
 * A listed folder.
 *
 * @private project files
 */
export type FolderView = { readonly path: string; readonly entries: readonly FileEntry[]; readonly truncated: boolean };

/**
 * One opened file: text content (bounded) for readable kinds, an image as a data URI when small enough, otherwise only
 * truthful file information.
 *
 * @private project files
 */
export type FileView = {
    readonly path: string;
    readonly name: string;
    readonly kind: FileKind;
    readonly size: number;
    readonly modifiedAt: string;
    readonly text?: string;
    /** Only part of a long text was read (the rest stays on disk; nothing is rewritten). */
    readonly truncated?: boolean;
    /** `data:` URI of a supported image for the browser view. */
    readonly image?: string;
    readonly mime?: string;
};

/**
 * Most entries listed in one folder.
 */
const MAX_ENTRIES = 2000;

/**
 * Most bytes of one text file read for viewing.
 */
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

/**
 * Largest image returned for display.
 */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Image types displayed (SVG only as an image, where it cannot run scripts).
 */
const IMAGE_TYPES: Readonly<Record<string, string>> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

/**
 * Video types recognized (identified, never played or converted here).
 */
const VIDEO_TYPES = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi']);

/**
 * Text types shown as plain text.
 */
const TEXT_TYPES = new Set(['.txt', '.log', '.csv', '.tsv', '.yml', '.yaml', '.toml', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.html', '.xml', '.sh', '.py', '.rb', '.go', '.rs', '.java', '.c', '.h', '.ini', '.jsonl', '']);

/**
 * Whether a name is hidden or protected (dot entries such as `.git`, `.ptbk`, `.env`; never listed or opened).
 */
function hiddenName(name: string): boolean {
    return name.startsWith('.');
}

/**
 * Kind of a file by its name.
 *
 * @private project files
 */
export function fileKind(name: string): FileKind {
    const extension = extname(name).toLowerCase();
    if (extension === '.book') return 'book';
    if (extension === '.md' || extension === '.markdown') return 'markdown';
    if (extension === '.json') return 'json';
    if (IMAGE_TYPES[extension]) return 'image';
    if (VIDEO_TYPES.has(extension)) return 'video';
    if (TEXT_TYPES.has(extension)) return 'text';
    return 'binary';
}

/**
 * Resolves a project-relative path inside the project, refusing hidden segments, escapes and links that lead outside.
 */
async function confined(projectRoot: string, path: string): Promise<{ readonly absolute: string; readonly relativePath: string }> {
    const normalized = path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const segments = normalized ? normalized.split('/') : [];
    if (segments.some((segment) => segment === '..' || hiddenName(segment))) throw new PtbkError(`${path} is not an accessible project path.`, { kind: 'usage', next: ['Files shows nonhidden project content only.'] });
    const absolute = resolve(projectRoot, ...segments);
    const root = await realpath(projectRoot);
    const real = await realpath(absolute).catch(() => undefined);
    if (!real) throw new PtbkError(`${normalized || '.'} no longer exists.`, { kind: 'not-found' });
    if (real !== root && !isPathInside(root, real)) throw new PtbkError(`${normalized} leads outside the project and is not opened.`, { kind: 'usage' });
    return { absolute, relativePath: normalized };
}

/**
 * Lists one project folder for Files: nonhidden entries only, folders first, real names, sizes and times; a link that
 * leads outside the project is shown but never followed. Read-only.
 *
 * @private project files
 */
export async function listFolder(projectRoot: string, path = ''): Promise<FolderView> {
    const { absolute, relativePath } = await confined(projectRoot, path);
    if (!(await stat(absolute)).isDirectory()) throw new PtbkError(`${relativePath} is not a folder.`, { kind: 'usage' });
    const root = await realpath(projectRoot);
    const names = (await readdir(absolute)).filter((name) => !hiddenName(name)).sort((a, b) => a.localeCompare(b));
    const entries: FileEntry[] = [];
    for (const name of names.slice(0, MAX_ENTRIES)) {
        const child = join(absolute, name);
        const childPath = relativePath ? `${relativePath}/${name}` : name;
        const link = await lstat(child).catch(() => undefined);
        if (!link) continue;
        if (link.isSymbolicLink()) {
            const real = await realpath(child).catch(() => undefined);
            if (!real || (real !== root && !isPathInside(root, real))) {
                entries.push({ name, path: childPath, type: 'link-outside' });
                continue;
            }
        }
        const info = await stat(child).catch(() => undefined);
        if (!info) continue;
        entries.push(info.isDirectory() ? { name, path: childPath, type: 'directory', modifiedAt: info.mtime.toISOString() } : { name, path: childPath, type: 'file', kind: fileKind(name), size: info.size, modifiedAt: info.mtime.toISOString() });
    }
    entries.sort((a, b) => Number(b.type === 'directory') - Number(a.type === 'directory') || a.name.localeCompare(b.name));
    return { path: relativePath, entries, truncated: names.length > MAX_ENTRIES };
}

/**
 * Opens one project file for viewing: bounded text of readable kinds (JSON pretty-printed when valid), a small image as
 * a data URI, otherwise truthful file information. Never writes, formats on disk or executes anything.
 *
 * @private project files
 */
export async function readProjectFile(projectRoot: string, path: string): Promise<FileView> {
    const { absolute, relativePath } = await confined(projectRoot, path);
    const info = await stat(absolute);
    if (!info.isFile()) throw new PtbkError(`${relativePath} is not a file.`, { kind: 'usage' });
    const name = relativePath.split('/').pop() ?? relativePath;
    const kind = fileKind(name);
    const base: FileView = { path: relativePath.split(sep).join('/'), name, kind, size: info.size, modifiedAt: info.mtime.toISOString() };
    if (kind === 'video' || kind === 'binary') return base;
    const read = async (limit: number): Promise<Buffer> => {
        const handle = await open(absolute, 'r');
        try {
            const buffer = Buffer.alloc(Math.min(limit, info.size));
            await handle.read(buffer, 0, buffer.length, 0);
            return buffer;
        } finally {
            await handle.close();
        }
    };
    if (kind === 'image') {
        const mime = IMAGE_TYPES[extname(name).toLowerCase()]!;
        if (info.size > MAX_IMAGE_BYTES) return { ...base, mime };
        return { ...base, mime, image: `data:${mime};base64,${(await read(MAX_IMAGE_BYTES)).toString('base64')}` };
    }
    const bytes = await read(MAX_TEXT_BYTES);
    if (bytes.includes(0)) return { ...base, kind: 'binary' };
    let text = bytes.toString('utf8');
    const truncated = info.size > MAX_TEXT_BYTES;
    if (kind === 'json' && !truncated) {
        try {
            text = JSON.stringify(JSON.parse(text), null, 4);
        } catch {
            // Invalid JSON is shown as it is.
        }
    }
    return { ...base, text, ...(truncated ? { truncated: true } : {}) };
}

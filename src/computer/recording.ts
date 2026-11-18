import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { Project } from '../project/workspace.js';

/** Deliberately small local-only retention bounds; no desktop media is ever staged as task evidence. */
const MAX_BYTES = 100 * 1024 * 1024;
/** Local opted-in screenshots expire after one week, independently of task trace retention. */
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;

/**
 * Save an explicitly opted-in agent screenshot in ignored runtime storage, bounded by age and total bytes.
 * Owner takeover screenshots, clipboard and accessibility payloads are never recorded here.
 * Images cannot be reliably redacted; keeping this disabled is the default privacy boundary.
 * @private computer control
 */
export async function recordComputerScreenshot(project: Project, result: Readonly<Record<string, unknown>>): Promise<void> {
    if (typeof result.data !== 'string' || result.mimeType !== 'image/png') return;
    const bytes = Buffer.from(result.data, 'base64');
    if (!bytes.length || bytes.length > MAX_BYTES || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return;
    const directory = join(project.runtime.root, 'computer-recordings');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const name = `${Date.now()}-${randomBytes(8).toString('hex')}.png`;
    await writeFile(join(directory, name), bytes, { mode: 0o600, flag: 'wx' });
    const files = await Promise.all((await readdir(directory)).filter((file) => file.endsWith('.png')).map(async (file) => ({ file, ...await stat(join(directory, file)) })));
    files.sort((a, b) => b.mtimeMs - a.mtimeMs);
    let total = 0;
    for (const entry of files) {
        total += entry.size;
        if (total > MAX_BYTES || Date.now() - entry.mtimeMs > MAX_AGE_MS) await rm(join(directory, entry.file), { force: true });
    }
}

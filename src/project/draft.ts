import { copyFile, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ensureDirectory } from '../common/fs.js';
import { shortHash } from '../common/ids.js';
import { userDataDirectory } from '../harness/maintenance.js';
import type { ComposedSegment } from '../ui/composer.js';

/**
 * A draft older than this is discarded instead of offered again.
 */
const DRAFT_LIFETIME_MS = 14 * 24 * 3_600_000;

/**
 * Saved initial input of an init that stopped for an engine update.
 *
 * @private setup drafts
 */
export type SetupDraft = { readonly savedAt: string; readonly cwd: string; readonly segments: readonly ComposedSegment[] };

/**
 * Bounded draft location of an invocation directory (outside the not-yet-initialized destination).
 */
function draftDirectory(cwd: string): string {
    return join(userDataDirectory(), 'drafts', shortHash(cwd, 16));
}

/**
 * Preserves accepted intent and copies of its attachments so the rerun does not need them pasted again.
 *
 * @private setup drafts
 */
export async function saveSetupDraft(cwd: string, segments: readonly ComposedSegment[]): Promise<string> {
    const directory = await ensureDirectory(draftDirectory(cwd));
    const saved: ComposedSegment[] = [];
    let index = 0;
    for (const segment of segments) {
        if (segment.type === 'text') {
            saved.push(segment);
            continue;
        }
        const target = join(directory, `${++index}-${basename(segment.path)}`);
        await copyFile(segment.path, target);
        saved.push({ ...segment, path: target });
    }
    const draft: SetupDraft = { savedAt: new Date().toISOString(), cwd, segments: saved };
    await writeFile(join(directory, 'draft.json'), `${JSON.stringify(draft, null, 2)}\n`, { mode: 0o600 });
    return directory;
}

/**
 * Reads the draft of an invocation directory (expired drafts are removed).
 *
 * @private setup drafts
 */
export async function readSetupDraft(cwd: string): Promise<SetupDraft | undefined> {
    const directory = draftDirectory(cwd);
    try {
        const draft = JSON.parse(await readFile(join(directory, 'draft.json'), 'utf8')) as SetupDraft;
        if (Date.now() - Date.parse(draft.savedAt) > DRAFT_LIFETIME_MS) {
            await clearSetupDraft(cwd);
            return undefined;
        }
        return draft;
    } catch {
        return undefined;
    }
}

/**
 * Removes a consumed or abandoned draft with its temporary copies.
 *
 * @private setup drafts
 */
export async function clearSetupDraft(cwd: string): Promise<void> {
    await rm(draftDirectory(cwd), { recursive: true, force: true });
}

import { chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { promptbookAppData } from '../common/app-data.js';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { shortHash } from '../common/ids.js';
import { canonicalPath } from '../project/workspace.js';
import type { KeepAwakeMode } from './view.js';

/**
 * Version of the stored keep-awake preference.
 *
 * @private keep-awake
 */
export const KEEP_AWAKE_PREFERENCE_VERSION = 1;

/**
 * Length of a limited keep-awake session.
 *
 * @private keep-awake
 */
export const KEEP_AWAKE_LIMITED_MS = 2 * 60 * 60_000;

/**
 * Every saved mode.
 *
 * @private keep-awake
 */
export const KEEP_AWAKE_MODES: readonly KeepAwakeMode[] = ['off', 'limited', 'always'];

/**
 * Owner-only permissions of the preference directory.
 */
const DIRECTORY_MODE = 0o700;

/**
 * The saved keep-awake choice of one project on this host, keyed by the canonical project directory under the OS
 * user's private application data. It lives outside the project checkout and Git, so a clone elsewhere, another host or
 * another OS user starts Off. It is independent from any engine process and from the current OS request.
 *
 * @private keep-awake
 */
export type KeepAwakePreference = {
    readonly version: typeof KEEP_AWAKE_PREFERENCE_VERSION;
    readonly projectRoot: string;
    readonly mode: KeepAwakeMode;
    /** Absolute end of a limited session (ISO). */
    readonly expiresAt?: string;
    /** Closed-lid operation was explicitly chosen (macOS). */
    readonly closedLid: boolean;
    readonly updatedAt: string;
};

/**
 * A change of the saved choice.
 *
 * @private keep-awake
 */
export type KeepAwakeChange = { readonly mode?: KeepAwakeMode; readonly closedLid?: boolean };

/**
 * Directory of the keep-awake preferences of the current OS user (next to the known-project registry).
 *
 * @private keep-awake
 */
export function keepAwakeDirectory(env: NodeJS.ProcessEnv = process.env): string {
    return join(promptbookAppData(env), 'keep-awake');
}

/**
 * Files of one project's preference and its last observed work time (separate files, so the engine recording work
 * never overwrites a choice saved meanwhile).
 */
function files(projectRoot: string, env: NodeJS.ProcessEnv): { readonly preference: string; readonly work: string; readonly root: string } {
    const root = canonicalPath(projectRoot);
    const base = join(keepAwakeDirectory(env), shortHash(root, 16));
    return { preference: `${base}.json`, work: `${base}.work.json`, root };
}

/**
 * The default choice of a project that has none on this host.
 *
 * @private keep-awake
 */
export function defaultKeepAwakePreference(projectRoot: string): KeepAwakePreference {
    return { version: KEEP_AWAKE_PREFERENCE_VERSION, projectRoot: canonicalPath(projectRoot), mode: 'off', closedLid: false, updatedAt: new Date(0).toISOString() };
}

/**
 * Reads one project's saved choice; a missing, unreadable or foreign entry means Off.
 *
 * @private keep-awake
 */
export async function readKeepAwakePreference(projectRoot: string, env: NodeJS.ProcessEnv = process.env): Promise<KeepAwakePreference> {
    const { preference, root } = files(projectRoot, env);
    const stored = await readJsonIfExists<KeepAwakePreference>(preference).catch(() => undefined);
    if (!stored || stored.version !== KEEP_AWAKE_PREFERENCE_VERSION || stored.projectRoot !== root || !KEEP_AWAKE_MODES.includes(stored.mode)) return defaultKeepAwakePreference(root);
    return { ...stored, closedLid: stored.closedLid === true, ...(stored.mode === 'limited' && stored.expiresAt ? { expiresAt: stored.expiresAt } : { expiresAt: undefined }) };
}

/**
 * Whether a saved choice is in effect now: a limited session whose absolute end has passed is Off.
 *
 * @private keep-awake
 */
export function effectiveKeepAwakeMode(preference: KeepAwakePreference, now: number = Date.now()): KeepAwakeMode {
    if (preference.mode !== 'limited') return preference.mode;
    const end = Date.parse(preference.expiresAt ?? '');
    return Number.isFinite(end) && end > now ? 'limited' : 'off';
}

/**
 * Saves a changed choice. Choosing the limited mode starts a new two-hour session with an absolute end; the other
 * modes have none. The closed-lid choice is kept unless it is changed explicitly.
 *
 * @private keep-awake
 */
export async function saveKeepAwakePreference(projectRoot: string, change: KeepAwakeChange, env: NodeJS.ProcessEnv = process.env, now: number = Date.now()): Promise<KeepAwakePreference> {
    const current = await readKeepAwakePreference(projectRoot, env);
    const mode = change.mode ?? effectiveKeepAwakeMode(current, now);
    const expiresAt = mode !== 'limited' ? undefined : change.mode === 'limited' ? new Date(now + KEEP_AWAKE_LIMITED_MS).toISOString() : current.expiresAt;
    const next: KeepAwakePreference = {
        version: KEEP_AWAKE_PREFERENCE_VERSION,
        projectRoot: current.projectRoot,
        mode,
        ...(expiresAt ? { expiresAt } : {}),
        closedLid: change.closedLid ?? current.closedLid,
        updatedAt: new Date(now).toISOString(),
    };
    const directory = keepAwakeDirectory(env);
    await ensureDirectory(directory);
    await chmod(directory, DIRECTORY_MODE).catch(() => undefined);
    await writeJsonAtomic(files(projectRoot, env).preference, next, { mode: 0o600 });
    return next;
}

/**
 * Reads the last task or chat work time recorded for a project on this host.
 *
 * @private keep-awake
 */
export async function readLastWork(projectRoot: string, env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
    const stored = await readJsonIfExists<{ readonly at?: unknown }>(files(projectRoot, env).work).catch(() => undefined);
    return typeof stored?.at === 'string' && Number.isFinite(Date.parse(stored.at)) ? stored.at : undefined;
}

/**
 * Records the last task or chat work time of a project on this host (passive idle reporting only).
 *
 * @private keep-awake
 */
export async function recordLastWork(projectRoot: string, at: string, env: NodeJS.ProcessEnv = process.env): Promise<void> {
    const directory = keepAwakeDirectory(env);
    await ensureDirectory(directory);
    await chmod(directory, DIRECTORY_MODE).catch(() => undefined);
    await writeJsonAtomic(files(projectRoot, env).work, { at }, { mode: 0o600 });
}

/**
 * Parses a mode as typed by people and clients (`2h`, `on` and friends are accepted).
 *
 * @private keep-awake
 */
export function parseKeepAwakeMode(value: unknown): KeepAwakeMode | undefined {
    if (typeof value !== 'string') return undefined;
    const text = value.trim().toLowerCase();
    if (['off', 'none', 'no', 'false', 'disable', 'disabled'].includes(text)) return 'off';
    if (['limited', '2h', 'two-hours', 'timed', 'session', 'temporary'].includes(text)) return 'limited';
    if (['always', 'on', 'yes', 'true', 'enable', 'enabled', 'unattended', 'external-power'].includes(text)) return 'always';
    return undefined;
}

/**
 * Reads a change of the saved choice from control parameters (`mode`, `closedLid`), as every client sends it.
 *
 * @private keep-awake
 */
export function keepAwakeChange(params: Readonly<Record<string, unknown>>): KeepAwakeChange {
    const mode = params.mode === undefined ? undefined : parseKeepAwakeMode(params.mode);
    if (params.mode !== undefined && !mode) throw new PtbkError(`Unknown keep-awake mode "${String(params.mode)}"; use off, limited (two hours) or always.`, { kind: 'usage' });
    if (params.closedLid !== undefined && typeof params.closedLid !== 'boolean') throw new PtbkError('closedLid must be true or false.', { kind: 'usage' });
    if (mode === undefined && params.closedLid === undefined) throw new PtbkError('Give a keep-awake mode, a closed-lid choice or both.', { kind: 'usage' });
    return { ...(mode ? { mode } : {}), ...(typeof params.closedLid === 'boolean' ? { closedLid: params.closedLid } : {}) };
}

import { chmod, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promptbookAppData } from '../common/app-data.js';
import { errorMessage } from '../common/errors.js';
import { ensureDirectory, writeJsonAtomic } from '../common/fs.js';
import { ipcRequest } from '../common/ipc.js';
import { isProcessAlive } from '../common/process.js';
import { projectAt } from '../project/workspace.js';
import { ControlClient } from './control.js';
import { readProcessRecord } from './records.js';

/**
 * Version of the host-wide discovery contract (kept interoperable across engine versions).
 *
 * @private service discovery
 */
export const DISCOVERY_VERSION = 1;

/**
 * Permissions of the per-user registry directory (owner only).
 */
const REGISTRY_DIRECTORY_MODE = 0o700;

/**
 * Bound of a full snapshot request to engines without the `summary` method.
 */
const SNAPSHOT_TIMEOUT_MS = 8000;

/**
 * One running engine as registered in the host-wide discovery registry (`<app data>/services/<instance>.json`).
 *
 * It points back to the verified owner of one concrete project. It is not a project lock, a credential (no control
 * token) or a task store: connecting still requires the project's own owner-readable process record.
 *
 * @private service discovery
 */
export type DiscoveryEntry = {
    readonly version: typeof DISCOVERY_VERSION;
    /** Unique instance of the engine process. */
    readonly instanceId: string;
    /** PID of the process hosting the engine. */
    readonly pid: number;
    /** PID of the daemon supervisor, when any. */
    readonly supervisorPid?: number;
    /** Placement of the engine. */
    readonly mode: 'daemon' | 'foreground' | 'run';
    /** Canonical project directory the engine owns. */
    readonly projectRoot: string;
    /** Display name of the project. */
    readonly projectName: string;
    /** Engine version actually loaded by the process. */
    readonly engineVersion: string;
    /** Installation running the engine. */
    readonly installation: string;
    /** Local control endpoint (useless without the project's token). */
    readonly controlAddress: string;
    /** Engine start (ISO). */
    readonly startedAt: string;
};

/**
 * Directory of the registry for the current OS user (other users' engines are outside it by design).
 *
 * @private service discovery
 */
export function discoveryDirectory(env: NodeJS.ProcessEnv = process.env): string {
    return join(promptbookAppData(env), 'services');
}

/**
 * Registers a running engine; returns the owner's own unregistration (it never touches other entries).
 *
 * @private service discovery
 */
export async function registerEngine(entry: DiscoveryEntry, env: NodeJS.ProcessEnv = process.env): Promise<() => Promise<void>> {
    const directory = discoveryDirectory(env);
    await ensureDirectory(directory);
    await chmod(directory, REGISTRY_DIRECTORY_MODE).catch(() => undefined);
    const path = join(directory, `${entry.instanceId}.json`);
    await writeJsonAtomic(path, entry, { mode: 0o600 });
    return async () => {
        const current = await readFile(path, 'utf8')
            .then((text) => JSON.parse(text) as Partial<DiscoveryEntry>)
            .catch(() => undefined);
        if (current?.instanceId === entry.instanceId) await rm(path, { force: true });
    };
}

/**
 * Reads every registration of this OS user. A missing registry is an empty (successful) result; an unreadable one is
 * reported as a problem instead of being presented as zero services.
 *
 * @private service discovery
 */
export async function readRegistry(env: NodeJS.ProcessEnv = process.env): Promise<{ readonly entries: DiscoveryEntry[]; readonly problem?: string }> {
    const directory = discoveryDirectory(env);
    let names: string[];
    try {
        names = await readdir(directory);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { entries: [] };
        return { entries: [], problem: `The service registry ${directory} cannot be read: ${errorMessage(error)}` };
    }
    const entries: DiscoveryEntry[] = [];
    for (const name of names.filter((item) => item.endsWith('.json'))) {
        try {
            const entry = JSON.parse(await readFile(join(directory, name), 'utf8')) as DiscoveryEntry;
            if (entry?.version === DISCOVERY_VERSION && typeof entry.instanceId === 'string' && typeof entry.projectRoot === 'string' && typeof entry.pid === 'number') entries.push(entry);
        } catch {
            // A torn or foreign file is not a service.
        }
    }
    return { entries: entries.sort((a, b) => a.projectRoot.localeCompare(b.projectRoot) || a.startedAt.localeCompare(b.startedAt)) };
}

/**
 * Compact live summary of one engine for the global table (the `summary` control method, or a full snapshot from
 * engines that predate it).
 *
 * @private service discovery
 */
export type EngineSummary = {
    readonly state: string;
    readonly phase: string;
    readonly intent?: string;
    readonly work?: string;
    readonly waitingChats: number;
    readonly observedAt: string;
};

/**
 * Observed status of one registration.
 *
 * @private service discovery
 */
export type DiscoveredEngine =
    | { readonly status: 'live'; readonly entry: DiscoveryEntry; readonly client: ControlClient; readonly summary: EngineSummary }
    | { readonly status: 'unreachable'; readonly entry: DiscoveryEntry; readonly reason: string }
    | { readonly status: 'ended'; readonly entry: DiscoveryEntry; readonly reason: string };

/**
 * Verifies a registration against the project's own process record and the engine's control identity before it is
 * shown as live. A proven-dead entry (process gone, or the project verifiably owned by another instance) is removed
 * from the registry; nothing is killed and no project lock or project file is touched.
 *
 * @private service discovery
 */
export async function verifyEngine(entry: DiscoveryEntry, env: NodeJS.ProcessEnv = process.env): Promise<DiscoveredEngine> {
    const forget = async (reason: string): Promise<DiscoveredEngine> => {
        await rm(join(discoveryDirectory(env), `${entry.instanceId}.json`), { force: true }).catch(() => undefined);
        return { status: 'ended', entry, reason };
    };
    if (!isProcessAlive(entry.pid)) return await forget('The process has ended.');
    const project = projectAt(entry.projectRoot);
    const record = await readProcessRecord(project);
    if (!record) return { status: 'unreachable', entry, reason: 'The project has no readable process record (no access, or the engine is still starting).' };
    if (record.instanceId !== entry.instanceId) {
        const owner = await ipcRequest<{ instanceId: string }>(record.controlAddress, { token: record.token, method: 'identify', params: {} }, 3000).catch(() => undefined);
        if (owner?.instanceId === record.instanceId) return await forget('The project is now owned by another engine instance (stale registration).');
        return { status: 'unreachable', entry, reason: 'The registration does not match the project’s current process record.' };
    }
    try {
        const identity = await ipcRequest<{ instanceId: string }>(record.controlAddress, { token: record.token, method: 'identify', params: {} }, 3000);
        if (identity.instanceId !== entry.instanceId) return { status: 'unreachable', entry, reason: 'The control endpoint belongs to a different instance.' };
    } catch (error) {
        return { status: 'unreachable', entry, reason: errorMessage(error) };
    }
    const client = new ControlClient(project, record);
    try {
        const summary = await client.request<EngineSummary>('summary', {}, 5000).catch(async () => summaryOfSnapshot(await client.request<SnapshotLike>('snapshot', {}, SNAPSHOT_TIMEOUT_MS)));
        return { status: 'live', entry, client, summary };
    } catch (error) {
        return { status: 'unreachable', entry, reason: errorMessage(error) };
    }
}

/**
 * Minimal shape of a full snapshot (engines without the `summary` method).
 */
type SnapshotLike = {
    readonly observedAt: string;
    readonly phase: string;
    readonly service: { readonly state: string; readonly lifecycle?: { readonly intent?: string } };
    readonly current?: { readonly agent: { readonly name: string }; readonly taskTitle: string };
    readonly wait?: { readonly reason: string };
    readonly chats?: { readonly waiting: readonly unknown[] };
};

/**
 * Compact summary of a snapshot.
 *
 * @private service discovery
 */
export function summaryOfSnapshot(snapshot: SnapshotLike): EngineSummary {
    return {
        state: snapshot.service.state === 'paused' ? 'pause' : snapshot.service.state,
        phase: snapshot.phase,
        intent: snapshot.service.lifecycle?.intent,
        work: snapshot.current ? `${snapshot.current.agent.name}: ${snapshot.current.taskTitle}` : snapshot.wait?.reason,
        waitingChats: snapshot.chats?.waiting.length ?? 0,
        observedAt: snapshot.observedAt,
    };
}

import { createHash, randomUUID } from 'node:crypto';
import { open, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promptbookAppData } from '../common/app-data.js';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { isProcessAlive, verifyRecordedProcess } from '../common/process.js';

/**
 * How often a waiting engine looks at another engine's host operation (download, installation, maintenance).
 */
const OPERATION_POLL_MS = 1_000;

/**
 * One active local-inference consumer: an engine process using a runtime service/model right now.
 *
 * @private inference host registry
 */
export type RuntimeConsumer = {
    readonly id: string;
    /** Engine process and its start time (a reused PID never counts as the same consumer). */
    readonly pid: number;
    readonly startedAt: string;
    readonly resourceKey: string;
    readonly project: string;
    /** Harness connection and model of the use. */
    readonly tool: string;
    readonly model?: string;
    /** What the use serves (`task`, `chat`, `consultation`, `check`). */
    readonly purpose: string;
};

/**
 * A runtime service process started by Promptbook (only such a service may be stopped by Promptbook maintenance).
 *
 * @private inference host registry
 */
export type OwnedService = { readonly resourceKey: string; readonly pid: number; readonly startedAt: string; readonly by: string };

/**
 * A host operation in progress (download, installation, maintenance), visible to every engine of this OS user.
 *
 * @private inference host registry
 */
export type HostOperation = { readonly key: string; readonly label: string; readonly pid: number; readonly startedAt: string; readonly project?: string };

/**
 * Root of the protected host resource registry: discovery, ownership and active consumers of shared inference
 * resources of this OS user. It is not a settings layer, a global engine or a task scheduler.
 *
 * @private inference host registry
 */
export function inferenceRegistryDirectory(env: NodeJS.ProcessEnv = process.env): string {
    return join(promptbookAppData(env), 'inference');
}

/**
 * File-name-safe digest of a resource key.
 */
function digest(value: string): string {
    return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

/**
 * Whether a recorded process is still the same live process.
 */
async function alive(pid: number, startedAt: string): Promise<boolean> {
    const verdict = await verifyRecordedProcess(pid, startedAt);
    return verdict === 'verified' || verdict === 'unknown';
}

/**
 * Registers an active consumer of a runtime resource until the returned release is called (or the engine dies).
 *
 * @private inference host registry
 */
export async function registerConsumer(env: NodeJS.ProcessEnv, consumer: Omit<RuntimeConsumer, 'id' | 'pid' | 'startedAt'>): Promise<() => Promise<void>> {
    const directory = await ensureDirectory(join(inferenceRegistryDirectory(env), 'consumers', digest(consumer.resourceKey)));
    const id = randomUUID();
    const path = join(directory, `${process.pid}-${id}.json`);
    const record: RuntimeConsumer = { ...consumer, id, pid: process.pid, startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString() };
    await writeJsonAtomic(path, record, { mode: 0o600 });
    let released = false;
    return async () => {
        if (released) return;
        released = true;
        await rm(path, { force: true });
    };
}

/**
 * Live consumers of a resource across every engine and installation of this OS user; records of dead engines are
 * removed. A missing registry means no known consumer, never a claim that no external consumer exists.
 *
 * @private inference host registry
 */
export async function activeConsumers(env: NodeJS.ProcessEnv, resourceKey: string): Promise<RuntimeConsumer[]> {
    const directory = join(inferenceRegistryDirectory(env), 'consumers', digest(resourceKey));
    const names = await readdir(directory).catch(() => [] as string[]);
    const result: RuntimeConsumer[] = [];
    for (const name of names) {
        const path = join(directory, name);
        const record = await readJsonIfExists<RuntimeConsumer>(path).catch(() => undefined);
        if (!record || typeof record.pid !== 'number') continue;
        if (!(await alive(record.pid, record.startedAt))) {
            await rm(path, { force: true });
            continue;
        }
        result.push(record);
    }
    return result;
}

/**
 * Records a service process that Promptbook started.
 *
 * @private inference host registry
 */
export async function recordOwnedService(env: NodeJS.ProcessEnv, service: Omit<OwnedService, 'startedAt'>): Promise<void> {
    const directory = await ensureDirectory(join(inferenceRegistryDirectory(env), 'owned'));
    await writeJsonAtomic(join(directory, `${digest(service.resourceKey)}.json`), { ...service, startedAt: new Date().toISOString() } satisfies OwnedService, { mode: 0o600 });
}

/**
 * The Promptbook-started process of a resource, when its ownership is still verified (a crashed or replaced service
 * is never claimed; its stale record is removed).
 *
 * @private inference host registry
 */
export async function ownedService(env: NodeJS.ProcessEnv, resourceKey: string): Promise<OwnedService | undefined> {
    const path = join(inferenceRegistryDirectory(env), 'owned', `${digest(resourceKey)}.json`);
    const record = await readJsonIfExists<OwnedService>(path).catch(() => undefined);
    if (!record) return undefined;
    if (!isProcessAlive(record.pid) || (await verifyRecordedProcess(record.pid, record.startedAt)) === 'reused') {
        await rm(path, { force: true });
        return undefined;
    }
    return record;
}

/**
 * Forgets an owned service record (after it was stopped).
 *
 * @private inference host registry
 */
export async function forgetOwnedService(env: NodeJS.ProcessEnv, resourceKey: string): Promise<void> {
    await rm(join(inferenceRegistryDirectory(env), 'owned', `${digest(resourceKey)}.json`), { force: true });
}

/**
 * The host operation currently holding a key, if its process is alive.
 *
 * @private inference host registry
 */
export async function currentHostOperation(env: NodeJS.ProcessEnv, key: string): Promise<HostOperation | undefined> {
    const path = join(inferenceRegistryDirectory(env), 'operations', `${digest(key)}.json`);
    const record = await readJsonIfExists<HostOperation>(path).catch(() => undefined);
    if (!record) return undefined;
    if (!(await alive(record.pid, record.startedAt))) {
        await rm(path, { force: true });
        return undefined;
    }
    return record;
}

/**
 * Runs a host operation exclusively for its key (one model download, one runtime's maintenance) across every engine of
 * this OS user. A concurrent request waits for the running one and then decides again on the fresh state (so a second
 * engine reuses a finished download instead of starting another).
 *
 * @private inference host registry
 */
export async function withHostOperation<T>(env: NodeJS.ProcessEnv, operation: { readonly key: string; readonly label: string; readonly project?: string }, action: () => Promise<T>, options: { readonly signal?: AbortSignal; readonly onWait?: (holder: HostOperation) => void } = {}): Promise<T> {
    const directory = await ensureDirectory(join(inferenceRegistryDirectory(env), 'operations'));
    const path = join(directory, `${digest(operation.key)}.json`);
    for (;;) {
        options.signal?.throwIfAborted();
        try {
            const handle = await open(path, 'wx', 0o600);
            const record: HostOperation = { ...operation, pid: process.pid, startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString() };
            await handle.writeFile(JSON.stringify(record));
            await handle.close();
            try {
                return await action();
            } finally {
                await rm(path, { force: true });
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        }
        const holder = await currentHostOperation(env, operation.key);
        if (!holder) continue;
        options.onWait?.(holder);
        await new Promise((resolve) => setTimeout(resolve, OPERATION_POLL_MS));
    }
}

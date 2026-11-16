import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { isProcessAlive } from '../common/process.js';
import { alive, digest, inferenceRegistryDirectory } from './host.js';
import type { RuntimeProgress } from './types.js';

/**
 * How often a running download's progress is written (each progress line of a large pull is not a write).
 */
const PROGRESS_WRITE_MS = 2_000;

/**
 * State of a model download that has not completed:
 *
 * - `running`: an engine or CLI is downloading it now
 * - `interrupted`: its process ended without finishing (crash, kill or shutdown)
 * - `cancelled`: it was cancelled; the runtime keeps the partial data it supports resuming from
 * - `failed`: the runtime refused or did not confirm it
 *
 * @private model download records
 */
export type PartialDownloadState = 'running' | 'interrupted' | 'cancelled' | 'failed';

/**
 * A download that is not installed yet, retained outside project Git so that a later engine, client or CLI can show
 * and resume it. It is never evidence that the model is installed.
 *
 * @private model download records
 */
export type PartialDownload = {
    readonly resourceKey: string;
    /** The project's runtime tool through which it was started. */
    readonly runtime: string;
    readonly model: string;
    /** The project that started it (absent: host-level). */
    readonly project?: string;
    readonly startedAt: string;
    readonly updatedAt: string;
    readonly state: PartialDownloadState;
    readonly completedBytes?: number;
    readonly totalBytes?: number;
    /** Why a failed download stopped. */
    readonly problem?: string;
};

/**
 * The stored record (with the process that runs it).
 */
type DownloadRecord = Omit<PartialDownload, 'state'> & { readonly state: Exclude<PartialDownloadState, 'interrupted'>; readonly pid: number; readonly processStartedAt: string };

/**
 * Directory of one runtime resource's download records.
 */
function downloadsDirectory(env: NodeJS.ProcessEnv, resourceKey: string): string {
    return join(inferenceRegistryDirectory(env), 'downloads', digest(resourceKey));
}

/**
 * Records one model download while it runs and keeps an honest record when it does not complete.
 *
 * @private model download records
 */
export class DownloadTracker {
    private lastWrite = 0;
    private ended = false;

    /** @private use {@link trackDownload} */
    public constructor(
        private readonly path: string,
        private record: DownloadRecord,
    ) {}

    /** Notes progress (written at a bounded rate). */
    public progress(progress: RuntimeProgress): void {
        if (this.ended) return;
        this.record = { ...this.record, updatedAt: new Date().toISOString(), ...(progress.completedBytes !== undefined ? { completedBytes: progress.completedBytes } : {}), ...(progress.totalBytes !== undefined ? { totalBytes: progress.totalBytes } : {}) };
        if (Date.now() - this.lastWrite < PROGRESS_WRITE_MS) return;
        this.lastWrite = Date.now();
        void writeJsonAtomic(this.path, this.record, { mode: 0o600 }).catch(() => undefined);
    }

    /** The model is installed: no partial state remains to show. */
    public async complete(): Promise<void> {
        this.ended = true;
        await rm(this.path, { force: true });
    }

    /** The download stopped without installing the model. */
    public async stopped(state: 'cancelled' | 'failed', problem?: string): Promise<void> {
        this.ended = true;
        this.record = { ...this.record, state, updatedAt: new Date().toISOString(), ...(problem ? { problem: problem.slice(0, 500) } : {}) };
        await writeJsonAtomic(this.path, this.record, { mode: 0o600 });
    }
}

/**
 * Starts recording a download of one model on a runtime resource (a later attempt of the same model replaces it).
 *
 * @private model download records
 */
export async function trackDownload(env: NodeJS.ProcessEnv, download: Pick<PartialDownload, 'resourceKey' | 'runtime' | 'model' | 'project'>): Promise<DownloadTracker> {
    const directory = await ensureDirectory(downloadsDirectory(env, download.resourceKey));
    const path = join(directory, `${digest(download.model)}.json`);
    const previous = await readJsonIfExists<DownloadRecord>(path).catch(() => undefined);
    const now = new Date().toISOString();
    const record: DownloadRecord = {
        ...download,
        startedAt: now,
        updatedAt: now,
        state: 'running',
        // The runtime resumes from its partial data, so the last known progress stays meaningful until it reports again.
        ...(previous?.completedBytes !== undefined ? { completedBytes: previous.completedBytes } : {}),
        ...(previous?.totalBytes !== undefined ? { totalBytes: previous.totalBytes } : {}),
        pid: process.pid,
        processStartedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    };
    await writeJsonAtomic(path, record, { mode: 0o600 });
    return new DownloadTracker(path, record);
}

/**
 * Downloads of a runtime resource that did not complete, newest first. A running record whose process is gone is
 * `interrupted`; a record of a model the runtime now lists as installed (finished elsewhere) is removed.
 *
 * @private model download records
 */
export async function partialDownloads(env: NodeJS.ProcessEnv, resourceKey: string, installed: readonly string[] = []): Promise<PartialDownload[]> {
    const directory = downloadsDirectory(env, resourceKey);
    const names = await readdir(directory).catch(() => [] as string[]);
    const result: PartialDownload[] = [];
    for (const name of names) {
        if (!name.endsWith('.json')) continue;
        const path = join(directory, name);
        const record = await readJsonIfExists<DownloadRecord>(path).catch(() => undefined);
        if (!record || typeof record.model !== 'string') continue;
        const running = record.state === 'running' && (record.pid === process.pid || (isProcessAlive(record.pid) && (await alive(record.pid, record.processStartedAt))));
        if (!running && installed.includes(record.model)) {
            await rm(path, { force: true });
            continue;
        }
        const { pid: _pid, processStartedAt: _started, ...view } = record;
        result.push({ ...view, state: record.state === 'running' && !running ? 'interrupted' : record.state });
    }
    return result.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}

/**
 * One line describing a partial download (`interrupted at 45% (6.2 GB of 13.8 GB)`).
 *
 * @private model download records
 */
export function describePartialDownload(download: PartialDownload, formatBytes: (bytes: number) => string): string {
    const amount = download.totalBytes ? ` at ${Math.floor(((download.completedBytes ?? 0) / download.totalBytes) * 100)}% (${formatBytes(download.completedBytes ?? 0)} of ${formatBytes(download.totalBytes)})` : download.completedBytes ? ` after ${formatBytes(download.completedBytes)}` : '';
    const state = download.state === 'running' ? `downloading${amount}` : `${download.state}${amount}`;
    return `${download.model} ${state}${download.problem ? ` — ${download.problem}` : ''}`;
}

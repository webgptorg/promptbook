import { renameSync, statSync } from 'node:fs';
import { open, readFile, rm } from 'node:fs/promises';
import { delimiter, dirname, join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { isProcessAlive } from '../common/process.js';
import { ENGINE_ROOT, ENGINE_VERSION } from '../common/version.js';
import type { Project } from '../project/workspace.js';

/**
 * Process record of the running project service (`.ptbk/service/process.json`, owner-readable only).
 *
 * @private service records
 */
export type ProcessRecord = {
    readonly version: 1;
    /** Unique instance of the owning process. */
    readonly instanceId: string;
    /** Placement. */
    readonly mode: 'daemon' | 'foreground' | 'run';
    /** PID of the process hosting the agenda. */
    readonly pid: number;
    /** PID of the daemon supervisor (restarts the worker). */
    readonly supervisorPid?: number;
    /** Local control endpoint. */
    readonly controlAddress: string;
    /** Control authorization token. */
    readonly token: string;
    /** Project root. */
    readonly projectRoot: string;
    /** Engine installation running the service. */
    readonly installation: string;
    /** Engine version running the service. */
    readonly engineVersion: string;
    /** Start time. */
    readonly startedAt: string;
    /** Local HTTP address, when serving. */
    readonly http?: { readonly port: number; readonly url: string };
    /** Restart persistence state. */
    readonly persistent: boolean | null;
    /** Launch nonce correlating a start request with its worker. */
    readonly launchNonce?: string;
};

/**
 * Restart metadata (`.ptbk/service/launch.json`): invocation overrides and non-secret discovery locations.
 *
 * @private service records
 */
export type LaunchMetadata = {
    readonly version: 1;
    readonly projectRoot: string;
    /** Node executable pinned for restarts. */
    readonly nodePath: string;
    /** Engine installation pinned for restarts. */
    readonly installation: string;
    /** Engine version at launch. */
    readonly engineVersion: string;
    /** Temporary CLI setting overrides of the launch (never written to ptbk.json). */
    readonly cli: Readonly<Record<string, unknown>>;
    /** CLI harness restriction. */
    readonly cliHarnesses?: readonly string[];
    /** `--tasks` override. */
    readonly tasksDirectory?: string;
    /** Non-secret environment for discovery (PATH, native config/store locations). */
    readonly env: Readonly<Record<string, string>>;
    /** Automatic restart after crashes/reboots. */
    readonly persistent: boolean;
    /** Set by an intentional stop; suppresses automatic startup. */
    readonly intentionallyStopped: boolean;
    /** Correlates the launched worker. */
    readonly launchNonce: string;
    /** Time of saving. */
    readonly savedAt: string;
};

/**
 * Exit code of a daemon worker that shut down for a restart: its supervisor starts exactly one replacement with the
 * saved launch configuration and installation (no backoff, independent of crash persistence).
 *
 * @private service records
 */
export const RESTART_EXIT_CODE = 75;

/**
 * Paths of service records.
 *
 * @private service records
 */
export function servicePaths(project: Project): { record: string; launch: string; launchLock: string; supervisorLog: string; workerLog: string } {
    const directory = project.runtime.service;
    return {
        record: join(directory, 'process.json'),
        launch: join(directory, 'launch.json'),
        launchLock: join(directory, 'launch.lock'),
        supervisorLog: join(directory, 'supervisor.log'),
        workerLog: join(directory, 'worker.log'),
    };
}

/**
 * Reads the process record (undefined when absent or unreadable).
 *
 * @private service records
 */
export async function readProcessRecord(project: Project): Promise<ProcessRecord | undefined> {
    try {
        return await readJsonIfExists<ProcessRecord>(servicePaths(project).record);
    } catch {
        return undefined;
    }
}

/**
 * Writes the process record readable only by the owner.
 *
 * @private service records
 */
export async function writeProcessRecord(project: Project, record: ProcessRecord): Promise<void> {
    await ensureDirectory(project.runtime.service);
    await writeJsonAtomic(servicePaths(project).record, record, { mode: 0o600 });
}

/**
 * Removes the process record if it still belongs to the given instance.
 *
 * @private service records
 */
export async function removeProcessRecord(project: Project, instanceId: string): Promise<void> {
    const record = await readProcessRecord(project);
    if (record?.instanceId === instanceId) await rm(servicePaths(project).record, { force: true });
}

/**
 * Reads restart metadata.
 *
 * @private service records
 */
export async function readLaunchMetadata(project: Project): Promise<LaunchMetadata | undefined> {
    try {
        return await readJsonIfExists<LaunchMetadata>(servicePaths(project).launch);
    } catch {
        return undefined;
    }
}

/**
 * Writes restart metadata (owner-readable).
 *
 * @private service records
 */
export async function writeLaunchMetadata(project: Project, metadata: LaunchMetadata): Promise<void> {
    await ensureDirectory(project.runtime.service);
    await writeJsonAtomic(servicePaths(project).launch, metadata, { mode: 0o600 });
}

/**
 * Environment variables preserved for discovery after detachment and reboot (paths and non-secret locations only).
 */
const PRESERVED_VARIABLES = [
    'PATH',
    'Path',
    'PATHEXT',
    'HOME',
    'USERPROFILE',
    'APPDATA',
    'LOCALAPPDATA',
    'XDG_CONFIG_HOME',
    'XDG_DATA_HOME',
    'XDG_STATE_HOME',
    'XDG_CACHE_HOME',
    'XDG_RUNTIME_DIR',
    'CODEX_HOME',
    'CLAUDE_CONFIG_DIR',
    'NVM_DIR',
    'NVM_BIN',
    'VOLTA_HOME',
    'FNM_DIR',
    'PNPM_HOME',
    'BUN_INSTALL',
    'npm_config_prefix',
    'NPM_CONFIG_PREFIX',
    'LANG',
    'LC_ALL',
    'TZ',
    'SSH_AUTH_SOCK',
    'CODING_AGENT_GIT_NAME',
    'CODING_AGENT_GIT_EMAIL',
    'PTBK_HOME',
    'PTBK_OPENAI_CODEX_USE_API_KEY',
];

/**
 * Captures the non-secret discovery environment of the launching terminal, adding the pinned Node global bin.
 *
 * @private service records
 */
export function discoveryEnvironment(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
    const result: Record<string, string> = {};
    for (const name of PRESERVED_VARIABLES) if (env[name]) result[name] = env[name]!;
    const pathKey = process.platform === 'win32' && result.Path && !result.PATH ? 'Path' : 'PATH';
    const entries = (result[pathKey] ?? '').split(delimiter).filter(Boolean);
    const nodeBin = dirname(process.execPath);
    if (!entries.includes(nodeBin)) entries.push(nodeBin);
    result[pathKey] = entries.join(delimiter);
    return result;
}

/**
 * Restores saved discovery locations into an environment (older metadata without paths gets the Node bin fallback).
 *
 * @private service records
 */
export function restoreDiscoveryEnvironment(saved: Readonly<Record<string, string>> | undefined, nodePath: string, base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...base, ...(saved ?? {}) };
    const pathKey = process.platform === 'win32' && env.Path && !env.PATH ? 'Path' : 'PATH';
    const entries = (env[pathKey] ?? '').split(delimiter).filter(Boolean);
    for (const required of [dirname(nodePath)]) if (!entries.includes(required)) entries.push(required);
    for (const fallback of (base[pathKey] ?? '').split(delimiter).filter(Boolean)) if (!entries.includes(fallback)) entries.push(fallback);
    env[pathKey] = entries.join(delimiter);
    return env;
}

/**
 * Ownership lock content.
 */
type LockContent = { readonly pid: number; readonly instanceId: string; readonly kind: string; readonly at: string };

/**
 * Acquires the project ownership lock (only one process mutates/executes a project, whatever its installation,
 * version or path spelling: the lock lives in the canonical project's `.ptbk/`).
 *
 * A lock whose process no longer exists is replaced; a live holder is reported (with its known engine identity, or
 * the uncertainty of a possibly reused PID) and never terminated or taken over. The returned release removes only
 * this owner's own lock.
 *
 * @private service records
 */
export async function acquireProjectLock(project: Project, instanceId: string, kind: string): Promise<() => Promise<void>> {
    await ensureDirectory(project.runtime.root);
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const handle = await open(project.runtime.lock, 'wx', 0o600);
            const content: LockContent = { pid: process.pid, instanceId, kind, at: new Date().toISOString() };
            await handle.writeFile(JSON.stringify(content));
            await handle.close();
            return async () => {
                try {
                    const current = JSON.parse(await readFile(project.runtime.lock, 'utf8')) as LockContent;
                    if (current.instanceId === instanceId) await rm(project.runtime.lock, { force: true });
                } catch {
                    // already gone
                }
            };
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            let holder: LockContent | undefined;
            try {
                holder = JSON.parse(await readFile(project.runtime.lock, 'utf8')) as LockContent;
            } catch {
                holder = undefined;
            }
            if (holder && isProcessAlive(holder.pid) && holder.pid !== process.pid) {
                const record = await readProcessRecord(project);
                const known = record?.instanceId === holder.instanceId ? `the ${record.mode} engine ptbk ${record.engineVersion} (PID ${record.pid})` : undefined;
                throw new PtbkError('Another ptbk process owns this project.', {
                    kind: 'conflict',
                    project: project.root,
                    reason: known
                        ? `${known} holds ${project.runtime.lock} since ${holder.at}.`
                        : `${holder.kind} process ${holder.pid} (instance ${holder.instanceId}) holds ${project.runtime.lock} since ${holder.at}; it could not be verified as a running engine (it may be finishing an operation, or the PID may have been reused).`,
                    effect: 'Nothing was started; the other process was not touched.',
                    next: ['Use `ptbk status` to inspect it, or `ptbk stop` to stop the running engine.'],
                });
            }
            await rm(project.runtime.lock, { force: true });
        }
    }
    throw new PtbkError('Could not acquire the project lock.', { kind: 'conflict', project: project.root });
}

/**
 * Identity of this engine for records.
 *
 * @private service records
 */
export function engineIdentity(): { installation: string; engineVersion: string } {
    return { installation: ENGINE_ROOT, engineVersion: ENGINE_VERSION };
}

/**
 * Largest service log kept before rotation (one previous generation is retained).
 */
const MAX_SERVICE_LOG_BYTES = 5 * 1024 * 1024;

/**
 * Rotates a service log that grew too large (`worker.log` → `worker.log.1`), keeping long-running logs bounded.
 *
 * @private service records
 */
export function rotateServiceLog(path: string): void {
    try {
        if (statSync(path).size > MAX_SERVICE_LOG_BYTES) renameSync(path, `${path}.1`);
    } catch {
        // missing log or concurrent rotation
    }
}

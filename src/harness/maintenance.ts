import { open, readFile, realpath, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ensureDirectory, isPathInside } from '../common/fs.js';
import { isProcessAlive, runProcess } from '../common/process.js';
import { compareVersions } from '../common/semver.js';
import type { HarnessContext, HarnessInspection, HarnessPlugin } from './types.js';

/**
 * Outcome of a global maintenance operation, based on verification rather than command launch.
 *
 * @private harness maintenance
 */
export type MaintenanceResult = {
    /** Harness identifier. */
    readonly id: string;
    /** Verified outcome. */
    readonly outcome: 'installed' | 'updated' | 'authenticated' | 'current' | 'failed' | 'unsupported' | 'cancelled' | 'busy';
    /** Explanation. */
    readonly diagnostic: string;
    /** Version after the operation. */
    readonly version?: string;
};

/**
 * Result of comparing the installed version with the latest release.
 *
 * @private harness maintenance
 */
export type VersionCheck = {
    /** Harness identifier. */
    readonly id: string;
    /** Comparison outcome; `unknown` is never treated as current. */
    readonly outcome: 'current' | 'outdated' | 'unknown' | 'unsupported' | 'missing';
    /** Installed version. */
    readonly current?: string;
    /** Latest released version. */
    readonly latest?: string;
    /** Explanation. */
    readonly diagnostic: string;
};

/**
 * Machine-wide directory of ptbk user data (tool cache, cross-project locks).
 *
 * @private harness maintenance
 */
export function userDataDirectory(): string {
    return process.env.PTBK_HOME || join(homedir(), '.ptbk');
}

/**
 * Acquires a machine-wide lock so that two projects never update a shared installation concurrently.
 *
 * @private harness maintenance
 */
export async function withMachineLock<T>(name: string, action: () => Promise<T>): Promise<T | 'busy'> {
    const directory = await ensureDirectory(join(userDataDirectory(), 'locks'));
    const path = join(directory, `${name}.lock`);
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const handle = await open(path, 'wx');
            await handle.writeFile(JSON.stringify({ pid: process.pid, at: Date.now() }));
            await handle.close();
            try {
                return await action();
            } finally {
                await rm(path, { force: true });
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            const holder = JSON.parse(await readFile(path, 'utf8').catch(() => '{}')) as { pid?: number };
            if (isProcessAlive(holder.pid)) return 'busy';
            await rm(path, { force: true });
        }
    }
    return 'busy';
}

/**
 * Reads the npm global `node_modules` directory.
 */
async function npmGlobalRoot(context: HarnessContext): Promise<string | undefined> {
    const result = await runProcess('npm', ['root', '--global'], { cwd: context.projectRoot, env: context.env, timeoutMs: 20_000 });
    return result.exitCode === 0 ? result.stdout.trim() : undefined;
}

/**
 * Whether an executable is installed through the npm global prefix.
 */
async function isNpmGlobalInstallation(context: HarnessContext, executablePath: string): Promise<boolean> {
    const root = await npmGlobalRoot(context);
    if (!root) return false;
    try {
        const real = await realpath(executablePath);
        return isPathInside(await realpath(root), real) || isPathInside(join(root, '..', '..'), executablePath);
    } catch {
        return false;
    }
}

/**
 * Installs a harness globally through npm and verifies the executable afterwards.
 *
 * @private harness maintenance
 */
export async function installHarness(plugin: HarnessPlugin, context: HarnessContext, onOutput?: (line: string) => void): Promise<MaintenanceResult> {
    if (!plugin.npmPackage) return { id: plugin.id, outcome: 'unsupported', diagnostic: `${plugin.displayName} is not distributed through npm; install it from ${plugin.homepage}.` };
    const locked = await withMachineLock(`harness-${plugin.id}`, async () => {
        const result = await runProcess('npm', ['install', '--global', plugin.npmPackage!], {
            cwd: context.projectRoot,
            env: context.env,
            timeoutMs: 10 * 60_000,
            onStdoutLine: onOutput,
            onStderrLine: onOutput,
        });
        const inspection = await plugin.inspect(context);
        if (!inspection.installed) {
            return {
                id: plugin.id,
                outcome: 'failed' as const,
                diagnostic: `npm install --global ${plugin.npmPackage} ${result.exitCode === 0 ? 'finished, but the executable is still not on PATH' : `failed: ${(result.spawnError ?? result.stderr.trim().split('\n').slice(-3).join(' ')) || `exit ${String(result.exitCode)}`}`}.`,
            };
        }
        return { id: plugin.id, outcome: 'installed' as const, diagnostic: `Installed ${plugin.displayName}${inspection.version ? ` ${inspection.version}` : ''} globally.`, version: inspection.version };
    });
    return locked === 'busy' ? { id: plugin.id, outcome: 'busy', diagnostic: `Another ptbk process is maintaining ${plugin.displayName}; retry shortly.` } : locked;
}

/**
 * Runs the harness's native interactive login in the current terminal and verifies the result.
 *
 * @private harness maintenance
 */
export async function loginHarness(plugin: HarnessPlugin, context: HarnessContext): Promise<MaintenanceResult> {
    if (!plugin.loginArgs) return { id: plugin.id, outcome: 'unsupported', diagnostic: plugin.loginHint };
    await runProcess(plugin.executable, plugin.loginArgs, { cwd: context.projectRoot, env: context.env, inheritStdio: true });
    const inspection = await plugin.inspect(context);
    if (inspection.usable && inspection.authenticated === true) return { id: plugin.id, outcome: 'authenticated', diagnostic: inspection.summary, version: inspection.version };
    return { id: plugin.id, outcome: 'failed', diagnostic: `Login was not completed: ${inspection.summary}` };
}

/**
 * Compares the installed version with the latest npm release (bounded; offline is `unknown`).
 *
 * @private harness maintenance
 */
export async function checkHarnessVersion(plugin: HarnessPlugin, inspection: HarnessInspection, context: HarnessContext): Promise<VersionCheck> {
    if (!inspection.installed) return { id: plugin.id, outcome: 'missing', diagnostic: inspection.summary };
    if (!plugin.npmPackage) return { id: plugin.id, outcome: 'unsupported', current: inspection.version, diagnostic: 'No release channel to compare with.' };
    const result = await runProcess('npm', ['view', plugin.npmPackage, 'version'], { cwd: context.projectRoot, env: context.env, timeoutMs: 15_000 });
    const latest = result.exitCode === 0 ? result.stdout.trim().split('\n').pop()?.trim() : undefined;
    if (!latest || !inspection.version) {
        return { id: plugin.id, outcome: 'unknown', current: inspection.version, latest, diagnostic: latest ? 'The installed version could not be read.' : 'The latest release could not be determined (offline or registry unavailable).' };
    }
    const comparison = compareVersions(latest, inspection.version);
    if (comparison === undefined) return { id: plugin.id, outcome: 'unknown', current: inspection.version, latest, diagnostic: 'Versions are not comparable.' };
    return comparison > 0
        ? { id: plugin.id, outcome: 'outdated', current: inspection.version, latest, diagnostic: `${inspection.version} → ${latest} available.` }
        : { id: plugin.id, outcome: 'current', current: inspection.version, latest, diagnostic: `${inspection.version} is current.` };
}

/**
 * Updates the shared global installation (npm or the harness's native updater) and verifies the new version.
 *
 * @private harness maintenance
 */
export async function updateHarness(plugin: HarnessPlugin, inspection: HarnessInspection, context: HarnessContext, onOutput?: (line: string) => void): Promise<MaintenanceResult> {
    if (!inspection.installed || !inspection.executablePath) return { id: plugin.id, outcome: 'failed', diagnostic: inspection.summary };
    const executablePath = inspection.executablePath;
    const locked = await withMachineLock(`harness-${plugin.id}`, async (): Promise<MaintenanceResult> => {
        let command: [string, string[]];
        if (plugin.npmPackage && (await isNpmGlobalInstallation(context, executablePath))) command = ['npm', ['install', '--global', `${plugin.npmPackage}@latest`]];
        else if (plugin.selfUpdateArgs) command = [executablePath, [...plugin.selfUpdateArgs]];
        else return { id: plugin.id, outcome: 'unsupported', diagnostic: `${plugin.displayName} at ${executablePath} was not installed through npm and has no native updater.` };
        const result = await runProcess(command[0], command[1], { cwd: context.projectRoot, env: context.env, timeoutMs: 10 * 60_000, onStdoutLine: onOutput, onStderrLine: onOutput });
        const after = await plugin.inspect(context);
        if (result.exitCode !== 0) {
            return { id: plugin.id, outcome: 'failed', diagnostic: `Update failed: ${(result.spawnError ?? result.stderr.trim().split('\n').slice(-3).join(' ')) || `exit ${String(result.exitCode)}`}`, version: after.version };
        }
        if (after.version && inspection.version && after.version === inspection.version) {
            return { id: plugin.id, outcome: 'current', diagnostic: `${plugin.displayName} remains at ${after.version}.`, version: after.version };
        }
        return { id: plugin.id, outcome: 'updated', diagnostic: `${plugin.displayName} updated${after.version ? ` to ${after.version}` : ''}.`, version: after.version };
    });
    return locked === 'busy' ? { id: plugin.id, outcome: 'busy', diagnostic: `Another ptbk process is maintaining ${plugin.displayName}.` } : locked;
}

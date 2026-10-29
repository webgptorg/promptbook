import { open, readFile, realpath, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ensureDirectory, isPathInside } from '../common/fs.js';
import { isProcessAlive, runProcess, which, type ProcessResult } from '../common/process.js';
import { compareVersions } from '../common/semver.js';
import type { HarnessContext, HarnessInspection, HarnessLoginMethod, HarnessPlugin, LoginLocation } from './types.js';

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
 * Where the human part of a native sign-in can happen, and why.
 *
 * @private harness maintenance
 */
export type LoginPlace = {
    /** Local desktop or remote (SSH/browserless) host. */
    readonly location: LoginLocation;
    /** Human reason of the detection. */
    readonly reason: string;
};

/**
 * Detects the sign-in location: an explicit `PTBK_LOGIN_LOCATION` (`remote`/`local`, supplied e.g. by the VPS
 * launcher, whose account switch drops the SSH variables), otherwise an SSH session or a Linux host without a display
 * is remote. Terminal availability is a separate question: no display never makes redirected input interactive.
 *
 * @private harness maintenance
 */
export function loginLocation(env: NodeJS.ProcessEnv, platform: NodeJS.Platform = process.platform): LoginPlace {
    const explicit = env.PTBK_LOGIN_LOCATION?.trim().toLowerCase();
    if (explicit === 'remote') return { location: 'remote', reason: 'a remote server' };
    if (explicit === 'local') return { location: 'local', reason: 'this computer' };
    if (env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY) return { location: 'remote', reason: 'an SSH session' };
    if (platform === 'linux' && !env.DISPLAY && !env.WAYLAND_DISPLAY && !env.WSL_DISTRO_NAME) return { location: 'remote', reason: 'a server without a display' };
    return { location: 'local', reason: 'this computer' };
}

/**
 * Sign-in methods of the installed harness for a location: the adapter's own, or one generic method from `loginArgs`
 * (not known to work without a browser on this machine).
 *
 * @private harness maintenance
 */
export async function harnessLoginMethods(plugin: HarnessPlugin, context: HarnessContext, location: LoginLocation): Promise<readonly HarnessLoginMethod[]> {
    if (plugin.loginMethods) return await plugin.loginMethods(context, location);
    if (!plugin.loginArgs) return [];
    return [{ id: 'native', label: `Sign in now (${plugin.executable} ${plugin.loginArgs.join(' ')})`, args: plugin.loginArgs, remote: false, instructions: `Follow ${plugin.displayName}'s own sign-in in this terminal.`, terminal: 'inherit' }];
}

/**
 * Verified outcome of one attended native sign-in.
 *
 * @private harness maintenance
 */
export type LoginResult = {
    /** Harness identifier. */
    readonly id: string;
    /**
     * Verified outcome: `authenticated` only after readiness was rechecked in the service's environment; `discovery`
     * when this terminal is signed in but the service environment cannot find or use that sign-in.
     */
    readonly outcome: 'authenticated' | 'cancelled' | 'expired' | 'denied' | 'unsupported' | 'missing' | 'discovery' | 'failed';
    /** Explanation (never containing a code or credential-bearing URL from the native output). */
    readonly diagnostic: string;
    /** Version after the sign-in. */
    readonly version?: string;
};

/**
 * Browser command used on a remote host when none is configured: it fails at once instead of letting `xdg-open` fall
 * back to a terminal browser, so the native flow shows its URL for another device rather than waiting on this host.
 */
const NO_LOCAL_BROWSER = 'false';

/**
 * Runs one native sign-in method attended in the current terminal (Ctrl+C cancels the sign-in, not the caller), then
 * rechecks readiness through the adapter's non-inference inspection, also in the service's effective environment.
 * The native output is relayed live and only classified in memory; it is never persisted.
 *
 * @private harness maintenance
 */
export async function loginHarness(
    plugin: HarnessPlugin,
    context: HarnessContext,
    method: HarnessLoginMethod,
    options: { readonly location: LoginLocation; readonly service?: HarnessContext; readonly write?: (text: string) => void },
): Promise<LoginResult> {
    if (!(await which(plugin.executable, context.env))) return { id: plugin.id, outcome: 'missing', diagnostic: `\`${plugin.executable}\` was not found on PATH; install ${plugin.displayName} first.` };
    const env = options.location === 'remote' && !context.env.BROWSER && process.platform !== 'win32' ? { ...context.env, BROWSER: NO_LOCAL_BROWSER } : context.env;
    const ignore = (): void => undefined;
    process.on('SIGINT', ignore);
    let result: ProcessResult;
    try {
        result = await runProcess(plugin.executable, method.args, {
            cwd: context.projectRoot,
            env,
            signal: context.signal,
            ...(method.terminal === 'relay' ? { relayOutput: (chunk: string) => (options.write ?? ((text: string) => process.stdout.write(text)))(chunk) } : { inheritStdio: true }),
        });
    } finally {
        process.off('SIGINT', ignore);
    }
    if (result.spawnError) return { id: plugin.id, outcome: 'missing', diagnostic: `${plugin.displayName} could not be started: ${result.spawnError}` };
    if (result.cancelled || result.signal === 'SIGINT' || result.exitCode === 130) return { id: plugin.id, outcome: 'cancelled', diagnostic: `${plugin.displayName} sign-in was cancelled; nothing was changed.` };
    const inspection = await plugin.inspect(context);
    if (!(inspection.usable && inspection.authenticated === true)) {
        const failure = result.exitCode !== 0 ? plugin.classifyLogin?.(`${result.stdout}\n${result.stderr}`) : undefined;
        if (failure) return { id: plugin.id, outcome: failure.outcome, diagnostic: failure.diagnostic, version: inspection.version };
        return { id: plugin.id, outcome: 'failed', diagnostic: `Sign-in was not completed${result.exitCode ? ` (${plugin.executable} exited with ${result.exitCode})` : ''}: ${inspection.summary}`, version: inspection.version };
    }
    const problem = options.service ? await serviceReadinessProblem(plugin, options.service) : undefined;
    if (problem) return { id: plugin.id, outcome: 'discovery', diagnostic: `Signed in here, but ${problem.summary}. ${problem.nextAction}`, version: inspection.version };
    return { id: plugin.id, outcome: 'authenticated', diagnostic: inspection.summary, version: inspection.version };
}

/**
 * A ready-looking instance that the background service could not use.
 *
 * @private harness maintenance
 */
export type ServiceReadinessProblem = {
    /** What the service environment lacks. */
    readonly summary: string;
    /** Concrete repair. */
    readonly nextAction: string;
};

/**
 * Rechecks a ready instance through its non-inference inspection in the service's effective environment: an
 * executable the service cannot find, or a sign-in only this terminal can see, is a discovery failure, not readiness.
 *
 * @private harness maintenance
 */
export async function serviceReadinessProblem(plugin: HarnessPlugin, service: HarnessContext): Promise<ServiceReadinessProblem | undefined> {
    const inspection = await plugin.inspect(service);
    if (!inspection.installed) return { summary: `the background service cannot find \`${plugin.executable}\` with its saved PATH`, nextAction: 'Install it for this user or fix PATH, then check again.' };
    if (inspection.authenticated === false) return { summary: `the background service's environment does not see this sign-in (${inspection.summary})`, nextAction: 'Sign in as this user with the account settings the service uses, then check again.' };
    return undefined;
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

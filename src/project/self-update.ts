import { dirname, join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { readJsonIfExists } from '../common/fs.js';
import { runProcess } from '../common/process.js';
import { compareVersions, isNewerVersion } from '../common/semver.js';
import { ENGINE_VERSION, detectInstallation, type InstallationInfo } from '../common/version.js';

/**
 * Result of a bounded, best-effort release check.
 *
 * @private engine self-update
 */
export type UpdateCheck = {
    readonly current: string;
    readonly installation: InstallationInfo;
    /** Latest released version (undefined when unknown). */
    readonly latest?: string;
    /** A newer applicable release exists. */
    readonly newer: boolean;
    /** Why the check could not decide (offline, unsupported, ...). */
    readonly unknownReason?: string;
};

/**
 * Checks the registry for a newer engine version (bounded; offline is never reported as up to date).
 *
 * @private engine self-update
 */
export async function checkForEngineUpdate(timeoutMs = 6000, env: NodeJS.ProcessEnv = process.env): Promise<UpdateCheck> {
    const installation = detectInstallation();
    const result = await runProcess('npm', ['view', 'ptbk', 'version'], { cwd: installation.root, env, timeoutMs });
    const latest = result.exitCode === 0 ? result.stdout.trim().split('\n').pop()?.trim() : undefined;
    if (!latest) return { current: ENGINE_VERSION, installation, newer: false, unknownReason: result.timedOut ? 'the registry did not answer in time' : 'release information is unavailable' };
    return { current: ENGINE_VERSION, installation, latest, newer: isNewerVersion(latest, ENGINE_VERSION) };
}

/**
 * Every published ptbk version (bounded registry lookup; a problem means unknown, never "up to date").
 *
 * @private engine self-update
 */
export async function publishedEngineVersions(installation: InstallationInfo, env: NodeJS.ProcessEnv = process.env, timeoutMs = 30_000): Promise<{ readonly versions?: readonly string[]; readonly problem?: string }> {
    const result = await runProcess('npm', ['view', 'ptbk', 'versions', '--json'], { cwd: installation.root, env, timeoutMs });
    if (result.spawnError) return { problem: result.spawnError };
    if (result.timedOut) return { problem: 'the registry did not answer in time' };
    if (result.exitCode !== 0) return { problem: result.stderr.trim().split('\n').slice(-2).join(' ') || `npm exited with ${String(result.exitCode)}` };
    try {
        const parsed = JSON.parse(result.stdout) as unknown;
        const versions = (Array.isArray(parsed) ? parsed : [parsed]).filter((version): version is string => typeof version === 'string' && compareVersions(version, version) !== undefined);
        return versions.length ? { versions } : { problem: 'the registry returned no versions' };
    } catch {
        return { problem: 'the registry answer was not readable' };
    }
}

/**
 * Installs one exact version into exactly the given installation: a local project dependency keeps its
 * dependency/devDependency placement; a global installation is installed into its own prefix, never into whichever
 * global prefix npm is configured with. npx caches and source checkouts are never mutated.
 *
 * @private engine self-update
 */
export async function installEngineVersion(installation: InstallationInfo, version: string, options: { readonly env?: NodeJS.ProcessEnv; readonly onOutput?: (line: string) => void; readonly timeoutMs?: number } = {}): Promise<void> {
    const target = `ptbk@${version}`;
    const env = options.env ?? process.env;
    const timeoutMs = options.timeoutMs ?? 10 * 60_000;
    let result;
    if (installation.scope === 'local' && installation.ownerProject) {
        const manifest = await readJsonIfExists<{ devDependencies?: Record<string, string> }>(join(installation.ownerProject, 'package.json')).catch(() => undefined);
        const development = Boolean(manifest?.devDependencies?.ptbk);
        result = await runProcess('npm', ['install', '--save-exact', development ? '--save-dev' : '--save-prod', target], { cwd: installation.ownerProject, env, timeoutMs, onStdoutLine: options.onOutput, onStderrLine: options.onOutput });
    } else if (installation.scope === 'global') {
        const prefix = process.platform === 'win32' ? dirname(dirname(installation.root)) : dirname(dirname(dirname(installation.root)));
        result = await runProcess('npm', ['install', '--global', '--prefix', prefix, target], { cwd: prefix, env, timeoutMs, onStdoutLine: options.onOutput, onStderrLine: options.onOutput });
    } else {
        throw new PtbkError(`This ${installation.scope} installation cannot be updated by ptbk.`, {
            kind: 'unsupported',
            reason: installation.scope === 'npx' ? 'It runs from the transient npx cache.' : 'It runs from a source checkout.',
            next: [installation.scope === 'npx' ? 'Run `npx ptbk@latest ...` or install ptbk locally/globally.' : 'Pull and rebuild the checkout.'],
        });
    }
    if (result.exitCode !== 0) {
        throw new PtbkError(`Updating the ${installation.scope} ptbk installation failed.`, {
            kind: 'technical',
            reason: result.spawnError ?? (result.timedOut ? 'npm did not finish in time' : result.stderr.trim().split('\n').slice(-3).join(' ') || `npm exited with ${String(result.exitCode)}`),
        });
    }
}

/**
 * Updates exactly the invoked installation (local project dependency or the active global installation).
 *
 * @private engine self-update
 */
export async function updateEngine(check: UpdateCheck, onOutput?: (line: string) => void, env: NodeJS.ProcessEnv = process.env): Promise<string> {
    const { installation } = check;
    if (!check.latest) throw new PtbkError('No release to update to is known.', { kind: 'technical' });
    await installEngineVersion(installation, check.latest, { env, onOutput });
    return installation.scope === 'local' ? `Updated the local installation in ${installation.ownerProject} to ${check.latest}.` : `Updated the global installation to ${check.latest}.`;
}

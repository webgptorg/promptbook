import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { readJsonIfExists } from '../common/fs.js';
import { runProcess } from '../common/process.js';
import { isNewerVersion } from '../common/semver.js';
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
 * Updates exactly the invoked installation (local project dependency or the active global installation).
 *
 * @private engine self-update
 */
export async function updateEngine(check: UpdateCheck, onOutput?: (line: string) => void, env: NodeJS.ProcessEnv = process.env): Promise<string> {
    const { installation } = check;
    const target = `ptbk@${check.latest ?? 'latest'}`;
    if (installation.scope === 'local' && installation.ownerProject) {
        const manifest = await readJsonIfExists<{ devDependencies?: Record<string, string> }>(join(installation.ownerProject, 'package.json')).catch(() => undefined);
        const development = Boolean(manifest?.devDependencies?.ptbk);
        const result = await runProcess('npm', ['install', '--save-exact', development ? '--save-dev' : '--save-prod', target], { cwd: installation.ownerProject, env, timeoutMs: 10 * 60_000, onStdoutLine: onOutput, onStderrLine: onOutput });
        if (result.exitCode !== 0) throw new PtbkError('Updating the local ptbk installation failed.', { kind: 'technical', reason: result.stderr.trim().split('\n').slice(-3).join(' ') });
        return `Updated the local installation in ${installation.ownerProject} to ${check.latest}.`;
    }
    if (installation.scope === 'global') {
        const result = await runProcess('npm', ['install', '--global', target], { cwd: installation.root, env, timeoutMs: 10 * 60_000, onStdoutLine: onOutput, onStderrLine: onOutput });
        if (result.exitCode !== 0) throw new PtbkError('Updating the global ptbk installation failed.', { kind: 'technical', reason: result.stderr.trim().split('\n').slice(-3).join(' ') });
        return `Updated the global installation to ${check.latest}.`;
    }
    throw new PtbkError(`This ${installation.scope} installation cannot be updated by ptbk.`, {
        kind: 'unsupported',
        reason: installation.scope === 'npx' ? 'It runs from the transient npx cache.' : 'It runs from a source checkout.',
        next: [installation.scope === 'npx' ? 'Run `npx ptbk@latest ...` or install ptbk locally/globally.' : 'Pull and rebuild the checkout.'],
    });
}

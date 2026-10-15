import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { pathExists, readJsonIfExists, writeFileAtomic } from '../common/fs.js';
import { slugify } from '../common/ids.js';
import { runProcess, which } from '../common/process.js';
import { ENGINE_VERSION, detectInstallation, type InstallationInfo } from '../common/version.js';

/**
 * Minimal package manifest view.
 */
type Manifest = { name?: string; version?: string; private?: boolean; scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

/**
 * State of `ptbk` in a destination project.
 *
 * @private local installation
 */
export type LocalInstallation = {
    /** Section declaring ptbk. */
    readonly declaredIn?: 'dependencies' | 'devDependencies';
    /** Declared version specification. */
    readonly specification?: string;
    /** Installed version in node_modules. */
    readonly installedVersion?: string;
    /** Declared and installed. */
    readonly usable: boolean;
    /** The destination has a package.json. */
    readonly hasManifest: boolean;
};

/**
 * Inspects whether the destination itself declares and has a usable local `ptbk`.
 *
 * @private local installation
 */
export async function inspectLocalInstallation(root: string): Promise<LocalInstallation> {
    const manifest = await readJsonIfExists<Manifest>(join(root, 'package.json')).catch(() => undefined);
    const declaredIn = manifest?.dependencies?.ptbk ? 'dependencies' : manifest?.devDependencies?.ptbk ? 'devDependencies' : undefined;
    const installed = await readJsonIfExists<{ version?: string }>(join(root, 'node_modules', 'ptbk', 'package.json')).catch(() => undefined);
    return {
        declaredIn,
        specification: declaredIn ? manifest![declaredIn]!.ptbk : undefined,
        installedVersion: installed?.version,
        usable: Boolean(declaredIn && installed?.version),
        hasManifest: Boolean(manifest),
    };
}

/**
 * Package manager of a project, from its lockfile.
 */
async function packageManager(root: string): Promise<'npm' | 'pnpm' | 'yarn'> {
    if (await pathExists(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
    if (await pathExists(join(root, 'yarn.lock'))) return 'yarn';
    return 'npm';
}

/**
 * Creates a minimal private package manifest when the destination has none.
 *
 * @private local installation
 */
export async function ensureManifest(root: string, name: string, scripts: Record<string, string> = {}): Promise<boolean> {
    const path = join(root, 'package.json');
    const manifest = await readJsonIfExists<Manifest>(path).catch(() => undefined);
    if (manifest) {
        const missing = Object.entries(scripts).filter(([script]) => manifest.scripts?.[script] === undefined);
        if (!missing.length) return false;
        await writeFileAtomic(path, `${JSON.stringify({ ...manifest, scripts: { ...(manifest.scripts ?? {}), ...Object.fromEntries(missing) } }, null, 2)}\n`);
        return true;
    }
    await writeFileAtomic(path, `${JSON.stringify({ name: slugify(name), version: '0.0.0', private: true, scripts }, null, 2)}\n`);
    return true;
}

/**
 * Installs the exact running engine version into the destination's regular dependencies (or repairs a declared one).
 *
 * Never substitutes another version; a failure is explained.
 *
 * @private local installation
 */
export async function installLocally(root: string, onOutput?: (line: string) => void, env: NodeJS.ProcessEnv = process.env): Promise<{ changed: boolean; version: string }> {
    const before = await inspectLocalInstallation(root);
    if (before.usable) return { changed: false, version: before.installedVersion! };
    const manager = await packageManager(root);
    const specification = env.PTBK_LOCAL_INSTALL_SPEC || `ptbk@${ENGINE_VERSION}`;
    let args: string[];
    if (before.declaredIn) {
        // Repair: restore the declared choice instead of replacing it.
        args = manager === 'yarn' ? ['install'] : ['install'];
    } else if (manager === 'pnpm') args = ['add', '--save-exact', specification];
    else if (manager === 'yarn') args = ['add', '--exact', specification];
    else args = ['install', '--save-exact', '--save-prod', specification];
    const result = await runProcess(manager, args, { cwd: root, env, timeoutMs: 10 * 60_000, onStdoutLine: onOutput, onStderrLine: onOutput });
    const after = await inspectLocalInstallation(root);
    if (result.exitCode !== 0 || !after.usable) {
        throw new PtbkError(`Installing ptbk ${before.declaredIn ? `(declared ${before.specification})` : ENGINE_VERSION} locally failed.`, {
            kind: 'setup',
            phase: 'local installation',
            project: root,
            reason: (result.spawnError ?? result.stderr.trim().split('\n').slice(-4).join(' ')) || 'The package is not present after installation.',
            effect: 'No other version was substituted.',
            next: [before.declaredIn ? `Run \`${manager} install\` in ${root}.` : `Check that ptbk@${ENGINE_VERSION} is published and reachable, or choose the global CLI.`],
        });
    }
    return { changed: true, version: after.installedVersion! };
}

/**
 * Verifies that a global `ptbk` is available (and is not merely a parent project's local executable).
 *
 * @private local installation
 */
export async function verifyGlobalAvailability(env: NodeJS.ProcessEnv = process.env): Promise<{ available: boolean; path?: string; installation?: InstallationInfo; note: string }> {
    const path = await which('ptbk', env);
    if (!path) return { available: false, note: '`ptbk` is not on PATH. Install it with `npm install --global ptbk`.' };
    const { realpath } = await import('node:fs/promises');
    let resolved = path;
    try {
        resolved = await realpath(path);
    } catch {
        // keep the PATH entry
    }
    const root = resolved.replace(/[\\/]bin[\\/]ptbk(\.js|\.cmd)?$/i, '');
    const installation = detectInstallation(root);
    if (installation.scope === 'local') return { available: false, path, installation, note: `\`ptbk\` on PATH belongs to the project at ${installation.ownerProject}, not a global installation.` };
    return { available: true, path, installation, note: `Global ptbk at ${path}.` };
}

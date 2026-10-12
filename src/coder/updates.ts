import { readFile, realpath } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runProcess, type ProcessResult } from './harness.js';

/** The invoked installation, independently of an initialization destination. @private */
export interface EngineInstallation { packagePath: string; version: string; scope: 'local' | 'global' | 'unsupported'; projectPath?: string; development?: boolean; diagnostic?: string }
/** Best-effort release metadata never turns offline status into a false currency claim. @private */
export interface EngineUpdate { current: string; latest?: string; available: boolean; diagnostic?: string }
/** Injectable registry/process seams keep update tests offline and bounded. @private */
export interface EngineUpdateOptions { signal?: AbortSignal; packagePath?: string; registry?: string; fetch?: typeof fetch; run?: typeof runProcess; onOutput?: (text: string) => void }

/** Compare semantic release versions without lexicographic version mistakes. @private */
export function newerEngineVersion(candidate: string, current: string): boolean {
    const parse = (text: string) => /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(text);
    const next = parse(candidate); const previous = parse(current);
    if (!next || !previous) return false;
    for (let index = 1; index <= 3; index++) if (Number(next[index]) !== Number(previous[index])) return Number(next[index]) > Number(previous[index]);
    if (!next[4] || !previous[4]) return !!previous[4] && !next[4];
    const left = next[4].split('.'); const right = previous[4].split('.');
    for (let index = 0; index < Math.max(left.length, right.length); index++) {
        const a = left[index]; const b = right[index];
        if (a === b) continue;
        if (a === undefined) return false;
        if (b === undefined) return true;
        if (/^\d+$/.test(a) && /^\d+$/.test(b)) return Number(a) > Number(b);
        if (/^\d+$/.test(a) !== /^\d+$/.test(b)) return !/^\d+$/.test(a);
        return a > b;
    }
    return false;
}

/** Identify the source installation before any destination setup or npm mutation. @private */
export async function inspectEngineInstallation(options: EngineUpdateOptions = {}): Promise<EngineInstallation> {
    const packagePath = await realpath(options.packagePath ?? fileURLToPath(new URL('../../', import.meta.url)));
    const manifest = JSON.parse(await readFile(join(packagePath, 'package.json'), 'utf8')) as { version: string };
    const installation: EngineInstallation = { packagePath, version: manifest.version, scope: 'unsupported' };
    const result = await (options.run ?? runProcess)('npm', ['root', '--global'], { cwd: packagePath, signal: options.signal, timeoutMs: 10_000 });
    if (result.exitCode === 0 && !result.spawnError) {
        try { if (await realpath(join(result.output.trim(), 'ptbk')) === packagePath) return { ...installation, scope: 'global' }; }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    if (basename(dirname(packagePath)) === 'node_modules') {
        const projectPath = dirname(dirname(packagePath));
        try {
            const project = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
            if (project.dependencies?.ptbk !== undefined || project.devDependencies?.ptbk !== undefined) return { ...installation, scope: 'local', projectPath, development: project.dependencies?.ptbk === undefined };
        } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    return { ...installation, diagnostic: 'This engine is a development checkout, linked package or unsupported installation. Update its source explicitly; no other installation will be changed.' };
}

/** Check a released engine version with a deadline; unavailable metadata does not block setup. @private */
export async function checkEngineUpdate(current: string, options: EngineUpdateOptions = {}): Promise<EngineUpdate> {
    try {
        const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(5_000)]) : AbortSignal.timeout(5_000);
        const response = await (options.fetch ?? fetch)(new URL('ptbk/latest', options.registry ?? 'https://registry.npmjs.org/'), { signal, headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(`Registry returned HTTP ${response.status}`);
        const release = await response.json() as { version?: string };
        if (typeof release.version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(release.version)) throw new Error('Registry did not expose a valid release version');
        return { current, latest: release.version, available: newerEngineVersion(release.version, current) };
    } catch (error) {
        if (options.signal?.aborted) throw error;
        return { current, available: false, diagnostic: `Engine update check unavailable: ${(error as Error).message}. Continuing with ${current}; release currency is unknown.` };
    }
}

/** Update only the invoked installation, verify its manifest, then require a fresh invocation. @private */
export async function updateEngineInstallation(installation: EngineInstallation, version: string, options: EngineUpdateOptions = {}): Promise<ProcessResult> {
    if (installation.scope === 'unsupported') throw new Error(installation.diagnostic);
    if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Invalid target engine version.');
    const args = ['install', ...(installation.scope === 'global' ? ['--global'] : ['--prefix', installation.projectPath!, '--workspaces=false', installation.development ? '--save-dev' : '--save-prod', '--save-exact']), `ptbk@${version}`];
    const result = await (options.run ?? runProcess)('npm', args, { cwd: installation.projectPath ?? installation.packagePath, signal: options.signal, timeoutMs: 300_000, onOutput: options.onOutput });
    if (result.exitCode !== 0 || result.spawnError || result.cancelled) throw new Error(`Engine update failed: ${result.spawnError || result.output || `npm exited ${result.exitCode}`}. The target project has not been initialized; retry or continue with the current installation.`);
    const manifest = JSON.parse(await readFile(join(installation.packagePath, 'package.json'), 'utf8')) as { version: string };
    if (manifest.version !== version) throw new Error(`Engine update reported success but ${installation.packagePath} contains ${manifest.version}, expected ${version}. Target setup was not started.`);
    return result;
}

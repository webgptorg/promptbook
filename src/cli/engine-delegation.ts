import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { engineBin, incompatibleEngineError, type ServiceLookup } from '../service/control.js';
import type { Project } from '../project/workspace.js';

/**
 * Entry point of the service's own installation when it still holds exactly the version the service runs (an
 * upgraded, removed or relinked installation would misrepresent the service).
 */
async function ownInstallation(lookup: Extract<ServiceLookup, { state: 'running' }>): Promise<string | undefined> {
    const manifest = await readFile(join(lookup.record.installation, 'package.json'), 'utf8')
        .then((text) => JSON.parse(text) as { name?: string; version?: string })
        .catch(() => undefined);
    if (manifest?.name !== 'ptbk' || manifest.version !== lookup.engine.version) return undefined;
    const bin = engineBin(lookup.record);
    return (await access(bin).then(
        () => true,
        () => false,
    ))
        ? bin
        : undefined;
}

/**
 * Runs a viewer command (`dashboard`, `status`) through the installation of a service whose snapshots this client
 * cannot read, so the view shows that engine with its own version instead of misrendering it. The terminal is handed
 * over for the child's lifetime; Ctrl+C belongs to the child.
 *
 * Returns the child's exit code, or throws an actionable error when the service's installation is gone.
 *
 * @private CLI engine delegation
 */
export async function delegateToEngine(project: Project, lookup: Extract<ServiceLookup, { state: 'running' }>, args: readonly string[], cwd: string, env: NodeJS.ProcessEnv): Promise<number> {
    const bin = await ownInstallation(lookup);
    if (!bin) throw incompatibleEngineError(project, lookup.record, lookup.engine, { installationGone: true });
    const ignore = (): void => undefined;
    process.on('SIGINT', ignore);
    try {
        return await new Promise<number>((resolve, reject) => {
            const child = spawn(process.execPath, [bin, ...args], { cwd, env, stdio: 'inherit' });
            child.once('error', reject);
            child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
        });
    } finally {
        process.off('SIGINT', ignore);
    }
}

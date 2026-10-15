import { chmod, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, pathExists } from '../common/fs.js';
import { runProcess, which } from '../common/process.js';
import { userDataDirectory } from '../harness/maintenance.js';

/**
 * Official release asset of cloudflared for this platform.
 */
function releaseAsset(): { file: string; archive: boolean } | undefined {
    const arch = process.arch === 'x64' ? 'amd64' : process.arch === 'arm64' ? 'arm64' : process.arch === 'arm' ? 'arm' : process.arch === 'ia32' ? '386' : undefined;
    if (!arch) return undefined;
    if (process.platform === 'linux') return { file: `cloudflared-linux-${arch}`, archive: false };
    if (process.platform === 'darwin') return { file: `cloudflared-darwin-${arch === 'arm64' ? 'arm64' : 'amd64'}.tgz`, archive: true };
    if (process.platform === 'win32') return { file: `cloudflared-windows-${arch === '386' ? '386' : 'amd64'}.exe`, archive: false };
    return undefined;
}

/**
 * Path where ptbk keeps its own cloudflared copy (user-level tool cache, outside projects).
 *
 * @private tunnel client
 */
export function managedCloudflaredPath(): string {
    return join(userDataDirectory(), 'bin', process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
}

/**
 * Finds a usable cloudflared executable (PATH first, then the managed copy); never installs.
 *
 * @private tunnel client
 */
export async function findCloudflared(env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
    const onPath = await which('cloudflared', env);
    if (onPath) return onPath;
    const managed = managedCloudflaredPath();
    return (await pathExists(managed)) ? managed : undefined;
}

/**
 * Downloads the official cloudflared release into the managed tool cache (setup flows only).
 *
 * @private tunnel client
 */
export async function installCloudflared(onProgress?: (text: string) => void): Promise<string> {
    const asset = releaseAsset();
    if (!asset) throw new PtbkError(`No cloudflared build is available for ${process.platform}/${process.arch}.`, { kind: 'unsupported', next: ['Install cloudflared manually or use `--no-tunnel`.'] });
    const target = managedCloudflaredPath();
    await ensureDirectory(join(target, '..'));
    const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/${asset.file}`;
    onProgress?.(`Downloading cloudflared from ${url}`);
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new PtbkError('Downloading cloudflared failed.', { kind: 'technical', reason: `HTTP ${response.status} for ${url}`, next: ['Check the network, install cloudflared manually, or use `--no-tunnel`.'] });
    const bytes = Buffer.from(await response.arrayBuffer());
    const temporary = `${target}.download`;
    if (asset.archive) {
        const archive = `${temporary}.tgz`;
        await writeFile(archive, bytes);
        const directory = `${temporary}.d`;
        await ensureDirectory(directory);
        const extracted = await runProcess('tar', ['-xzf', archive, '-C', directory], { cwd: directory, timeoutMs: 60_000 });
        await rm(archive, { force: true });
        if (extracted.exitCode !== 0) throw new PtbkError('Extracting cloudflared failed.', { kind: 'technical', reason: extracted.stderr.trim() });
        await rename(join(directory, 'cloudflared'), temporary);
        await rm(directory, { recursive: true, force: true });
    } else {
        await writeFile(temporary, bytes);
    }
    await chmod(temporary, 0o755);
    await rename(temporary, target);
    const version = await runProcess(target, ['--version'], { cwd: join(target, '..'), timeoutMs: 15_000 });
    if (version.exitCode !== 0) throw new PtbkError('The downloaded cloudflared does not run.', { kind: 'technical', reason: version.stderr.trim() || version.spawnError });
    onProgress?.(`Installed ${version.stdout.trim().split('\n')[0] ?? 'cloudflared'} at ${target}`);
    return target;
}

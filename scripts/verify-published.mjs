import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { validateRelease } from './validate-release.mjs';

/** Executes registry reads and installations without a shell. */
const execute = promisify(execFile);
/** Every release is verified against the public npm registry. */
const registry = 'https://registry.npmjs.org/';
/** Bounded online requests avoid silently verifying a stale registry cache. */
const registryArguments = ['--registry', registry, '--prefer-online', '--fetch-retries=0', '--fetch-timeout=15000'];

/** Rejects missing artifacts, a different version, or the wrong release channel. */
export function assertPublishedMetadata(release, metadata) {
    assert.equal(metadata.version, release.version, 'The registry version differs from this release.');
    assert.equal(metadata['dist-tags']?.[release.tag], release.version, `The ${release.tag} dist-tag does not point to this release.`);
    assert.equal(metadata['dist.tarball'], `${registry}ptbk/-/ptbk-${release.version}.tgz`, 'The registry has no expected ptbk tarball.');
    assert.match(metadata['dist.integrity'] || '', /^sha512-[A-Za-z0-9+/]+={0,2}$/, 'The registry has no SHA-512 artifact integrity.');
}

/** Verifies registry metadata and local/global installations of the exact published version. */
export async function verifyPublished(release) {
    release ||= await validateRelease();
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const { stdout } = await execute(npm, ['view', `ptbk@${release.version}`, 'version', 'dist-tags', 'dist.integrity', 'dist.tarball', '--json', ...registryArguments], { timeout: 30_000 });
    assertPublishedMetadata(release, JSON.parse(stdout));
    const temporary = await mkdtemp(join(tmpdir(), 'ptbk-registry-'));
    try {
        const local = join(temporary, 'local project');
        const prefix = join(temporary, 'global prefix');
        await mkdir(local);
        await writeFile(join(local, 'package.json'), '{"name":"ptbk-registry-fixture","version":"0.0.0","private":true}\n');
        const installArguments = ['--ignore-scripts', '--no-audit', '--no-fund', ...registryArguments, `ptbk@${release.version}`];
        await execute(npm, ['install', ...installArguments], { cwd: local, timeout: 60_000 });
        const localExecutable = process.platform === 'win32' ? join(local, 'node_modules', 'ptbk', 'bin', 'ptbk.js') : join(local, 'node_modules', '.bin', 'ptbk');
        const installed = await execute(process.platform === 'win32' ? process.execPath : localExecutable, process.platform === 'win32' ? [localExecutable, '--version'] : ['--version'], { cwd: local, timeout: 15_000 });
        assert.equal(installed.stdout.trim(), release.version, 'The registry-installed local executable reports a different version.');
        await execute(npm, ['install', '--global', '--prefix', prefix, ...installArguments], { cwd: local, timeout: 60_000 });
        const globalExecutable = process.platform === 'win32' ? join(prefix, 'node_modules', 'ptbk', 'bin', 'ptbk.js') : join(prefix, 'bin', 'ptbk');
        const installedGlobal = await execute(process.platform === 'win32' ? process.execPath : globalExecutable, process.platform === 'win32' ? [globalExecutable, '--version'] : ['--version'], { cwd: local, timeout: 15_000 });
        assert.equal(installedGlobal.stdout.trim(), release.version, 'The registry-installed global executable reports a different version.');
        process.stdout.write(`Verified published ptbk@${release.version} (${release.tag}), artifact integrity, and local/global executable installations.\n`);
    } finally {
        await rm(temporary, { recursive: true, force: true });
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await verifyPublished();

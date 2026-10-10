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
/** The npm executable used for registry reads and installation verification. */
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
/** npm publication can return successfully before the public registry serves the release. */
const propagationTimeout = 10 * 60_000;
/** Fresh registry reads are spaced out while npm finishes processing the artifact. */
const propagationInterval = 10_000;

/** Rejects an artifact that exists but does not match the intended release. */
function assertPublishedArtifact(release, metadata) {
    assert(metadata && typeof metadata === 'object' && !Array.isArray(metadata), 'The registry returned invalid release metadata.');
    assert.equal(metadata.version, release.version, 'The registry version differs from this release.');
    assert.equal(metadata['dist.tarball'], `${registry}ptbk/-/ptbk-${release.version}.tgz`, 'The registry has no expected ptbk tarball.');
    assert.match(metadata['dist.integrity'] || '', /^sha512-[A-Za-z0-9+/]+={0,2}$/, 'The registry has no SHA-512 artifact integrity.');
}

/** Rejects missing artifacts, a different version, or the wrong release channel. */
export function assertPublishedMetadata(release, metadata) {
    assertPublishedArtifact(release, metadata);
    assert.equal(metadata['dist-tags']?.[release.tag], release.version, `The ${release.tag} dist-tag does not point to this release.`);
}

/** Reads the exact release without npm's separate, hidden fetch retry delays. */
async function readPublishedMetadata(release) {
    const { stdout } = await execute(npm, ['view', `ptbk@${release.version}`, 'version', 'dist-tags', 'dist.integrity', 'dist.tarball', '--json', ...registryArguments], { timeout: 30_000 });
    return JSON.parse(stdout);
}

/** Extracts npm's registry error code from a failed child process. */
function registryErrorCode(error) {
    if (typeof error?.code === 'string') return error.code;
    const output = `${error?.stderr || ''}\n${error?.stdout || ''}`;
    return output.match(/(?:npm (?:error|ERR!) code\s+|"code"\s*:\s*")([A-Z][A-Z0-9_]+)/)?.[1];
}

/** Missing releases and temporary registry/network failures can resolve during propagation. */
function isRetryableRegistryError(error) {
    const code = registryErrorCode(error);
    return code
        ? /^(?:E404|ETARGET|ENOVERSIONS|E429|E50[0-9]|ETIMEDOUT|ESOCKETTIMEDOUT|ECONNRESET|ECONNREFUSED|ENETUNREACH|EAI_AGAIN|ENOTFOUND)$/.test(code)
        : error?.killed === true;
}

/** Waits between fresh reads; injectable polling dependencies keep the fixtures fast. */
function waitForRetry(milliseconds) {
    return new Promise(resolveWait => setTimeout(resolveWait, milliseconds));
}

/** Explains an exhausted propagation deadline without losing the last registry failure. */
function propagationError(release, timeoutMs, attempts, pending) {
    const reason = registryErrorCode(pending) || pending?.message || 'The registry returned no metadata.';
    return new Error(`ptbk@${release.version} did not become available on ${release.tag} within ${timeoutMs / 1000} seconds (${attempts} registry reads). Last result: ${reason}`, { cause: pending });
}

/**
 * Polls until the exact artifact and release channel are public, with a bounded deadline.
 * Authentication failures and inconsistent artifact metadata fail immediately; an old
 * dist-tag can be a stale registry replica and is retried within the same deadline.
 */
export async function waitForPublishedMetadata(release, {
    readMetadata = readPublishedMetadata,
    wait = waitForRetry,
    now = () => performance.now(),
    log = message => process.stdout.write(`${message}\n`),
    timeoutMs = propagationTimeout,
    intervalMs = propagationInterval,
} = {}) {
    assert(Number.isFinite(timeoutMs) && timeoutMs > 0, 'The registry propagation timeout must be positive.');
    assert(Number.isFinite(intervalMs) && intervalMs > 0, 'The registry polling interval must be positive.');
    const deadline = now() + timeoutMs;
    let attempts = 0;
    let pending;
    while (true) {
        if (attempts > 0 && now() >= deadline) throw propagationError(release, timeoutMs, attempts, pending);
        attempts++;
        let metadata;
        let registryFailed = false;
        try {
            metadata = await readMetadata(release);
        } catch (error) {
            if (!isRetryableRegistryError(error)) throw error;
            pending = error;
            registryFailed = true;
        }
        if (!registryFailed) {
            assertPublishedArtifact(release, metadata);
            if (metadata['dist-tags']?.[release.tag] === release.version) return metadata;
            pending = new Error(`The ${release.tag} dist-tag does not point to ${release.version}.`);
        }
        const remaining = deadline - now();
        const reason = registryErrorCode(pending) || pending?.message || 'The registry returned no metadata.';
        if (remaining <= 0) {
            throw propagationError(release, timeoutMs, attempts, pending);
        }
        log(`Waiting for npm registry propagation of ptbk@${release.version}: ${reason}`);
        await wait(Math.min(intervalMs, remaining));
    }
}

/** Verifies registry metadata and local/global installations of the exact published version. */
export async function verifyPublished(release) {
    release ||= await validateRelease();
    await waitForPublishedMetadata(release);
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

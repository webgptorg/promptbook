import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import JSZip from 'jszip';
import { validateRelease } from './validate-release.mjs';
import { vscodeVersion } from './vscode-version.mjs';

/** Repository root, independent of the caller's working directory. */
const root = fileURLToPath(new URL('../', import.meta.url));
/** Child processes never interpret arguments as shell commands. */
const execute = promisify(execFile);

/** Read only the extension payload, ignoring ZIP dates and Marketplace container signatures. */
export async function extensionPayload(bytes) {
    const zip = await JSZip.loadAsync(bytes);
    const entries = Object.values(zip.files).filter((entry) => !entry.dir && entry.name.startsWith('extension/'));
    return new Map(await Promise.all(entries.map(async (entry) => [entry.name, await entry.async('nodebuffer')])));
}

/** A version number alone is insufficient: retries must verify the complete actual extension payload. */
export async function assertSameExtension(expected, actual) {
    const [left, right] = await Promise.all([extensionPayload(expected), extensionPayload(actual)]);
    if (!left.has('extension/package.json') || left.size !== right.size) throw new Error('Published VSIX has a different extension file list.');
    for (const [name, content] of left) {
        if (!right.get(name)?.equals(content)) throw new Error(`Published VSIX differs at ${name}; publish a new version instead.`);
    }
}

/** Fetch the exact published version; 404 is a missing version, all other failures stay errors. */
async function marketplaceBytes(version) {
    const response = await fetch(`https://marketplace.visualstudio.com/_apis/public/gallery/publishers/Promptbook/vsextensions/book-extension/${version}/vspackage`, { signal: AbortSignal.timeout(60000) });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`Marketplace download failed (${response.status}).`);
    return Buffer.from(await response.arrayBuffer());
}

/** Publish using the existing Marketplace identity and verify the version users can actually install. */
async function publishMarketplace(path, bytes, version) {
    const existing = await marketplaceBytes(version);
    if (existing) {
        await assertSameExtension(bytes, existing);
        process.stdout.write(`Verified existing Promptbook.book-extension ${version}.\n`);
        return;
    }
    const args = [join(root, 'node_modules/@vscode/vsce/vsce'), 'publish', '--packagePath', path];
    if (!process.env.VSCE_PAT) args.push('--oidc');
    await execute(process.execPath, args, { cwd: root, maxBuffer: 8 * 1024 * 1024, timeout: 180000 });
    for (let attempt = 0; attempt < 6; attempt++) {
        const published = await marketplaceBytes(version);
        if (published) {
            await assertSameExtension(bytes, published);
            process.stdout.write(`Published and verified Promptbook.book-extension ${version}.\n`);
            return;
        }
        await new Promise((done) => setTimeout(done, 5000));
    }
    throw new Error('Marketplace accepted the publication, but the downloadable VSIX is not available yet. Retry this job before bumping a version.');
}

/** Attach the VSIX/checksum to the matching immutable GitHub release, safely reusing identical retries. */
async function attachRelease(tag, path, bytes) {
    const work = await mkdtemp(join(tmpdir(), 'ptbk-vscode-'));
    const gh = async (args) => (await execute('gh', args, { cwd: root, maxBuffer: 16 * 1024 * 1024 })).stdout;
    try {
        let release;
        try { release = JSON.parse(await gh(['release', 'view', tag, '--json', 'tagName,assets'])); }
        catch (error) {
            if (!/release not found/i.test(error.stderr ?? error.message)) throw error;
            await gh(['release', 'create', tag, '--verify-tag', '--title', `ptbk ${tag.slice(1)}`, '--notes', `Promptbook ${tag.slice(1)} and its matching Book language extension.`, ...(tag.includes('-') ? ['--prerelease'] : [])])
                .catch(async (creationError) => {
                    // The Windows installer may have created this same release concurrently.
                    try { await gh(['release', 'view', tag, '--json', 'tagName']); } catch { throw creationError; }
                });
            release = JSON.parse(await gh(['release', 'view', tag, '--json', 'tagName,assets']));
        }
        const name = basename(path);
        let installed = bytes;
        if (release.assets.some((asset) => asset.name === name)) {
            await gh(['release', 'download', tag, '--pattern', name, '--dir', work]);
            installed = await readFile(join(work, name));
            await assertSameExtension(bytes, installed);
        } else await gh(['release', 'upload', tag, path]);
        const checksumName = `${name}.sha256`;
        const checksum = `${createHash('sha256').update(installed).digest('hex')}  ${name}\n`;
        if (!release.assets.some((asset) => asset.name === checksumName)) {
            await writeFile(join(work, checksumName), checksum);
            await gh(['release', 'upload', tag, join(work, checksumName)]);
        }
        const verify = join(work, 'verify');
        await gh(['release', 'download', tag, '--pattern', name, '--pattern', checksumName, '--dir', verify]);
        const downloaded = await readFile(join(verify, name));
        await assertSameExtension(bytes, downloaded);
        const actualChecksum = (await readFile(join(verify, checksumName), 'utf8')).trim();
        const expectedChecksum = `${createHash('sha256').update(downloaded).digest('hex')}  ${name}`;
        if (actualChecksum !== expectedChecksum) throw new Error('The downloadable VSIX does not match its GitHub Release checksum.');
        process.stdout.write(`Published and verified ${name} on ${tag}.\n`);
    } finally { await rm(work, { recursive: true, force: true }); }
}

/** This mutation is available only in the canonical repository's checked release workflow. */
async function publish() {
    if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== 'webgptorg/promptbook' || !process.env.RELEASE_TAG) {
        throw new Error('Run release:vscode in the official publish.yml workflow with an existing release tag.');
    }
    const release = await validateRelease(process.env.RELEASE_TAG);
    const path = join(root, 'dist-vscode', `book-extension-ptbk-${release.version}.vsix`);
    const bytes = await readFile(path);
    const payload = await extensionPayload(bytes);
    const manifest = JSON.parse(payload.get('extension/package.json').toString('utf8'));
    const version = vscodeVersion(release.version);
    if (manifest.publisher !== 'Promptbook' || manifest.name !== 'book-extension' || manifest.version !== version || manifest.promptbook?.version !== release.version) throw new Error('The packaged Marketplace identity or engine version does not match this release.');
    await attachRelease(`v${release.version}`, path, bytes);
    await publishMarketplace(path, bytes, version);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await publish().catch((error) => {
        process.stderr.write(`${error.message}\n${error.stderr ?? ''}`);
        process.exitCode = 1;
    });
}

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { validateRelease } from './validate-release.mjs';

/** Runs the GitHub CLI without a shell. */
const execute = promisify(execFile);

/** Runs `gh` and returns stdout. */
async function gh(args, options = {}) {
    const { stdout } = await execute('gh', args, { maxBuffer: 64 * 1024 * 1024, ...options });
    return stdout;
}

/** SHA-256 of a file. */
async function sha256(path) {
    return createHash('sha256').update(await readFile(path)).digest('hex');
}

/**
 * Publishes the Windows installer of a release to its GitHub Release, idempotently: an identical existing asset is
 * reused, a different one is never overwritten (the release is then incomplete and reported), and the actual
 * downloadable asset is verified against the published checksum afterwards.
 */
async function publishInstaller(installerPath) {
    const release = await validateRelease(process.env.RELEASE_TAG);
    const tag = `v${release.version}`;
    const name = basename(installerPath);
    if (!name.includes(release.version)) throw new Error(`The installer ${name} does not identify version ${release.version}.`);
    const digest = await sha256(installerPath);
    const checksumName = `${name}.sha256`;
    const work = await mkdtemp(join(tmpdir(), 'ptbk-installer-'));
    try {
        const checksumPath = join(work, checksumName);
        await writeFile(checksumPath, `${digest}  ${name}\n`);
        const exists = await gh(['release', 'view', tag, '--json', 'tagName,assets'])
            .then((output) => JSON.parse(output))
            .catch(() => undefined);
        if (!exists) {
            const prerelease = release.version.includes('-');
            const notes = [
                `Promptbook ${release.version}.`,
                '',
                `- **npm:** \`npm install -g ptbk@${release.version}\` (the ordinary CLI installation).`,
                `- **Windows installer:** \`${name}\` prepares missing prerequisites (Node.js, npm, Git), installs ptbk ${release.version} globally and creates an empty first-project folder. It then opens a terminal running \`ptbk init\`, where the project itself is initialized (intent, tools, login, Git and the background start). SHA-256: \`${digest}\`.`,
            ].join('\n');
            await gh(['release', 'create', tag, '--verify-tag', '--title', `ptbk ${release.version}`, '--notes', notes, ...(prerelease ? ['--prerelease'] : [])]);
        }
        const assets = exists?.assets ?? [];
        const existing = assets.find((asset) => asset.name === name);
        if (existing) {
            await gh(['release', 'download', tag, '--pattern', name, '--dir', work, '--clobber']);
            const published = await sha256(join(work, name));
            if (published !== digest) throw new Error(`The release already has a different ${name} (SHA-256 ${published}); it is not overwritten. Publish a new version instead.`);
            process.stdout.write(`Reusing the identical published ${name}.\n`);
        } else {
            await gh(['release', 'upload', tag, installerPath]);
        }
        if (!assets.some((asset) => asset.name === checksumName)) await gh(['release', 'upload', tag, checksumPath]);
        // Verify what users actually download, not the upload response.
        const verify = join(work, 'verify');
        await gh(['release', 'download', tag, '--pattern', name, '--pattern', checksumName, '--dir', verify, '--clobber']);
        const downloaded = await sha256(join(verify, name));
        const published = (await readFile(join(verify, checksumName), 'utf8')).split(/\s+/)[0];
        if (downloaded !== digest || published !== digest) throw new Error(`The downloadable ${name} does not match its checksum (downloaded ${downloaded}, published ${published}, built ${digest}).`);
        process.stdout.write(`Published and verified ${name} (SHA-256 ${digest}) on the ${tag} GitHub Release.\n`);
    } finally {
        await rm(work, { recursive: true, force: true });
    }
}

const installer = process.argv[2];
if (!installer) throw new Error('Usage: node scripts/publish-windows-installer.mjs <path to the installer .exe>');
await publishInstaller(installer);

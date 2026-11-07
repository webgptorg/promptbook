import { execFileSync, spawnSync } from 'node:child_process';
import { chmod, cp, mkdir, mkdtemp, readFile, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Arch, Platform, build } from 'electron-builder';

/** Package on the native architecture using Node and npm from the same standard Node distribution. */
const desktop = fileURLToPath(new URL('./', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
const engine = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const arch = process.arch;
const release = process.argv.includes('--release');
const signingInputs = ['CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'];
const signed = release && signingInputs.every((key) => Boolean(process.env[key]));
if (process.platform !== 'darwin' || !['arm64', 'x64'].includes(arch)) {
    throw new Error('Build the macOS DMG on a native macOS arm64 or x64 runner.');
}
if (release && !signed && (!engine.version.includes('-') || signingInputs.some((key) => Boolean(process.env[key])))) {
    throw new Error('macOS release signing requires all of: ' + signingInputs.join(', '));
}

const node = await realpath(process.execPath);
const npm = join(dirname(dirname(node)), 'lib', 'node_modules', 'npm');
const npmCli = join(npm, 'bin', 'npm-cli.js');
const work = await mkdtemp(join(tmpdir(), 'ptbk-macos-'));
try {
    const runtime = join(work, 'runtime');
    const installation = join(runtime, 'ptbk');
    const nodeBin = join(runtime, 'bin');
    await mkdir(installation, { recursive: true });
    await mkdir(nodeBin, { recursive: true });
    await cp(node, join(nodeBin, 'node'));
    await cp(npm, join(runtime, 'lib', 'node_modules', 'npm'), { recursive: true, verbatimSymlinks: true });
    await symlink('../lib/node_modules/npm/bin/npm-cli.js', join(nodeBin, 'npm'));
    for (const file of ['bin', 'dist', 'package.json', 'package-lock.json', 'README.md', 'LICENSE.md', 'CHANGELOG.md']) {
        await cp(join(root, file), join(installation, file), { recursive: true });
    }
    await chmod(join(installation, 'bin', 'ptbk.js'), 0o755);
    await symlink('../ptbk/bin/ptbk.js', join(nodeBin, 'ptbk'));
    execFileSync(node, [npmCli, 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: installation, stdio: 'inherit' });
    const name = `Promptbook-${engine.version}-macos-${arch}${signed ? '' : '-unsigned'}.dmg`;
    if (!signed) {
        // The DMG check requires an ad-hoc signature on pull requests too. This path uses no Developer ID.
        process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
        for (const key of signingInputs) delete process.env[key];
        process.env.CSC_FOR_PULL_REQUEST = 'true';
    }
    await build({
        projectDir: desktop,
        targets: Platform.MAC.createTarget('dmg', Arch[arch]),
        publish: 'never',
        config: {
            extraMetadata: { version: engine.version },
            forceCodeSigning: signed,
            mac: {
                artifactName: name,
                extraResources: [
                    { from: runtime, to: 'runtime' },
                    { from: join(root, 'design', 'logo-blue-transparent-256.png'), to: 'tray.png' },
                ],
                ...(!signed && { identity: '-', hardenedRuntime: false, notarize: false }),
            },
            dmg: {
                sign: signed,
                title: '${productName} ${version}${arch}',
                background: join(root, 'design', 'brand', 'macos-dmg-background.png'),
                iconSize: 84,
                contents: [
                    { x: 148, y: 272, type: 'file' },
                    { x: 452, y: 272, type: 'link', path: '/Applications' },
                ],
            },
        },
    });
    if (signed) {
        const dmg = join(desktop, 'release', name);
        const notarization = spawnSync('xcrun', [
            'notarytool', 'submit', dmg, '--wait', '--apple-id', process.env.APPLE_ID,
            '--password', process.env.APPLE_APP_SPECIFIC_PASSWORD, '--team-id', process.env.APPLE_TEAM_ID,
        ], { stdio: 'inherit' });
        if (notarization.status !== 0) throw new Error('Apple notarization of the DMG failed.');
        execFileSync('xcrun', ['stapler', 'staple', dmg], { stdio: 'inherit' });
    }
} finally {
    await rm(work, { recursive: true, force: true });
}

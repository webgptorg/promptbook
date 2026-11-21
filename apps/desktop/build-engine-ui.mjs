import { execFileSync } from 'node:child_process';
import { bundleDigest } from './app-protocol.cjs';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Build only the private app's distributable frontend. A fresh checkout is the default on every local package/build. */
const output = resolve(process.argv[2] || fileURLToPath(new URL('./engine-ui/', import.meta.url)));
const work = await mkdtemp(join(tmpdir(), 'ptbk-engine-ui-'));
try {
    const checkout = process.env.PTBK_APP_CHECKOUT ? resolve(process.env.PTBK_APP_CHECKOUT) : join(work, 'app');
    if (!process.env.PTBK_APP_CHECKOUT) {
        execFileSync('git', ['clone', '--depth=1', '--single-branch', '--branch', 'main', 'https://github.com/webgptorg/app.git', checkout], { stdio: 'inherit' });
    }
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8' }).trim();
    // Build a clean copy even for an existing developer checkout. Never generate files or install packages in it.
    let source = checkout;
    if (process.env.PTBK_APP_CHECKOUT) {
        source = join(work, 'source');
        const archive = join(work, 'app.tar');
        await mkdir(source);
        execFileSync('git', ['archive', '--format=tar', '--output', archive, commit], { cwd: checkout });
        execFileSync('tar', ['-xf', archive, '-C', source]);
    }
    const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
    const ui = join(source, 'apps', 'engine-ui');
    const uiManifest = JSON.parse(await readFile(join(ui, 'package.json'), 'utf8'));
    if (uiManifest.name !== '@ptbk/engine-ui' || !/^bun@\d+\.\d+\.\d+$/.test(manifest.packageManager)) throw new Error('Unsupported engine-ui workspace or package manager in webgptorg/app.');
    const version = manifest.packageManager.slice(4);
    const env = { ...process.env, HUSKY: '0', VITE_UI_GALLERY: '0' };
    for (const key of ['GITHUB_TOKEN', 'GH_TOKEN', 'NODE_AUTH_TOKEN', 'PROMPTBOOK_APP_READ_TOKEN', 'CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID', 'VITE_ENGINE_API', 'PTBK_UI_VERSION']) delete env[key];
    let command = 'bun';
    let prefix = [];
    try {
        if (execFileSync(command, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() !== version) throw new Error('different Bun version');
    } catch {
        // npm scripts supply npm_execpath on all three platforms, including when npm is a Windows .cmd shim.
        if (!process.env.npm_execpath) throw new Error('Install Bun ' + version + ' to build the desktop UI, or run npm --prefix apps/desktop run build.');
        command = process.execPath;
        prefix = [process.env.npm_execpath, 'exec', '--yes', '--package=bun@' + version, '--', 'bun'];
    }
    const run = (args, cwd, capture = false) => execFileSync(command, [...prefix, ...args], { cwd, env, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' });
    run(['install', '--frozen-lockfile'], source);
    run(['run', 'generate'], ui);
    run(['run', 'build'], ui);
    const contract = JSON.parse(run(['-e', "import { ENGINE_API_PREFIX as apiPrefix, ENGINE_UI_CSP as csp } from '@ptbk/engine-api'; console.log(JSON.stringify({apiPrefix,csp}))"], ui, true));
    const dist = join(ui, 'dist');
    const files = (await readdir(dist, { recursive: true, withFileTypes: true })).filter((f) => f.isFile()).map((f) => join(f.parentPath, f.name).slice(dist.length + 1).replaceAll('\\', '/')).sort();
    if (!files.includes('index.html') || !files.some((name) => name.startsWith('assets/') && name.endsWith('.js'))) throw new Error('Missing production engine-ui entry or assets.');
    const sha256 = await bundleDigest(dist, files);
    await mkdir(output, { recursive: true });
    const existing = await readdir(output);
    if (existing.length) {
        if (existing.some((name) => !['bundle.json', 'public'].includes(name)) || !existing.includes('bundle.json') ||
            JSON.parse(await readFile(join(output, 'bundle.json'), 'utf8')).source !== 'webgptorg/app') {
            throw new Error('Choose an empty output directory or a previous desktop UI bundle: ' + output);
        }
        await rm(join(output, 'public'), { recursive: true, force: true });
    }
    await cp(dist, join(output, 'public'), { recursive: true });
    await writeFile(join(output, 'bundle.json'), JSON.stringify({ source: 'webgptorg/app', commit, version: uiManifest.version, sha256, ...contract, files }, null, 2) + '\n');
    console.log('Built @ptbk/engine-ui ' + uiManifest.version + ' from webgptorg/app@' + commit);
} finally {
    await rm(work, { recursive: true, force: true, maxRetries: 3 });
}

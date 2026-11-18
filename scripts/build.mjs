import { execFile } from 'node:child_process';
import { cp, copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { buildComputerHelper, verifyComputerHelper } from './build-computer-helper.mjs';

/**
 * Builds the single publishable `ptbk` package:
 * - compiles `src/` to ESM in `dist/` (the `dist/package.json` boundary marks it as ESM),
 * - copies the browser dashboard assets,
 * - ships the product specification as the running engine's Expert reference material.
 */
const execute = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
try {
    await execute(process.execPath, [join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.json'], { cwd: root });
} catch (error) {
    process.stderr.write(error.stdout || error.stderr || error.message);
    process.exit(1);
}
await copyFile(join(root, 'src', 'package.json'), join(dist, 'package.json'));
// Computer Control belongs to the engine, including npm/CLI installs; native sources never depend on Electron.
await cp(join(root, 'src', 'computer', 'native'), join(dist, 'computer', 'native'), { recursive: true });
// Native macOS builds compile locally; the Linux npm publisher receives the same tagged artifact from its macOS job.
await buildComputerHelper();
const nativePayload = join(root, '.ptbk', 'computer-native', 'macos-arm64');
if ((await stat(nativePayload).catch(() => undefined))?.isDirectory()) {
    if (!await verifyComputerHelper(nativePayload)) throw new Error('The bundled Computer Control native helper does not match this source revision.');
    await cp(nativePayload, join(dist, 'computer', 'native', 'macos-arm64'), { recursive: true });
} else if (process.env.PTBK_REQUIRE_NATIVE_HELPER === '1') {
    throw new Error('The published engine requires its matching prebuilt Computer Control native helper.');
}
// The authenticated first-run terminal uses the same xterm build as the desktop client.
for (const file of ['lib/xterm.js', 'css/xterm.css', 'LICENSE']) {
    const name = file === 'LICENSE' ? 'xterm-LICENSE' : file.split('/').at(-1);
    await copyFile(join(root, 'node_modules', '@xterm', 'xterm', file), join(dist, 'app', 'web', name));
}
await mkdir(join(dist, 'service', 'spa'), { recursive: true });
for (const file of await readdir(join(root, 'src', 'service', 'spa'))) {
    await copyFile(join(root, 'src', 'service', 'spa', file), join(dist, 'service', 'spa', file));
}
await cp(join(root, 'design', 'brand', 'fonts'), join(dist, 'service', 'spa', 'fonts'), { recursive: true });
// The vendored App platform contract (bundled JavaScript, gateway pages, provenance and license notices).
await cp(join(root, 'src', 'vendor'), join(dist, 'vendor'), { recursive: true, filter: (source) => !source.endsWith('.d.ts') && !source.endsWith('.DS_Store') });
await cp(join(root, 'specs'), join(dist, 'expert'), { recursive: true, filter: (source) => !source.endsWith('.DS_Store') });
process.stdout.write('Built dist/ (ESM runtime, dashboard assets, Expert documentation).\n');

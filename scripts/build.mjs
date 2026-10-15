import { execFile } from 'node:child_process';
import { cp, copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

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
await mkdir(join(dist, 'service', 'spa'), { recursive: true });
for (const file of await readdir(join(root, 'src', 'service', 'spa'))) {
    await copyFile(join(root, 'src', 'service', 'spa', file), join(dist, 'service', 'spa', file));
}
await cp(join(root, 'specs'), join(dist, 'expert'), { recursive: true, filter: (source) => !source.endsWith('.DS_Store') });
process.stdout.write('Built dist/ (ESM runtime, dashboard assets, Expert documentation).\n');

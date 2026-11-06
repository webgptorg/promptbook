import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Builds the conformance build of ptbk next to the release build: a copy of `dist/` in `dist-conformance/` whose
 * build gate (`CONFORMANCE_BUILD`) is on. Only this build has the `conformance-session` command, the development CA
 * for the engine's own certificate and the conformance trust file of the UI loader; the release build (`dist/`, the
 * published package) never does. Run `npm run build` first.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const target = join(root, 'dist-conformance');

const gate = join(dist, 'app', 'build.js');
const source = await readFile(gate, 'utf8').catch(() => {
    process.stderr.write('Build dist/ first (npm run build).\n');
    process.exit(1);
});
if (!/CONFORMANCE_BUILD = false;/.test(source)) {
    process.stderr.write('dist/app/build.js does not hold the release gate (CONFORMANCE_BUILD = false).\n');
    process.exit(1);
}
await rm(target, { recursive: true, force: true });
await cp(dist, target, { recursive: true });
await writeFile(join(target, 'app', 'build.js'), source.replace('CONFORMANCE_BUILD = false;', 'CONFORMANCE_BUILD = true;'));
await writeFile(
    join(target, 'ptbk.js'),
    `#!/usr/bin/env node\n/** The conformance build's CLI entry. */\nimport('./cli.js').then(({ main }) => main()).catch((error) => {\n    process.stderr.write(\`ptbk: \${error.message}\\n\`);\n    process.exitCode = 1;\n});\n`,
);
process.stdout.write('Built dist-conformance/ (the conformance build; never publish it).\n');

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { windowsIcon } from './icon.mjs';

/** Builds renderer assets and keeps the separate optional desktop package on the engine's release version. */
const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('./package.json', import.meta.url)));
const engine = JSON.parse(await readFile(`${root}/package.json`));
// The source manifest is a template; packaging derives its version from the root engine manifest.
if (manifest.name !== 'ptbk-desktop') throw new Error('Invalid desktop package template.');
await mkdir(new URL('./renderer/vendor/', import.meta.url), { recursive: true });
await build({ entryPoints: [fileURLToPath(new URL('./renderer/app.js', import.meta.url))], bundle: true, platform: 'browser', target: 'chrome140', outfile: fileURLToPath(new URL('./renderer/vendor/app.js', import.meta.url)) });
await writeFile(new URL('./renderer/vendor/xterm.css', import.meta.url), await readFile(new URL('./node_modules/@xterm/xterm/css/xterm.css', import.meta.url)));
await writeFile(new URL('./icon.ico', import.meta.url), windowsIcon(await readFile(`${root}/design/logo-blue-transparent-256.png`)));
process.stdout.write(`Built optional desktop client ${engine.version}.\n`);

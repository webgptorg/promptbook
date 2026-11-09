import { build } from 'esbuild';
import { cp, copyFile, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
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
// The workspace editor for project dashboards (served from the private `ptbk-editor:` scheme): Monaco's editor worker is
// built first and embedded, so the page starts it from a blob instead of loading it from another origin.
const worker = await build({ entryPoints: [fileURLToPath(new URL('./node_modules/monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url))], bundle: true, platform: 'browser', target: 'chrome140', format: 'iife', minify: true, write: false });
await build({
    entryPoints: [fileURLToPath(new URL('./editor/index.js', import.meta.url))], bundle: true, platform: 'browser', target: 'chrome140', format: 'iife', minify: true,
    outdir: fileURLToPath(new URL('./renderer/vendor/editor/', import.meta.url)), entryNames: 'editor', assetNames: '[name]', loader: { '.ttf': 'file' }, legalComments: 'linked',
    define: { __PTBK_EDITOR_WORKER__: JSON.stringify(worker.outputFiles[0].text) },
});
for (const notice of ['LICENSE', 'ThirdPartyNotices.txt']) await copyFile(new URL(`./node_modules/monaco-editor/${notice}`, import.meta.url), new URL(`./renderer/vendor/editor/monaco-editor-${notice.replace(/\.txt$/, '')}.txt`, import.meta.url));
await writeFile(new URL('./renderer/vendor/xterm.css', import.meta.url), await readFile(new URL('./node_modules/@xterm/xterm/css/xterm.css', import.meta.url)));
for (const wordmark of ['readme-wordmark.svg', 'readme-wordmark-dark.svg']) {
    await copyFile(join(root, 'design', wordmark), new URL(`./renderer/vendor/${wordmark}`, import.meta.url));
}
await copyFile(join(root, 'design/brand/promptbook-robot.svg'), new URL('./renderer/vendor/promptbook-robot.svg', import.meta.url));
await cp(join(root, 'design', 'brand', 'fonts'), new URL('./renderer/vendor/fonts/', import.meta.url), { recursive: true });
await writeFile(new URL('./icon.ico', import.meta.url), windowsIcon(await readFile(`${root}/design/logo-blue-transparent-256.png`)));
process.stdout.write(`Built optional desktop client ${engine.version}.\n`);

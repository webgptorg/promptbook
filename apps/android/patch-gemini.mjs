import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Gemini's bundled clipboardy initializes on import even for headless commands. */
const termuxClipboardGuard = 'throw new Error("You need to install Termux for this module to work on Android: https://termux.com");';

/** Surface an unsupported clipboard operation when requested, without blocking headless startup. */
const headlessClipboard = `const unavailable = () => { throw new Error("The bundled Gemini CLI has no terminal clipboard in Promptbook for Android."); };
        return { copy: unavailable, copySync: unavailable, paste: unavailable, pasteSync: unavailable };`;

const bundle = process.argv[2];
let patched = 0;
for (const name of await readdir(bundle)) {
    if (!name.endsWith('.js')) continue;
    const path = join(bundle, name);
    const code = await readFile(path, 'utf8');
    if (!code.includes(termuxClipboardGuard)) continue;
    const parts = code.split(termuxClipboardGuard);
    patched += parts.length - 1;
    await writeFile(path, parts.join(headlessClipboard));
}
// The integrity-pinned Gemini CLI 0.67.0 bundle has three platform variants of the same guard.
if (patched !== 3) throw new Error(`Expected three Gemini clipboard guards, patched ${patched}.`);

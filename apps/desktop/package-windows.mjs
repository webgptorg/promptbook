import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Derives the packaged desktop version from the same root manifest as npm and the installer. */
const engine = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const child = spawn(process.execPath, [fileURLToPath(new URL('./node_modules/electron-builder/cli.js', import.meta.url)), '--win', 'dir', '--x64', `--config.extraMetadata.version=${engine.version}`], { cwd: fileURLToPath(new URL('./', import.meta.url)), stdio: 'inherit', shell: false });
process.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code) => resolve(code ?? 1)); });

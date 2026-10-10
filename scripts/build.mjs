import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** Compile the isolated ESM runtime while preserving the repository's CommonJS configs. */
const execute = promisify(execFile);
await rm(new URL('../dist', import.meta.url), { recursive: true, force: true });
await execute(process.execPath, [fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url)), '-p', 'tsconfig.json'], { cwd: fileURLToPath(new URL('..', import.meta.url)) }).catch(error => {
    process.stderr.write(error.stdout || error.message);
    process.exitCode = 1;
});
if (!process.exitCode) await copyFile(new URL('../src/package.json', import.meta.url), new URL('../dist/package.json', import.meta.url));

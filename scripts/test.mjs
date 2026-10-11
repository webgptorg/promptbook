import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Discover fixtures explicitly so npm's test script does not depend on shell glob expansion. */
const tests = (await readdir(new URL('../test/', import.meta.url))).filter(name => name.endsWith('.test.mjs')).sort();
if (!tests.length) throw new Error('No ptbk test fixtures were found.');
/** Launch Node's test runner in this checkout on Windows, macOS and Linux. */
const child = spawn(process.execPath, ['--test', ...tests.map(name => `test/${name}`)], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    stdio: 'inherit',
    shell: false,
});
process.exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
});

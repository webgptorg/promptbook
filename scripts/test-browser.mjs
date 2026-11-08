import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findBrowserExecutable } from '../dist/browser/browser.js';

if (!(await findBrowserExecutable({ variant: 'CHROME' }))) throw new Error('Native browser checks require an installed Chrome-compatible browser.');
/** Exercise the reported native failures on CI as well as local machines, without silently skipping for CI. */
const child = spawn(process.execPath, ['--test', '--test-concurrency=2', '--test-name-pattern=full browser access:|shared browser pools:|Wallet one-time code in the real browser:|Wallet approval in the real browser:', 'test/browser.test.mjs', 'test/wallet.test.mjs'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, PTBK_TEST_BROWSER: '1' },
    stdio: 'inherit',
    shell: false,
});
process.exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
});

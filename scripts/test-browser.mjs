import { findBrowserExecutable } from '../dist/browser/browser.js';
import { runNodeTests } from './run-node-tests.mjs';

if (!(await findBrowserExecutable({ variant: 'CHROME' }))) throw new Error('Native browser checks require an installed Chrome-compatible browser.');
/** Exercise the reported native failures on CI as well as local machines, without silently skipping for CI. */
process.exitCode = await runNodeTests(['test/browser.test.mjs', 'test/wallet.test.mjs'], {
    args: ['--test-concurrency=2', '--test-name-pattern=full browser access:|shared browser pools:|Wallet one-time code in the real browser:|Wallet approval in the real browser:'],
    env: { ...process.env, PTBK_TEST_BROWSER: '1' },
});

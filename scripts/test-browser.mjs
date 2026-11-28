import { findBrowserExecutable } from '../dist/browser/browser.js';
import { runNodeTests } from './run-node-tests.mjs';

if (!(await findBrowserExecutable({ variant: 'CHROME' }))) throw new Error('Native browser checks require an installed Chrome-compatible browser.');
/** Native workflows that need to run with an actual browser on the CI runner. */
const browserScenarios = [
    'full browser access:',
    'shared browser pools:',
    'Wallet one-time code in the real browser:',
    'Wallet approval in the real browser:',
    'a gated page leaves the browser free',
    'Wallet acceptance: a task waits for a protected login',
    'Wallet Test acceptance: the running engine reads the code',
];
/** Exercise the reported native failures on CI as well as local machines, without silently skipping for CI. */
process.exitCode = await runNodeTests(['test/browser.test.mjs', 'test/wallet.test.mjs'], {
    args: ['--test-concurrency=2', `--test-name-pattern=${browserScenarios.join('|')}`],
    env: { ...process.env, PTBK_TEST_BROWSER: '1' },
});

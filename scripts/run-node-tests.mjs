import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root: every test file path is relative to it. */
const ROOT = fileURLToPath(new URL('../', import.meta.url));

/** The reporter that lists failed test files for the retry (a file URL: Windows paths are not valid module specifiers). */
const FAILED_FILES_REPORTER = new URL('./failed-test-files-reporter.mjs', import.meta.url).href;

/**
 * Runs `node --test` once and returns its exit code and the files that had a failure.
 */
async function runOnce(files, { args, env }) {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk-test-run-'));
    const failedList = join(directory, 'failed-files.txt');
    try {
        const child = spawn(process.execPath, ['--test', '--test-reporter=spec', '--test-reporter-destination=stdout', `--test-reporter=${FAILED_FILES_REPORTER}`, `--test-reporter-destination=${failedList}`, ...args, ...files], {
            cwd: ROOT,
            env,
            stdio: 'inherit',
            shell: false,
        });
        const code = await new Promise((resolve, reject) => {
            child.once('error', reject);
            child.once('exit', (exitCode) => resolve(exitCode ?? 1));
        });
        const failed = (await readFile(failedList, 'utf8').catch(() => '')).split('\n').filter(Boolean).map((file) => (file === '<unknown>' ? file : relative(ROOT, file).replaceAll('\\', '/')));
        return { code, failed: [...new Set(failed)] };
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
}

/**
 * Runs Node.js test files and retries the files that failed once, alone.
 *
 * The integration tests drive real processes, Git, PTYs and browsers on shared hosted runners, where a busy machine
 * occasionally misses a timing budget. A file that fails again on its retry still fails the run; a file that only
 * passes on its retry is reported as flaky (a GitHub warning annotation on CI) so it stays visible and gets fixed.
 * A failure that cannot be attributed to a file, or a run that fails without any reported test failure (for example
 * a crashed runner), is never retried.
 *
 * @returns the process exit code
 */
export async function runNodeTests(files, { args = [], env = process.env } = {}) {
    const first = await runOnce(files, { args, env });
    if (first.code === 0) return 0;
    const retryable = first.failed.length > 0 && first.failed.every((file) => file !== '<unknown>' && files.includes(file));
    if (!retryable) return first.code || 1;
    process.stdout.write(`\nRetrying ${first.failed.length} failed test file(s) once, alone: ${first.failed.join(', ')}\n\n`);
    const retry = await runOnce(first.failed, { args: [...args.filter((arg) => !arg.startsWith('--test-concurrency')), '--test-concurrency=1'], env });
    if (retry.code !== 0) return retry.code;
    for (const file of first.failed) {
        const message = `${file} failed, then passed when retried alone: a flaky test that should be made deterministic.`;
        process.stdout.write(process.env.GITHUB_ACTIONS === 'true' ? `::warning file=${file},title=Flaky test file::${message}\n` : `Warning: ${message}\n`);
    }
    return 0;
}

// Command line: `node scripts/run-node-tests.mjs [--node-test-option...] <file relative to the repository root>...`
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
    const argv = process.argv.slice(2);
    const files = argv.filter((arg) => !arg.startsWith('--'));
    if (!files.length) throw new Error('Pass the test files to run, relative to the repository root.');
    process.exitCode = await runNodeTests(files, { args: argv.filter((arg) => arg.startsWith('--')) });
}

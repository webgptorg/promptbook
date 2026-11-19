import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNodeTests } from './run-node-tests.mjs';

/** Discover fixtures explicitly so npm's test script does not depend on shell glob expansion. */
const tests = (await readdir(new URL('../test/', import.meta.url))).filter(name => name.endsWith('.test.mjs')).sort().map(name => `test/${name}`);
if (!tests.length) throw new Error('No ptbk test fixtures were found.');

/** Weight of a test file without a measured duration (most unlisted files finish within a second or two). */
const DEFAULT_DURATION_SECONDS = 2;

/**
 * Splits the test files into `count` shards of similar duration and returns the files of shard `index` (1-based).
 *
 * Longest files go first, each to the currently lightest shard (ties by shard order), so the split is deterministic
 * and every file belongs to exactly one shard. `durations` (seconds per file, measured on a Windows runner) only
 * steers the balance: a stale or missing entry makes the shards less even, never incomplete. `headStart` is the
 * other work the first shard's job also does (in the same seconds), so it gets correspondingly fewer test files.
 */
export function selectTestShard(files, { index, count, durations, headStart = 0 }) {
    const weight = (file) => durations[file] ?? DEFAULT_DURATION_SECONDS;
    const ordered = [...files].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b));
    const shards = Array.from({ length: count }, (_, shard) => ({ files: [], total: shard === 0 ? headStart : 0 }));
    for (const file of ordered) {
        const lightest = shards.reduce((best, shard) => (shard.total < best.total ? shard : best));
        lightest.files.push(file);
        lightest.total += weight(file);
    }
    return shards[index - 1].files.sort();
}

/**
 * Parses `PTBK_TEST_SHARD` (`<index>/<count>`, for example `2/3`); unset runs every test file. Every shard of one
 * split must see the same `PTBK_TEST_SHARD_HEAD_START` (seconds of other work in the first shard's job).
 */
function parseShard(value) {
    if (!value) return undefined;
    const match = /^(\d+)\/(\d+)$/.exec(value);
    const [index, count] = match ? [Number(match[1]), Number(match[2])] : [];
    if (!match || count < 1 || index < 1 || index > count) throw new Error(`PTBK_TEST_SHARD must be <index>/<count>, for example 2/3 (got "${value}").`);
    const headStart = Number(process.env.PTBK_TEST_SHARD_HEAD_START || 0);
    if (!Number.isFinite(headStart) || headStart < 0) throw new Error(`PTBK_TEST_SHARD_HEAD_START must be a number of seconds (got "${process.env.PTBK_TEST_SHARD_HEAD_START}").`);
    return { index, count, headStart };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
    const shard = parseShard(process.env.PTBK_TEST_SHARD);
    const durations = JSON.parse(await readFile(new URL('./test-durations.json', import.meta.url), 'utf8'));
    const selected = shard ? selectTestShard(tests, { ...shard, durations }) : tests;
    if (shard) process.stdout.write(`Test shard ${shard.index}/${shard.count}: ${selected.length} of ${tests.length} test files\n`);
    /** Limit fixture processes so hosted runners have room for their Git/provider child processes. */
    process.exitCode = await runNodeTests(selected, { args: ['--test-concurrency=2'] });
}

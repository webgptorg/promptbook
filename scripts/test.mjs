import { readdir } from 'node:fs/promises';
import { runNodeTests } from './run-node-tests.mjs';

/** Discover fixtures explicitly so npm's test script does not depend on shell glob expansion. */
const tests = (await readdir(new URL('../test/', import.meta.url))).filter(name => name.endsWith('.test.mjs')).sort();
if (!tests.length) throw new Error('No ptbk test fixtures were found.');
/** Limit fixture processes so hosted runners have room for their Git/provider child processes. */
process.exitCode = await runNodeTests(tests.map(name => `test/${name}`), { args: ['--test-concurrency=2'] });

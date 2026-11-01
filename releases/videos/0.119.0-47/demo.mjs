import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';

/** Immutable release revision, checked against npm metadata and the local tag. */
const revision = 'fd1860136b55cd95c45066660bdcc7c9c417e9fb';
/** Dependency-free release module compiled directly from its immutable Git source. */
const source = execFileSync('git', ['show', `${revision}:src/engine/action-impact.ts`], { encoding: 'utf8' });
/** Compiled bytes used by both the demonstration and the release's own tests. */
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
/** Released implementation, independent of the working build. */
const { aggregateImpact, actionPriority, actionTotals, buildActionView } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
/** Fixed demonstration clock; no real action records or project data are read. */
const now = Date.parse('2026-11-01T12:00:00Z');
/** Disposable synthetic action summaries; these do not send emails or create remote actions. */
const records = Array.from({ length: 1000 }, (_, index) => ({ path: `actions/demo/${index}.md`, task: 'demo', taskName: 'Illustrative campaign', agent: '@Demo', operation: 'Send example email', service: 'Example', group: 'fixture-campaign', at: new Date(now).toISOString(), impact: 1, outcome: index < 10 ? 'failed' : 'success' }));
/** Actual default view produced by the released implementation. */
const view = buildActionView(records, {}, now);
assert.equal(aggregateImpact(Array(1000).fill(1)), 4);
assert.equal(view.rows.length, 1);
assert.deepEqual(view.rows[0].totals.outcomes, { failed: 10, success: 990 });
assert.equal(buildActionView(records, { batch: 'fixture-campaign', limit: 5000 }, now).rows.length, 1000);
assert.equal(actionPriority(4, now - 30 * 86400000, now), 3);
assert.equal(actionTotals([{ ...records[0], impact: undefined }], now).display, 'unknown');
console.log('ACTUAL RELEASE OUTPUT / SYNTHETIC FIXTURE');
console.log(`1,000 actions at impact 1 => ${view.rows[0].totals.impact}`);
console.log(`Default view => ${view.rows.length} batch row`);
console.log(`Outcomes => ${JSON.stringify(view.rows[0].totals.outcomes)}`);
console.log(`Batch drill-down => ${buildActionView(records, { batch: 'fixture-campaign', limit: 5000 }, now).rows.length} records`);
console.log(`Impact 4 after 30 days => priority ${actionPriority(4, now - 30 * 86400000, now)}`);
console.log(`Missing impact => ${actionTotals([{ ...records[0], impact: undefined }], now).display}`);

// The fixture runs the exact release test source, changing only its module location.
if (process.argv.includes('--release-tests')) {
    /** Locally ignored disposable fixture directory. */
    const fixture = new URL('./frames/fixture/', import.meta.url);
    mkdirSync(fixture, { recursive: true });
    writeFileSync(new URL('action-impact.mjs', fixture), compiled);
    /** Original release tests with only the import redirected to the compiled release module. */
    const tests = execFileSync('git', ['show', `${revision}:test/action-impact.test.mjs`], { encoding: 'utf8' }).replace('../dist/engine/action-impact.js', './action-impact.mjs');
    writeFileSync(new URL('release.test.mjs', fixture), tests);
    console.log(execFileSync(process.execPath, ['--test', new URL('release.test.mjs', fixture).pathname], { encoding: 'utf8' }));
}

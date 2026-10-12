import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

/** Run each diagnostic sink in an independent process without intercepting the test runner streams. */
const execute = promisify(execFile);
/** Import the actual compiled diagnostic/workspace modules from the installed package. */
const diagnosticUrl = new URL('../dist/coder/diagnostics.js', import.meta.url).href;
/** Workspace resolution is read-only even when evidence storage will later fail. */
const workspaceUrl = new URL('../dist/coder/workspace.js', import.meta.url).href;

/** Prepare a valid directory, with optional deliberately unusable runtime storage. */
async function fixture(t, blocked = false) {
    const project = await mkdtemp(join(tmpdir(), 'ptbk diagnostics '));
    t.after(() => rm(project, { recursive: true, force: true }));
    if (blocked) await writeFile(join(project, '.ptbk'), 'blocked storage\n');
    return project;
}

/** Record a redacted observed failure and return only the actual evidence reference. */
async function record(project, readOnly) {
    const source = `import {reportDiagnostic} from ${JSON.stringify(diagnosticUrl)};
import {resolveWorkspace} from ${JSON.stringify(workspaceUrl)};
const workspace = await resolveWorkspace({path:process.argv[1]});
const result = await reportDiagnostic(new Error('native login failed '+process.env.PTBK_DIAGNOSTIC_TOKEN), {command:'start',phase:'harness setup',projectPath:workspace.projectPath,workspace,readOnly:${readOnly},metadata:{harnessVersion:'fixture-1.0'}});
process.stdout.write(JSON.stringify(result));`;
    return execute(process.execPath, ['--input-type=module', '-e', source, project], { env: { ...process.env, PTBK_DIAGNOSTIC_TOKEN: 'fixture-private-diagnostic-token' } });
}

test('failure evidence includes actual engine/phase/version and links to a real redacted file', async t => {
    const project = await fixture(t);
    const result = await record(project, false);
    const { trace, nextAction } = JSON.parse(result.stdout);
    assert(trace); assert.match(nextAction, /native login/);
    const content = await readFile(trace, 'utf8');
    assert.match(content, /Promptbook \d+\.\d+\.\d+/);
    assert.match(content, /Phase: harness setup/); assert.match(content, /fixture-1.0/);
    assert.match(content, /\[REDACTED\]/); assert.doesNotMatch(content + result.stderr, /fixture-private-diagnostic-token/);
    assert(result.stderr.includes(trace));
});

test('inspection failures provide stderr diagnostics without creating trace storage', async t => {
    const project = await fixture(t);
    const result = await record(project, true);
    assert.equal(JSON.parse(result.stdout).trace, undefined);
    assert.match(result.stderr, /Diagnostic storage was not written/);
    assert.match(result.stderr, /native login failed \[REDACTED\]/);
    assert.deepEqual(await readdir(project), []);
});

test('trace storage failure leaves the original cause visible and promises no saved path', async t => {
    const project = await fixture(t, true);
    const result = await record(project, false);
    assert.equal(JSON.parse(result.stdout).trace, undefined);
    assert.match(result.stderr, /Diagnostic storage unavailable/);
    assert.match(result.stderr, /native login failed \[REDACTED\]/);
    assert.doesNotMatch(result.stderr, /^Diagnostic: /m);
    assert.equal(await readFile(join(project, '.ptbk'), 'utf8'), 'blocked storage\n');
});

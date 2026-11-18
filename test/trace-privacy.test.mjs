import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { TraceSanitizer, sanitizeTraceValue } from '../dist/common/redact.js';
import { TaskTrace, readableHarnessLine } from '../dist/engine/task-trace.js';
import { recordDiagnostic } from '../dist/engine/traces.js';
import { BrowserRecorder } from '../dist/browser/recording.js';
import { runtimePaths } from '../dist/project/workspace.js';
import { ensureTraceIgnoreRules } from '../dist/project/setup.js';
import { git, initRepository, temporaryDirectory } from './helpers.mjs';

test('persistent technical traces omit browser/desktop payloads, clipboard and images before rendering', () => {
    const original = {
        type: 'item.completed',
        item: {
            type: 'mcp_tool_call', server: 'ptbk', tool: 'computer_type',
            arguments: JSON.stringify({ text: 'an arbitrary unrecognized password', x: 12, y: 34 }),
            result: { text: 'an arbitrary unrecognized password', images: [{ mimeType: 'image/png', data: 'sensitive-pixels' }] },
        },
    };
    const line = readableHarnessLine(JSON.stringify(original));
    assert.doesNotMatch(line, /arbitrary unrecognized password|sensitive-pixels/);
    assert.match(line, /computer_type/);
    assert.match(line, /x.*12/);
    assert.match(line, /omitted from persistent trace/);
    assert.equal(original.item.result.text, 'an arbitrary unrecognized password', 'live traffic is not mutated');
    const safe = sanitizeTraceValue({ clipboard: 'short', password: 'also short', safe: 'technical state', image: { type: 'image', data: 'pixel-payload', mimeType: 'image/png' } });
    assert.equal(safe.clipboard, '[REDACTED]');
    assert.equal(safe.password, '[REDACTED]');
    assert.equal(safe.safe, 'technical state');
    assert.doesNotMatch(JSON.stringify(safe), /pixel-payload/);
    assert.doesNotMatch(JSON.stringify(sanitizeTraceValue({ type: 'resource', resource: { mimeType: 'image/png', blob: 'embedded-image-bytes' } })), /embedded-image-bytes/);
});

test('Claude split browser tool-use/result events keep their metadata but omit live observations', () => {
    const privacy = new TraceSanitizer();
    const request = privacy.text(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'call-1', name: 'mcp__ptbk__browser_type', input: { ref: 3, text: 'private input' } }] } }));
    const response = privacy.text(JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'call-1', content: [{ type: 'text', text: 'private page observation' }] }] } }));
    assert.doesNotMatch(request + response, /private input|private page observation/);
    assert.match(request, /"ref":3/);
    assert.match(response, /call-1/);
    assert.match(privacy.text(JSON.stringify({ type: 'tool_result', tool_use_id: 'unrelated-shell', content: 'compile passed' })), /compile passed/, 'normal shell output remains evidence');
});

test('every task/diagnostic persistence entry point applies trace privacy', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk trace privacy');
    const project = { root, runtime: runtimePaths(root) };
    const trace = await TaskTrace.open(project, { name: 'Privacy', source: 'tasks/privacy.book' });
    await trace.event('computer', { name: 'computer_clipboard', arguments: { action: 'read' }, result: { text: 'clipboard-content-1' } });
    trace.output('stdout', JSON.stringify({ type: 'mcp_tool_call', name: 'browser_type', arguments: { text: 'browser-secret-2' }, result: 'page-secret-3' }));
    trace.output('stderr', JSON.stringify({ type: 'mcp_tool_call', name: 'computer_type', arguments: { text: 'desktop-secret-4' } }));
    await trace.text(JSON.stringify({ clipboardText: 'clipboard-content-5', image: 'data:image/png;base64,cGl4ZWxz' }));
    await trace.flush();
    const saved = await readFile(join(trace.directory, 'events.jsonl'), 'utf8') + await readFile(join(trace.directory, 'harness.log'), 'utf8');
    assert.doesNotMatch(saved, /clipboard-content-[15]|browser-secret-2|page-secret-3|desktop-secret-4|cGl4ZWxz/);
    assert.match(saved, /computer_clipboard/);
    await recordDiagnostic(project, { phase: 'computer', message: 'technical failure', details: { name: 'computer_type', arguments: { text: 'diagnostic-secret-6' } } });
    assert.doesNotMatch(await readFile(join(project.runtime.logs, 'diagnostics.jsonl'), 'utf8'), /diagnostic-secret-6/);
});

test('opt-in browser video stays ignored locally, secret intervals drop queued frames, and metadata keeps origins only', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk local recording');
    await initRepository(root);
    await ensureTraceIgnoreRules(root, { commit: true, ignoreVideos: false });
    const project = { root, runtime: runtimePaths(root) };
    const trace = await TaskTrace.open(project, { name: 'Record', source: 'tasks/record.book' });
    const recorder = new BrowserRecorder(project, () => true, { PATH: '' });
    let emit;
    const commands = [];
    const port = { send: async (method) => { commands.push(method); return {}; }, onFrame: (listener) => { emit = listener; return () => {}; } };
    await recorder.attach(trace, 'attempt-1');
    await recorder.begin(port, 'https://user:password@fixture.example/private-person?code=secret#token');
    const pixels = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0, 1, 0, 1, 3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0, 0xff, 0xd9]);
    emit({ data: pixels.toString('base64'), sessionId: 1 });
    await recorder.writeQueue;
    emit({ data: Buffer.from('queued confidential frame').toString('base64'), sessionId: 2 });
    await recorder.pause('secret entry');
    emit({ data: Buffer.from('confidential frame during pause').toString('base64'), sessionId: 3 });
    await recorder.resume();
    await recorder.finish();
    await trace.flush();
    const metadata = await readFile(join(trace.directory, 'video.json'), 'utf8');
    const status = JSON.parse(metadata);
    assert.equal(status.state, 'recorded');
    assert.equal(status.segments[0].frames, 1, 'pause invalidated the queued pre-pause frame before it was stored');
    assert.deepEqual(status.segments[0].pages, ['https://fixture.example']);
    assert.match(status.segments[0].file, /^local\/video\/attempt-1\.mov$/);
    assert.doesNotMatch(metadata, /private-person|secret#token|password|queued confidential/);
    const video = join(trace.directory, status.segments[0].file);
    assert.doesNotMatch((await readFile(video)).toString('latin1'), /confidential frame/);
    assert.ok(await git(root, ['check-ignore', video]), 'video is ignored even when the old video Git setting is false');
    assert.equal((await readdir(trace.directory)).includes('video'), false, 'no new video is written to a versionable location');
    assert.ok(commands.includes('Page.stopScreencast'));
});

test('disabled browser recording never requests or stores a screencast', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk disabled recording');
    const project = { root, runtime: runtimePaths(root) };
    const trace = await TaskTrace.open(project, { name: 'No record', source: 'tasks/no-record.book' });
    const recorder = new BrowserRecorder(project, () => false, {});
    await recorder.attach(trace, 'attempt-1');
    await recorder.begin({ send: async () => { assert.fail('no capture command'); }, onFrame: () => { assert.fail('no frame listener'); } });
    assert.equal(JSON.parse(await readFile(join(trace.directory, 'video.json'), 'utf8')).state, 'disabled');
    await assert.rejects(readdir(join(trace.directory, 'local')));
});

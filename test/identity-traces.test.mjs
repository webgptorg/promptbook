import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { TextEditor } from '../dist/ui/composer.js';
import { readableHarnessLine } from '../dist/engine/task-trace.js';
import { RequestStore } from '../dist/engine/requests.js';
import { ensureTraceIgnoreRules, traceIgnoreRulesMatch } from '../dist/project/setup.js';
import { generateTaskId, taskIdProblem } from '../dist/tasks/identity.js';
import { git, initializedProject, messages, ptbk, subjects, temporaryDirectory } from './helpers.mjs';

/**
 * Fixture check accepting every output.
 */
const CHECK = 'process.exit(0);\n';

/**
 * Files changed by a commit.
 */
async function changedFiles(project, revision = 'HEAD') {
    return (await git(project, ['show', '--name-only', '--format=', revision])).trim().split('\n').filter(Boolean);
}

test('task IDs: generated IDs are path-safe and unique; unsafe explicit IDs are rejected', () => {
    const first = generateTaskId('Improve CSV export');
    const second = generateTaskId('Improve CSV export');
    assert.match(first, /^improve-csv-export-[a-z0-9]{6}$/);
    assert.notEqual(first, second, 'identical titles never share an ID');
    assert.equal(taskIdProblem(first), undefined);
    for (const bad of ['../x', 'a/b', 'con', 'trailing.', 'has space', '-leading']) assert.ok(taskIdProblem(bad), bad);
});

test('composer: long pastes become compact tokens with the full payload; expand, remove and attachments keep order', () => {
    const editor = new TextEditor('Intro ');
    const block = Array.from({ length: 120 }, (_, index) => `line ${index + 1}`).join('\n');
    editor.handle({ type: 'paste', text: block });
    editor.attach({ kind: 'image', path: '/tmp/a.png', name: 'a.png', bytes: 10 });
    editor.handle({ type: 'text', text: ' outro' });
    const layout = editor.layout(80, 10);
    assert.ok(layout.lines.join('\n').includes('[Pasted text #1, 120 lines]'), layout.lines.join('\n'));
    assert.ok(layout.lines.join('\n').includes('[Image #2]'));
    const segments = editor.segments();
    assert.equal(segments.map((segment) => (segment.type === 'text' ? segment.text : '')).join(''), `Intro ${block} outro`, 'the token refers to the complete payload, never a summary');
    assert.deepEqual(segments[1], { type: 'text', text: block, pasted: true });
    assert.deepEqual(segments[2], { type: 'attachment', kind: 'image', path: '/tmp/a.png', name: 'a.png' });
    const restored = new TextEditor(segments);
    assert.deepEqual(restored.segments(), segments, 'a restored draft keeps typed text, pasted blocks and attachments apart');
    assert.equal(editor.handle({ type: 'key', name: 'enter' }), 'submit', 'pasted newlines never submitted; Enter does');
    for (let index = 0; index < ' outro'.length; index++) editor.handle({ type: 'key', name: 'backspace' });
    editor.handle({ type: 'key', name: 'backspace' });
    assert.equal(editor.insertedItems.length, 1, 'Backspace removes a whole token');
    editor.handle({ type: 'key', name: 'left' });
    assert.equal(editor.expandAtCursor(), true);
    assert.equal(editor.insertedItems.length, 0);
    assert.equal(editor.value, `Intro ${block}`, 'expanded text becomes editable without loss');
});

test('readable harness trace: JSON events become indented text losslessly; other text stays verbatim', () => {
    const line = JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Done.\nPTBK_RESULT {}' } });
    const readable = readableHarnessLine(line);
    assert.match(readable, /^\[item\.completed \/ agent_message\]/);
    assert.match(readable, /text: \|\n\s+Done\.\n\s+PTBK_RESULT \{\}/);
    assert.equal(readableHarnessLine('plain output'), 'plain output');
});

test('trace ignore rules follow the policy and preserve unrelated .gitignore entries', async (t) => {
    const directory = await temporaryDirectory(t);
    await writeFile(join(directory, '.gitignore'), 'node_modules/\n*.log\n');
    assert.ok(await ensureTraceIgnoreRules(directory, { commit: false, ignoreVideos: true }));
    let content = await readFile(join(directory, '.gitignore'), 'utf8');
    assert.match(content, /^node_modules\/\n\*\.log\n/);
    assert.match(content, /^\/traces\/$/m);
    assert.equal(await ensureTraceIgnoreRules(directory, { commit: false, ignoreVideos: true }), undefined, 'repeating is a no-op');
    await ensureTraceIgnoreRules(directory, { commit: true, ignoreVideos: false });
    content = await readFile(join(directory, '.gitignore'), 'utf8');
    assert.doesNotMatch(content, /^\/traces\/$/m);
    assert.doesNotMatch(content, /video/, 'videos may be committed when chosen');
    assert.match(content, /^\/traces\/\*\/local\/$/m);
    assert.ok(await traceIgnoreRulesMatch(directory, { commit: true, ignoreVideos: false }));
    assert.match(content, /^\*\.log$/m);
});

test('requests: a repeated report of the same unresolved condition keeps one pending request', async (t) => {
    const directory = await temporaryDirectory(t);
    const store = new RequestStore(directory);
    const input = { kind: 'action', reason: 'Login required', question: 'Sign in to the site, then confirm.', choices: ['Done'], origin: { kind: 'browser', taskRef: '#t-1', taskId: 't-1' }, blocking: true, attempted: 'Reused the saved session.' };
    const first = await store.create(input);
    const second = await store.create(input);
    assert.equal(second.id, first.id);
    assert.equal(first.attempted, 'Reused the saved session.');
    assert.equal((await store.list({ status: 'pending' })).length, 1);
});

test('legacy tasks receive an ID before execution; identical titles keep separate IDs, commits and traces', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    for (const name of ['a.book', 'b.book']) await writeFile(join(project, 'tasks', name), 'TASK Same title\n\nDo it.\n\nTASK AGENT @Developer\n');
    await git(project, ['add', 'tasks']);
    await git(project, ['commit', '-qm', 'manual tasks']);
    const listed = JSON.parse((await ptbk(['list', '--json'], { cwd: project, env })).stdout);
    assert.ok(listed.tasks.filter((task) => task.title === 'Same title').every((task) => task.id === undefined), 'list never writes IDs');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
    const run = await ptbk(['run', '--raw', '--limit', '2'], { cwd: project, env });
    assert.equal(run.code, 0, run.output);
    const history = await subjects(project);
    assert.equal(history.filter((subject) => subject === 'PTBK: Same title').length, 2);
    assert.equal(history.filter((subject) => subject === 'PTBK: Assign task ID - Same title').length, 2, 'a scoped preparation commit per legacy task');
    const ids = (await messages(project)).filter((message) => message.startsWith('PTBK: Same title')).map((message) => /^Task-ID: (\S+)$/m.exec(message)[1]);
    assert.equal(new Set(ids).size, 2);
    for (const id of ids) await readFile(join(project, 'traces', id, 'harness.log'), 'utf8');
    for (const name of ['a.book', 'b.book']) assert.match(await readFile(join(project, 'tasks', name), 'utf8'), /^TASK ID same-title-[a-z0-9]{6}$/m);
});

test('follow-ups written by an agent get their own IDs (a copied ID is replaced) inside the result commit', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Plan more CREATE_FOLLOW_UP', '--agent', 'Developer', '--priority', '5', '--raw'], { cwd: project, env });
    const run = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(run.code, 0, run.output);
    const [message] = await messages(project);
    const taskId = /^Task-ID: (\S+)$/m.exec(message)[1];
    const created = [...message.matchAll(/^Created-Task-ID: (\S+)$/gm)].map((match) => match[1]);
    const one = await readFile(join(project, 'tasks', 'zz-follow-up-one.book'), 'utf8');
    const two = await readFile(join(project, 'tasks', 'zz-follow-up-two.book'), 'utf8');
    const oneId = /^TASK ID (\S+)$/m.exec(one)[1];
    const twoId = /^TASK ID (\S+)$/m.exec(two)[1];
    assert.notEqual(twoId, taskId, 'a copied definition is new work with a new ID');
    assert.ok(created.includes(oneId) && created.includes(twoId), message);
    assert.ok(!created.includes(taskId));
    const files = await changedFiles(project);
    assert.ok(files.includes('tasks/zz-follow-up-one.book') && files.includes('tasks/zz-follow-up-two.book'));
});

test('trace policy: committed traces share the result commit; videos and post-commit events stay out; the tree stays clean', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK, initArgs: ['--commit-traces'] });
    const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    assert.deepEqual(config.traces, { commit: true, ignoreVideos: true, recordVideo: true });
    const ignore = await readFile(join(project, '.gitignore'), 'utf8');
    assert.match(ignore, /^\/traces\/\*\/video\/$/m);
    assert.doesNotMatch(ignore, /^\/traces\/$/m);
    await ptbk(['add', 'Write the welcome page', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const run = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(run.code, 0, run.output);
    const taskId = /^Task-ID: (\S+)$/m.exec((await messages(project))[0])[1];
    const files = await changedFiles(project);
    assert.ok(files.includes(`traces/${taskId}/harness.log`), files.join('\n'));
    assert.ok(files.includes(`traces/${taskId}/events.jsonl`));
    assert.ok(!files.some((file) => file.includes('/local/')), 'post-commit events are never in the snapshot');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'events after the commit do not dirty the tree');
    await readFile(join(project, 'traces', taskId, 'local', 'events.jsonl'), 'utf8');
});

test('initial input: verbatim text and attachments with working relative links; the Expert task links it', async (t) => {
    const directory = await temporaryDirectory(t);
    const brief = 'Build a bird list.\n\n  Keep   this   spacing.\n\nPříliš žluťoučký kůň.\n';
    await writeFile(join(directory, 'brief.md'), brief);
    await writeFile(join(directory, 'photo.png'), 'not really a png');
    await writeFile(join(directory, 'notes.txt'), 'notes');
    const { project } = await initializedProject(t, { check: CHECK, initArgs: ['--intent-file', join(directory, 'brief.md'), '--attach', join(directory, 'photo.png'), '--attach', join(directory, 'notes.txt')] });
    const specification = await readFile(join(project, 'specs', '_initial.md'), 'utf8');
    assert.ok(specification.startsWith(brief), 'original text is kept exactly');
    assert.match(specification, /!\[Image 1\]\(_initial\/image-1\.png\)/);
    assert.match(specification, /\[notes\.txt\]\(_initial\/notes\.txt\)/);
    assert.ok(specification.indexOf('image-1.png') < specification.indexOf('notes.txt'), 'attachment order is kept');
    assert.equal(await readFile(join(project, 'specs', '_initial', 'notes.txt'), 'utf8'), 'notes');
    const task = (await readdir(join(project, 'tasks'))).find((name) => name.endsWith('.book'));
    const content = await readFile(join(project, 'tasks', task), 'utf8');
    assert.match(content, /^TASK Transform the project according to the initial specification$/m);
    assert.match(content, /\(\.\.\/specs\/_initial\.md\)/);
    assert.ok((await changedFiles(project)).includes('specs/_initial/image-1.png'), 'specification and assets are versioned with the task');
});

test('a task waiting for the user is checkpointed so independent work continues; the answer resumes it', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Choose a color ASK_USER', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    await ptbk(['add', 'Independent work', '--agent', 'Developer', '--priority', '1', '--raw'], { cwd: project, env });
    const first = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(first.code, 3, first.output);
    assert.match(first.stdout, /1 completed, 0 failed; 1 request\(s\) waiting for you/);
    assert.equal((await subjects(project))[0], 'PTBK: Independent work', 'independent work progressed while the question waits');
    const inspect = await ptbk(['recover', '--raw'], { cwd: project, env });
    assert.match(inspect.stdout, /checkpointed/);
    const [request] = JSON.parse((await ptbk(['answer', '--json'], { cwd: project, env })).stdout);
    assert.equal(request.attempted, 'Checked the task and project instructions.');
    assert.equal((await ptbk(['answer', request.id, 'blue', '--raw'], { cwd: project, env })).code, 0);
    const second = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(second.code, 0, second.output);
    assert.equal((await subjects(project))[0], 'PTBK: Choose a color ASK_USER');
    const outputs = await readdir(join(project, 'output'));
    assert.match(await readFile(join(project, 'output', outputs.find((name) => name.includes('choose-a-color'))), 'utf8'), /\(blue\)/);
});

import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { TextEditor } from '../dist/ui/composer.js';
import { readableHarnessLine } from '../dist/engine/task-trace.js';
import { ensureTraceIgnoreRules, traceIgnoreRulesMatch } from '../dist/project/setup.js';
import { distinctName, nameKeyPath, traceDirectoryOf } from '../dist/tasks/identity.js';
import { ChatStore } from '../dist/chats/store.js';
import { taskChats } from '../dist/chats/task-chats.js';
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

test('task names: trace paths derive deterministically and safely from the normalized name; new names are distinct', () => {
    assert.equal(traceDirectoryOf('Improve CSV export'), traceDirectoryOf('  improve   csv-export '), 'equivalent names share one identity');
    assert.notEqual(traceDirectoryOf('Improve CSV export'), traceDirectoryOf('Improve PDF export'));
    for (const unsafe of ['../../etc/passwd', 'a/b\\c', 'CON', '...', 'name.']) {
        const path = nameKeyPath(unsafe);
        assert.ok(path && !path.includes('/') && !path.includes('\\') && !path.startsWith('.') && !/^con$/i.test(path), `${unsafe} → ${path}`);
    }
    assert.equal(distinctName('Same title', new Set()), 'Same title');
    const second = distinctName('Same title', new Set(['sametitle']));
    assert.notEqual(second.toLowerCase().replace(/[^a-z0-9]/g, ''), 'sametitle', 'a readable disambiguation, not an opaque ID');
    assert.match(second, /^Same title/);
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

test('task chats: a repeated report of the same unanswered question keeps one waiting agent-authored chat', async (t) => {
    const directory = await temporaryDirectory(t);
    const store = new ChatStore({ root: directory, runtime: { state: join(directory, '.ptbk', 'state') } }, { timeZone: 'UTC' });
    const chats = taskChats(store, { name: 'Publish the post', key: 'publishthepost' }, { takenNames: () => new Set() });
    const input = { agent: '@Developer', reason: 'Login required', question: 'Sign in to the site, then confirm.', choices: ['Done'], attempted: 'Reused the saved session.' };
    const first = await chats.askUser(input);
    const second = await chats.askUser(input);
    assert.equal(second.chat, first.chat);
    assert.equal(second.reused, true);
    const listed = await store.list();
    assert.equal(listed.length, 1);
    const [stored] = listed;
    assert.equal(stored.chat.status, 'waiting-for-user');
    assert.deepEqual(stored.chat.links, ['{Publish the post}']);
    assert.equal(stored.chat.messages[0].sender, '@Developer', 'the request is authored by the asking agent, not the environment');
    assert.match(stored.chat.messages[0].text, /Already attempted: Reused the saved session\./);
    assert.deepEqual(stored.chat.messages[0].choices, ['Done']);
});

test('same-name tasks: the first by resolver order runs; the copy is shadowed, reported and never renamed', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    for (const name of ['a.book', 'b.book']) await writeFile(join(project, 'tasks', name), 'TASK Same title\n\nDo it.\n\nTASK AGENT @Developer\n');
    await git(project, ['add', 'tasks']);
    await git(project, ['commit', '-qm', 'manual tasks']);
    const listed = JSON.parse((await ptbk(['list', '--json'], { cwd: project, env })).stdout);
    const same = listed.tasks.filter((task) => task.title === 'Same title');
    assert.equal(same.length, 2);
    assert.deepEqual(same.map((task) => task.readiness).sort(), ['blocked', 'ready'], JSON.stringify(same));
    assert.match(same.find((task) => task.readiness === 'blocked').reason, /tasks\/a\.book/);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'list never writes');
    const run = await ptbk(['run', '--raw', '--limit', '2'], { cwd: project, env });
    assert.equal(run.code, 0, run.output);
    const history = await subjects(project);
    assert.equal(history.filter((subject) => subject === 'PTBK: Same title').length, 1, 'only the winning copy is addressable');
    const [message] = (await messages(project)).filter((item) => item.startsWith('PTBK: Same title'));
    assert.match(message, /^Task-Name: Same title$/m);
    assert.doesNotMatch(message, /Task-ID/);
    await readFile(join(project, traceDirectoryOf('Same title'), 'harness.log'), 'utf8');
    assert.equal(await readFile(join(project, 'tasks', 'b.book'), 'utf8'), 'TASK Same title\n\nDo it.\n\nTASK AGENT @Developer\n', 'the shadowed copy is not renamed or merged');
    const lint = await ptbk(['lint', '--json'], { cwd: project, env });
    assert.ok(JSON.parse(lint.stdout).findings.some((finding) => /shadow/i.test(finding.message) && finding.location.includes('tasks/b.book')), lint.stdout);
});

test('follow-ups written by an agent are linked by name inside the result commit; a same-name copy stays shadowed', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Plan more CREATE_FOLLOW_UP', '--agent', 'Developer', '--priority', '5', '--raw'], { cwd: project, env });
    const run = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(run.code, 0, run.output);
    const [message] = await messages(project);
    assert.match(message, /^Task-Name: Plan more CREATE_FOLLOW_UP$/m);
    const created = [...message.matchAll(/^Created-Task-Name: (.+)$/gm)].map((match) => match[1]);
    assert.ok(created.includes('Follow-up one'), message);
    assert.ok(!created.includes('Plan more CREATE_FOLLOW_UP'), 'a copy under the same name is not new work');
    const files = await changedFiles(project);
    assert.ok(files.includes('tasks/zz-follow-up-one.book') && files.includes('tasks/zz-follow-up-two.book'));
    const listed = JSON.parse((await ptbk(['list', '--json', '--all'], { cwd: project, env })).stdout);
    const copy = listed.tasks.find((task) => task.source === 'tasks/zz-follow-up-two.book');
    assert.equal(copy.readiness, 'blocked', JSON.stringify(copy));
    assert.match(await readFile(join(project, 'tasks', 'zz-follow-up-two.book'), 'utf8'), /^Plan more CREATE_FOLLOW_UP$/m, 'never renamed automatically');
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
    const taskName = /^Task-Name: (.+)$/m.exec((await messages(project))[0])[1];
    assert.equal(taskName, 'Write the welcome page');
    const trace = traceDirectoryOf(taskName);
    const files = await changedFiles(project);
    assert.ok(files.includes(`${trace}/harness.log`), files.join('\n'));
    assert.ok(files.includes(`${trace}/events.jsonl`));
    assert.ok(!files.some((file) => file.includes('/local/')), 'post-commit events are never in the snapshot');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'events after the commit do not dirty the tree');
    await readFile(join(project, trace, 'local', 'events.jsonl'), 'utf8');
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
    assert.match(content, /^Transform the project according to the initial specification\nENTITY TASK$/m);
    assert.match(content, /\(\.\.\/specs\/_initial\.md\)/);
    assert.ok((await changedFiles(project)).includes('specs/_initial/image-1.png'), 'specification and assets are versioned with the task');
});

test('a task waiting for the user is checkpointed so independent work continues; the answer resumes it', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Choose a color ASK_USER', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    await ptbk(['add', 'Independent work', '--agent', 'Developer', '--priority', '1', '--raw'], { cwd: project, env });
    const first = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(first.code, 3, first.output);
    assert.match(first.stdout, /1 completed, 0 failed; 1 chat\(s\) waiting for you/);
    assert.equal((await subjects(project))[0], 'PTBK: Independent work', 'independent work progressed while the question waits');
    const inspect = await ptbk(['recover', '--raw'], { cwd: project, env });
    assert.match(inspect.stdout, /checkpointed/);
    const [chat] = JSON.parse((await ptbk(['answer', '--json'], { cwd: project, env })).stdout);
    assert.equal(chat.agent, '@Developer', 'the waiting chat is authored by the task agent');
    assert.match(chat.awaiting.text, /Already attempted: Checked the task and project instructions\./);
    assert.deepEqual(chat.awaiting.choices, ['red', 'blue']);
    assert.deepEqual(chat.links, ['{Choose a color ASK_USER}']);
    const invalid = await ptbk(['answer', chat.name, 'green', '--raw'], { cwd: project, env });
    assert.notEqual(invalid.code, 0, 'an offered decision accepts only its answers');
    const before = (await subjects(project)).length;
    assert.equal((await ptbk(['answer', chat.name, 'blue', '--raw'], { cwd: project, env })).code, 0);
    const answerCommit = (await messages(project))[0];
    assert.equal((await subjects(project)).length, before + 1, 'the answer is its own commit');
    assert.match(answerCommit, /^PTBK: Chat - /);
    assert.match(answerCommit, /^Chat-Name: /m);
    assert.match(answerCommit, /^Task-Name: Choose a color ASK_USER$/m);
    const second = await ptbk(['run', '--raw', '--limit', '1'], { cwd: project, env });
    assert.equal(second.code, 0, second.output);
    assert.equal((await subjects(project))[0], 'PTBK: Choose a color ASK_USER');
    const outputs = await readdir(join(project, 'output'));
    assert.match(await readFile(join(project, 'output', outputs.find((name) => name.includes('choose-a-color'))), 'utf8'), /\(blue\)/);
});

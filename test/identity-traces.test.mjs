import assert from 'node:assert/strict';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { TextEditor } from '../dist/ui/composer.js';
import { matchesFilter, windowAround } from '../dist/ui/prompts.js';
import { readableHarnessLine } from '../dist/engine/task-trace.js';
import { ensureTraceIgnoreRules, traceIgnoreRulesMatch } from '../dist/project/setup.js';
import { distinctName, nameKeyPath, traceDirectoryConflicts, traceDirectoryOf } from '../dist/tasks/identity.js';
import { ChatStore } from '../dist/chats/store.js';
import { taskChats } from '../dist/chats/task-chats.js';
import { committed, drive, findGenerated, generated, git, initializedProject, messages, ptbk, subjects, temporaryDirectory, waitFor, withoutVisual } from './helpers.mjs';

/**
 * The full message of the newest commit whose subject matches a generated name.
 */
async function commitMessage(project, title, prefix = 'ptbk: ') {
    return (await messages(project)).find((message) => generated(title, prefix).test(message.split('\n')[0]));
}

/**
 * Files changed by the newest commit whose subject matches a generated name.
 */
async function changedFilesOf(project, title, prefix = 'ptbk: ') {
    const sha = (await git(project, ['log', '--format=%H%x09%s'])).trim().split('\n').map((line) => line.split('\t').map(withoutVisual)).find(([, subject]) => generated(title, prefix).test(subject))?.[0];
    return sha ? changedFiles(project, sha) : [];
}

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

test('trace directories copy the literal source basename; collisions are detected; new names are distinct', () => {
    assert.equal(traceDirectoryOf('tasks/2026-10-19-1205-browser-repair.book'), 'traces/2026-10-19-1205-browser-repair', 'only the final .book extension is removed');
    assert.equal(traceDirectoryOf('custom/Ünïcode Task.Name.book'), 'traces/Ünïcode Task.Name', 'case, diacritics, spaces and inner dots are kept; the source folder does not matter');
    assert.equal(traceDirectoryOf('prompts/legacy-tasks.md'), 'traces/legacy-tasks', 'legacy Markdown drops its final .md');
    assert.throws(() => traceDirectoryOf('tasks/.book'), /no usable filename/);
    const conflicts = traceDirectoryConflicts(['tasks/a.book', 'tasks/a.md', 'tasks/b.book', 'tasks/b.book']);
    assert.deepEqual([...conflicts.values()], [['tasks/a.book', 'tasks/a.md']], 'different sources with one basename conflict; one source with several sections does not');
    for (const unsafe of ['../../etc/passwd', 'a/b\\c', 'CON', '...', 'name.']) {
        const path = nameKeyPath(unsafe);
        assert.ok(path && !path.includes('/') && !path.includes('\\') && !path.startsWith('.') && !/^con$/i.test(path), `${unsafe} → ${path}`);
    }
    assert.equal(distinctName('Same title', new Set()), 'Same title');
    const second = distinctName('Same title', new Set(['sametitle']));
    assert.notEqual(second.toLowerCase().replace(/[^a-z0-9]/g, ''), 'sametitle', 'a readable disambiguation, not an opaque ID');
    assert.match(second, /^Same title/);
});

test('picker filter and window: every typed word matches ignoring case and accents; long lists scroll around the focus', () => {
    assert.ok(matchesFilter('Frontend Developer · project agent', 'dev'));
    assert.ok(matchesFilter('Účetní asistent', 'ucetni ASIST'), 'accents and case are ignored');
    assert.ok(!matchesFilter('Copywriter', 'dev'));
    assert.ok(matchesFilter('Lawyer', ''), 'an empty filter keeps everything');
    assert.deepEqual(windowAround(5, 4, 10), { start: 0, end: 5 });
    assert.deepEqual(windowAround(40, 0, 10), { start: 0, end: 10 });
    assert.deepEqual(windowAround(40, 39, 10), { start: 30, end: 40 });
    assert.deepEqual(windowAround(40, 20, 10), { start: 15, end: 25 });
});

test('composer: long pastes become compact tokens with the full payload; expand, remove and attachments keep order', () => {
    const editor = new TextEditor('Intro ');
    const block = Array.from({ length: 120 }, (_, index) => `line ${index + 1}`).join('\n');
    editor.handle({ type: 'paste', text: block });
    editor.attach({ kind: 'image', path: '/tmp/a.png', name: 'a.png', bytes: 10 });
    editor.handle({ type: 'text', text: ' outro' });
    const layout = editor.layout(80, 10);
    assert.ok(layout.lines.join('\n').includes(`[Pasted text #1, ${block.length.toLocaleString('en-US')} characters, 120 lines]`), layout.lines.join('\n'));
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
    for (const name of ['a.book', 'b.book']) await writeFile(join(project, 'tasks', name), 'TASK Same title\nGOAL Do it.\nTASK AGENT @Developer\n');
    await git(project, ['add', 'tasks']);
    await git(project, ['commit', '-qm', 'manual tasks']);
    const listed = JSON.parse((await ptbk(['list', '--json'], { cwd: project, env })).stdout);
    const same = listed.tasks.filter((task) => task.title === 'Same title');
    assert.equal(same.length, 2);
    assert.deepEqual(same.map((task) => task.readiness).sort(), ['blocked', 'needs-assignment'], JSON.stringify(same));
    assert.match(same.find((task) => task.readiness === 'blocked').reason, /tasks\/a\.book/);
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'list never writes');
    const run = await drive(project, env, async () => (await subjects(project)).includes('ptbk: Same title'), { message: 'the winning copy' });
    assert.equal(run.code, 0, run.output);
    const history = await subjects(project);
    assert.equal(history.filter((subject) => subject === 'ptbk: Same title').length, 1, 'only the winning copy is addressable');
    const [message] = (await messages(project)).filter((item) => item.startsWith('ptbk: Same title'));
    assert.match(message, /^Task-Name: Same title$/m);
    assert.doesNotMatch(message, /Task-ID/);
    const winner = same.find((task) => task.readiness === 'needs-assignment').source;
    await readFile(join(project, traceDirectoryOf(winner), 'harness.log'), 'utf8');
    assert.equal(await readFile(join(project, 'tasks', 'b.book'), 'utf8'), 'TASK Same title\nGOAL Do it.\nTASK AGENT @Developer\n', 'the shadowed copy is not renamed or merged');
    const lint = await ptbk(['lint', '--json'], { cwd: project, env });
    assert.ok(JSON.parse(lint.stdout).findings.some((finding) => /shadow/i.test(finding.message) && finding.location.includes('tasks/b.book')), lint.stdout);
});

test('follow-ups written by an agent: a copy under an existing name is refused; distinct dated names join the result commit', async (t) => {
    const { project, env, log } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Plan more CREATE_FOLLOW_UP', '--agent', 'Developer', '--priority', '5', '--raw'], { cwd: project, env });
    const run = await drive(project, env, async () => committed(project, 'Plan more CREATE_FOLLOW_UP'), { message: 'the result with follow-ups' });
    assert.equal(run.code, 0, run.output);
    const turns = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)).filter((entry) => /^Plan more/.test(entry.title));
    assert.deepEqual(turns.map((turn) => turn.attempt), [1, 2], 'a follow-up born shadowed is sent back for repair');
    const message = await commitMessage(project, 'Plan more CREATE_FOLLOW_UP');
    const taskName = /^Task-Name: (.+)$/m.exec(message)[1];
    assert.match(taskName, generated('Plan more CREATE_FOLLOW_UP'));
    const created = [...message.matchAll(/^Created-Task-Name: (.+)$/gm)].map((match) => match[1]);
    assert.ok(findGenerated(created, 'Follow-up one') && findGenerated(created, 'Follow-up two'), message);
    assert.ok(!created.includes(taskName), 'no copy under the same name');
    const files = await changedFilesOf(project, 'Plan more CREATE_FOLLOW_UP');
    assert.ok(files.includes('tasks/zz-follow-up-one.book') && files.includes('tasks/zz-follow-up-two.book'));
    assert.match(await readFile(join(project, 'tasks', 'zz-follow-up-two.book'), 'utf8'), generated('Follow-up two', 'TASK '));
});

test('trace policy: committed traces share the result commit; videos and post-commit events stay out; the tree stays clean', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK, initArgs: ['--commit-traces'] });
    const config = JSON.parse(await readFile(join(project, 'ptbk.json'), 'utf8'));
    assert.deepEqual(config.traces, { isCommitted: true, isVideoIgnored: true, isVideoRecordingEnabled: true });
    const ignore = await readFile(join(project, '.gitignore'), 'utf8');
    assert.match(ignore, /^\/traces\/\*\/video\/$/m);
    assert.doesNotMatch(ignore, /^\/traces\/$/m);
    await ptbk(['add', 'Write the welcome page', '--agent', 'Developer', '--raw'], { cwd: project, env });
    const run = await drive(project, env, async () => committed(project, 'Write the welcome page'), { message: 'the result commit' });
    assert.equal(run.code, 0, run.output);
    const taskName = /^Task-Name: (.+)$/m.exec(await commitMessage(project, 'Write the welcome page'))[1];
    assert.match(taskName, generated('Write the welcome page'), 'new tasks carry their creation date/time in the name');
    const files = await changedFilesOf(project, 'Write the welcome page');
    const source = files.find((file) => file.startsWith('tasks/') && file.endsWith('.book') && !/learn-/.test(file));
    const trace = traceDirectoryOf(source);
    assert.equal(trace, `traces/${source.slice('tasks/'.length, -'.book'.length)}`, 'the trace directory is the literal source filename, not the task name');
    assert.ok(files.includes(`${trace}/harness.log`), files.join('\n'));
    assert.ok(files.includes(`${trace}/events.jsonl`));
    assert.ok(files.includes(`${trace}/usage.jsonl`), 'raw usage follows the trace policy into the result commit');
    const usage = (await readFile(join(project, trace, 'usage.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    assert.deepEqual(usage.map((record) => [record.schema, record.certainty, record.semantics, record.attribution.agent, record.attribution.work.kind, record.attribution.work.task, record.attribution.work.attempt, record.normalized.input, record.normalized.output]), [['ptbk-usage/1', 'reported', 'cumulative', 'Developer', 'task', taskName, 1, 10, 5]]);
    assert.deepEqual(usage[0].provider, { input_tokens: 10, output_tokens: 5 }, 'provider-native fields are kept');
    assert.ok(!files.some((file) => file.includes('/local/')), 'post-commit events are never in the snapshot');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '', 'events after the commit do not dirty the tree');
    await readFile(join(project, trace, 'local', 'events.jsonl'), 'utf8');
    const assignmentSha = (await git(project, ['log', '--format=%H%x09%s'])).trim().split('\n').map((line) => line.split('\t').map(withoutVisual)).find(([, subject]) => subject.startsWith('ptbk: Assign routing: Write the welcome page — '))[0];
    const assignment = await changedFiles(project, assignmentSha);
    assert.ok(assignment.includes(source), 'Router’s refinement of the task MODEL is its own scoped commit');
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
    assert.match(content.split('\n')[0], generated('Transform the project according to the initial specification', 'TASK '));
    assert.match(content, /^GOAL Transform this project according to the initial specification/m, 'the assignment is under GOAL');
    assert.match(content, /\(\.\.\/specs\/_initial\.md\)/);
    assert.ok((await changedFiles(project)).includes('specs/_initial/image-1.png'), 'specification and assets are versioned with the task');
    assert.match(content, /No sample roles were created for this agenda: create the specialist agents it actually needs/, 'the first task establishes relevant specialists');
    await assert.rejects(readFile(join(project, 'agents', 'developer.book'), 'utf8'), 'a supplied intent keeps no irrelevant sample roles');
    assert.match(await readFile(join(project, 'agents', '.core', 'chatter.book'), 'utf8'), /^AGENT Chatter$/m, 'every core role is still prepared');
});

test('a waiting question is closed with its reason when its task is completed or removed meanwhile; the question stays in the chat', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Choose a color ASK_USER', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    await ptbk(['add', 'Choose a size ASK_USER', '--agent', 'Planner', '--priority', '8', '--raw'], { cwd: project, env });
    const waiting = async () => JSON.parse((await ptbk(['answer', '--json'], { cwd: project, env })).stdout);
    assert.equal((await ptbk(['start', '--no-persist', '--raw'], { cwd: project, env })).code, 0);
    const asked = await waitFor(async () => {
        const chats = await waiting();
        return chats.length === 2 ? chats : undefined;
    }, { message: 'both questions', timeoutMs: 90_000 });
    const chatOf = (title) => asked.find((chat) => chat.links.some((link) => link.includes(title)));
    // The task Books themselves (Router's assignment Books mention the same words).
    const book = async (slug) => join(project, 'tasks', (await readdir(join(project, 'tasks'))).find((name) => new RegExp(`^\\d{4}-\\d{2}-\\d{2}-\\d{4}-${slug}`).test(name)));
    // The owner completes one task in its Book and deletes the other one (both without answering).
    const color = await book('choose-a-color');
    await writeFile(color, `${(await readFile(color, 'utf8')).trimEnd()}\nTASK DONE 2026-10-30T10:00:00+01:00\n`);
    await rm(await book('choose-a-size'));
    await waitFor(async () => (await waiting()).length === 0, { message: 'both questions closed', timeoutMs: 60_000 });
    const status = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    assert.equal(status.chats.waiting.length, 0);
    assert.equal(status.attention.chats, undefined, 'no stale attention remains');
    assert.doesNotMatch((await ptbk(['recover', '--raw'], { cwd: project, env })).stdout, /checkpointed/, 'no checkpoint is kept for them');
    const store = new ChatStore((await import('../dist/project/workspace.js')).projectAt(project), { timeZone: 'UTC' });
    for (const [title, reason] of [
        ['Choose a color ASK_USER', /^No reply is needed anymore: \{Choose a color ASK_USER — [^}]+\} was completed\./],
        ['Choose a size ASK_USER', /^No reply is needed anymore: its task source tasks\/.*choose-a-size.*\.book was removed\./],
    ]) {
        const stored = await store.find(chatOf(title).name);
        const [question, closing] = stored.chat.messages.slice(-2);
        assert.match(question.text, /Which color should the fixture use\?/, 'the question stays in the history');
        assert.match(closing.text, reason, title);
        assert.notEqual(stored.chat.status, 'waiting-for-user');
    }
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});

test('a task waiting for the user is checkpointed so independent work continues; the answer resumes it', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await ptbk(['add', 'Choose a color ASK_USER', '--agent', 'Developer', '--priority', '9', '--raw'], { cwd: project, env });
    await ptbk(['add', 'Developer follow-up', '--agent', 'Developer', '--priority', '5', '--raw'], { cwd: project, env });
    await ptbk(['add', 'Independent work', '--agent', 'Planner', '--priority', '1', '--raw'], { cwd: project, env });
    const first = await drive(project, env, async () => committed(project, 'Independent work'), { message: 'the independent work beside the waiting question' });
    assert.equal(first.code, 0, first.output);
    assert.ok(await committed(project, 'Independent work'), "another agent's work progressed while the question waits");
    assert.ok(!(await committed(project, 'Choose a color ASK_USER')), 'the waiting task is not complete');
    assert.ok(!(await committed(project, 'Developer follow-up')), 'the waiting task keeps its agent reserved: Developer starts no second task');
    const inspect = await ptbk(['recover', '--raw'], { cwd: project, env });
    assert.match(inspect.stdout, /checkpointed/);
    const [chat] = JSON.parse((await ptbk(['answer', '--json'], { cwd: project, env })).stdout);
    assert.equal(chat.agent, '@Developer', 'the waiting chat is authored by the task agent');
    assert.match(chat.awaiting.text, /Already attempted: Checked the task and project instructions\./);
    assert.deepEqual(chat.awaiting.choices, ['red', 'blue']);
    assert.equal(chat.links.length, 1);
    assert.match(chat.links[0], generated('Choose a color ASK_USER', '{', '}'), 'the chat links the full saved task name');
    const invalid = await ptbk(['answer', chat.name, 'green', '--raw'], { cwd: project, env });
    assert.notEqual(invalid.code, 0, 'an offered decision accepts only its answers');
    const before = (await subjects(project)).length;
    assert.equal((await ptbk(['answer', chat.name, 'blue', '--raw'], { cwd: project, env })).code, 0);
    const answerCommit = (await messages(project))[0];
    assert.equal((await subjects(project)).length, before + 1, 'the answer is its own commit');
    assert.match(answerCommit, /^ptbk: Chat - /);
    assert.match(answerCommit, /^Chat-Name: /m);
    assert.match(answerCommit, generated('Choose a color ASK_USER', 'Task-Name: '));
    const second = await drive(project, env, async () => committed(project, 'Choose a color ASK_USER'), { message: 'the resumed task' });
    assert.equal(second.code, 0, second.output);
    const outputs = await readdir(join(project, 'output'));
    assert.match(await readFile(join(project, 'output', outputs.find((name) => name.includes('choose-a-color'))), 'utf8'), /\(blue\)/);
});

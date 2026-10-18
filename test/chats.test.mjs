import assert from 'node:assert/strict';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { browserProfileDirectory, browserProfileSource } from '../dist/browser/browser.js';
import { parseChatBook } from '../dist/chats/chat-book.js';
import { generated, git, initializedProject, messages, ptbk, subjects, waitFor } from './helpers.mjs';

/**
 * Fixture check accepting every output.
 */
const CHECK = 'process.exit(0);\n';

/**
 * Parsed chat Books of a project.
 */
async function chats(project) {
    const names = (await readdir(join(project, 'chats')).catch(() => [])).filter((name) => name.endsWith('.book'));
    return await Promise.all(names.map(async (name) => ({ file: `chats/${name}`, chat: parseChatBook(await readFile(join(project, 'chats', name), 'utf8')) })));
}

test('ptbk chat without a service: agent chosen first, every message its own commit, separate threads, tasks and learning only through ordinary authoring', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const refused = await ptbk(['chat', '--agent', 'User', 'Hello me', '--raw'], { cwd: project, env });
    assert.notEqual(refused.code, 0, 'the user cannot chat with itself');
    assert.equal((await chats(project)).length, 0);
    const before = (await subjects(project)).length;

    const first = await ptbk(['chat', '--agent', 'Developer', 'How is the project going?', '--raw'], { cwd: project, env });
    assert.equal(first.code, 0, first.output);
    assert.match(first.stdout, /Started the chat \{\{Developer: How is the project going\? — /);
    assert.match(first.stdout, /Fixture reply to: How is the project going\?/);
    let [stored] = await chats(project);
    assert.match(stored.chat.name, generated('Developer: How is the project going?'), 'a new thread gets its creation date/time in its name');
    assert.deepEqual(stored.chat.members, ['@User', '@Developer']);
    assert.deepEqual(stored.chat.messages.map((message) => message.sender), ['@User', '@Developer'], 'the actual author of every message is kept');
    assert.equal((await readFile(join(project, stored.file), 'utf8')).split('\n')[0], `CHAT ${stored.chat.name}`, 'the Book opens with its CHAT declaration');
    const history = await subjects(project);
    assert.equal(history.length, before + 2, 'the user message and the agent reply are one commit each');
    assert.deepEqual(history.slice(0, 2), [`PTBK: Chat - ${stored.chat.name}`, `PTBK: Chat - ${stored.chat.name}`]);
    assert.ok((await messages(project))[0].includes(`Chat-Name: ${stored.chat.name}`));
    assert.equal((await readdir(join(project, 'tasks'))).filter((name) => name.endsWith('.book')).length, 1, 'opening a chat never creates a task');

    const second = await ptbk(['chat', '--agent', '@Developer', 'How is the project going?', '--raw'], { cwd: project, env });
    assert.equal(second.code, 0, second.output);
    const all = await chats(project);
    assert.equal(all.length, 2, 'a second thread with the same agent is separate, not merged');
    assert.equal(new Set(all.map((item) => item.chat.key)).size, 2, 'thread names stay distinct under normalization');

    const name = stored.chat.name;
    const asked = await ptbk(['chat', '--open', name, 'Please plan it. CREATE_TASK', '--raw'], { cwd: project, env });
    assert.equal(asked.code, 0, asked.output);
    const taskFile = (await readdir(join(project, 'tasks'))).find((file) => file.includes('task-from-chat'));
    assert.ok(taskFile, 'the agent created an ordinary task through create_task');
    const task = await readFile(join(project, 'tasks', taskFile), 'utf8');
    const taskName = task.split('\n')[0].replace(/^TASK /, '');
    assert.match(taskName, generated('Task from chat'));
    assert.match(task, /^GOAL Requested in a chat/m);
    assert.match(task, /^TASK AGENT @Developer$/m);
    assert.ok(task.includes(`LINK {{${name}}}`), task);
    const taskCommit = (await messages(project)).find((message) => message.startsWith(`PTBK: Add task - ${taskName}`));
    assert.ok(taskCommit, 'the task has its own authoring commit');
    assert.ok(taskCommit.includes(`Task-Name: ${taskName}`));
    [stored] = (await chats(project)).filter((item) => item.chat.name === name);
    assert.ok(stored.chat.messages.at(-1).text.includes(`Created the task {{${taskName}}}`), 'the chat reports the final saved name');

    const corrected = await ptbk(['chat', '--open', name, 'CORRECTION: answers here should be short.', '--raw'], { cwd: project, env });
    assert.equal(corrected.code, 0, corrected.output);
    const learningFile = (await readdir(join(project, 'tasks'))).find((file) => file.includes('learn-chat'));
    assert.ok(learningFile, 'a correction schedules an ordinary Teacher task');
    const learning = await readFile(join(project, 'tasks', learningFile), 'utf8');
    assert.match(learning, /^TASK AGENT @Teacher$/m);
    assert.ok(learning.includes(`TASK ORIGIN learning from chat {{${name}}} by @Developer`), learning);
    assert.doesNotMatch((await readFile(join(project, 'agents', 'developer.book'), 'utf8')), /short/, 'the chat never mutates the agent directly');

    const listed = JSON.parse((await ptbk(['chat', '--list', '--json'], { cwd: project, env })).stdout);
    assert.equal(listed.length, 2);
    assert.ok(listed.every((chat) => chat.humanFacing && chat.agent === '@Developer'));
    const commitsBeforeRead = (await subjects(project)).length;
    await ptbk(['chat', '--open', name, '--json'], { cwd: project, env });
    assert.equal((await subjects(project)).length, commitsBeforeRead, 'reading a chat creates no commit');
    assert.equal((await git(project, ['status', '--porcelain'])).trim(), '');
});

test('ptbk ask: a quick enquiry is an ordinary chat with the answer printed', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const result = await ptbk(['ask', '--agent', 'Expert', 'Which commitments can a task use?', '--raw'], { cwd: project, env });
    assert.equal(result.code, 0, result.output);
    assert.match(result.stdout, /Fixture reply to: Which commitments can a task use\?/);
    const [stored] = await chats(project);
    assert.deepEqual(stored.chat.members, ['@User', '@Expert']);
    assert.equal(stored.chat.messages.length, 2);
});

test('service chats: API create/reply/stale revision, startup replies, and Fixer schedules a bounded health check for a name collision', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    await mkdir(join(project, 'agents', 'twins'), { recursive: true });
    await writeFile(join(project, 'agents', 'twins', 'one.book'), 'AGENT Twin\nGOAL First copy.\n');
    await writeFile(join(project, 'agents', 'twins', 'two.book'), 'AGENT Twin\nGOAL Second copy.\n');
    // A user message written while no service ran gets its reply once the service starts.
    await mkdir(join(project, 'chats'), { recursive: true });
    await writeFile(join(project, 'chats', 'offline.book'), 'CHAT Offline question\nCHAT MEMBER @User\nCHAT MEMBER @Developer\nCHAT STATUS open\n\nCHAT MESSAGE @User 2026-10-17T10:00:00+02:00\nAre you there?\n');
    await git(project, ['add', 'agents', 'chats']);
    await git(project, ['commit', '-qm', 'Duplicate agent names and an offline chat']);
    const started = await ptbk(['start', '--no-tunnel', '--no-persist', '--raw'], { cwd: project, env });
    assert.equal(started.code, 0, started.output);
    const healthCommit = await waitFor(async () => (await subjects(project)).find((subject) => subject.startsWith('PTBK: Add task - Project health check')), { timeoutMs: 90_000, message: 'Fixer health check task' });
    const healthFile = (await readdir(join(project, 'tasks'))).find((file) => file.includes('project-health-check') && !file.includes('learn'));
    const health = await readFile(join(project, 'tasks', healthFile), 'utf8');
    assert.match(health, /^TASK AGENT @Fixer$/m);
    assert.match(health, /agents\/twins\/two\.book/, 'the finding names the shadowed source');
    assert.match(healthCommit, generated('Project health check', 'PTBK: Add task - '));
    await waitFor(async () => (await subjects(project)).includes(healthCommit.replace('PTBK: Add task - ', 'PTBK: ')), { timeoutMs: 90_000, message: 'Fixer to execute its health check' });
    assert.equal((await subjects(project)).filter((subject) => subject.startsWith('PTBK: Add task - Project health check')).length, 1, 'no repeated checks for unchanged findings');

    await waitFor(async () => (await chats(project)).find((item) => item.chat.name === 'Offline question')?.chat.messages.length === 2, { timeoutMs: 60_000, message: 'the startup reply to the offline message' });
    const offline = (await chats(project)).find((item) => item.chat.name === 'Offline question');
    assert.equal(offline.chat.messages[1].sender, '@Developer');
    assert.match(offline.chat.messages[1].text, /Fixture reply to: Are you there\?/);
    const token = /\n(ptbk_[A-Za-z0-9_-]+)\n/.exec((await ptbk(['access', 'token', 'chats', '--raw'], { cwd: project, env })).stdout)[1];
    const snapshot = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    const base = snapshot.connection.local.url;
    const call = async (path, body) => {
        const response = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, data: await response.json() };
    };
    const agents = await call('api/chat-agents');
    assert.equal(agents.status, 200);
    assert.ok(agents.data.agents.some((agent) => agent.name === 'Developer' && agent.group === 'ordinary'));
    assert.ok(agents.data.agents.some((agent) => agent.name === 'Fixer' && agent.group === 'hidden'), 'core agents are available behind More');
    assert.ok(agents.data.agents.some((agent) => agent.name === 'Expert' && agent.group === 'expert'));
    assert.ok(!agents.data.agents.some((agent) => ['User', 'Void', 'Null'].includes(agent.name)));
    const created = await call('api/chats', { agent: '@Developer', text: 'Status please', requestKey: 'draft-1' });
    assert.equal(created.status, 200, JSON.stringify(created.data));
    assert.ok(created.data.commit, 'the first message is committed before the API reports it');
    assert.match(created.data.name, generated('Developer: Status please'), 'the API returns the final generated name');
    const retried = await call('api/chats', { agent: '@Developer', text: 'Status please', requestKey: 'draft-1' });
    assert.equal(retried.data.name, created.data.name, 'a retried creation returns the chat it already created');
    const path = `api/chats/${encodeURIComponent(created.data.name)}`;
    const detail = await waitFor(async () => {
        const result = await call(path);
        return result.data.messages?.length === 2 ? result.data : undefined;
    }, { timeoutMs: 60_000, message: 'the agent reply' });
    assert.equal(detail.messages[1].sender, '@Developer');
    assert.equal((await call(`${path}/messages`, { text: 'Stale', expected: 1 })).status, 409, 'a stale client cannot add a duplicate');
    const sent = await call(`${path}/messages`, { text: 'Thanks', expected: 2 });
    assert.equal(sent.status, 200);
    const list = await call('api/chats');
    assert.ok(list.data.chats.some((chat) => chat.name === created.data.name));
    const state = JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout);
    assert.ok(state.chats.total >= 1);
    assert.equal((await ptbk(['stop', '--raw'], { cwd: project, env })).code, 0);
});

test('browser profile sources: the managed global profile is the default; isolated, user and custom paths are explicit', () => {
    const project = { root: '/work/site', runtime: { browserProfile: '/work/site/.ptbk/browser/profile' } };
    const settings = (profile) => ({ values: { 'browser.profile': profile }, sources: {}, diagnostics: [], harnesses: {} });
    const env = { PTBK_HOME: '/home/me/ptbk' };
    assert.equal(browserProfileSource('global'), 'global');
    assert.equal(browserProfileSource('/some/path'), 'custom');
    assert.equal(browserProfileDirectory(project, settings('global'), env), join('/home/me/ptbk', 'browser-profile'));
    assert.equal(browserProfileDirectory(project, settings('isolated'), env), '/work/site/.ptbk/browser/profile');
    assert.equal(browserProfileDirectory(project, settings('profiles/shared'), env), join('/work/site', 'profiles', 'shared'));
    assert.notEqual(browserProfileDirectory(project, settings('user'), env), browserProfileDirectory(project, settings('global'), env), "the managed profile is never the user's Chrome profile");
});

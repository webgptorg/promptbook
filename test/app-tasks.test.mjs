import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { EngineApi, opaqueIdOf } from '../dist/app/api/engine-api.js';
import { ALL_PERMISSIONS } from '../dist/app/web/access.js';
import { parseBook } from '../dist/book/parse.js';
import { readTaskBook } from '../dist/tasks/book-task.js';
import { temporaryDirectory } from './helpers.mjs';

/** Real parsed Books behind the HTTP contract, without starting work or opening a listener. */
async function fixture(t) {
    const root = await temporaryDirectory(t, 'app tasks');
    const sources = [
        'TASK Parent work\nGOAL Parent\n',
        'TASK Completed prerequisite\nTASK DONE 2026-11-01T10:00:00Z\n',
        'TASK Child work\nTASK PARENT {Parent work}\nTASK DEPENDS ON {Completed prerequisite}\nTASK DEPENDS ON {Missing task}\nTASK AGENT @Developer\nTASK AFTER 2099-01-01T10:00:00Z\nTASK DUE DATE 2099-01-02\nTASK REPEAT 1h\nTASK PURPOSE CONTENT\nTASK NOTE Kept note\nLINK {Discussion}\n',
        'TASK Retried work\nTASK DONE 2026-11-01T10:00:00Z\nTASK REOPEN 2026-11-02T10:00:00Z\nTASK DONE 2026-11-03T11:00:00Z\nTASK REOPEN 2026-11-04T09:00:00Z\n',
        'TASK Cycle A\nTASK DEPENDS ON {Cycle B}\n',
        'TASK Cycle B\nTASK DEPENDS ON {Cycle A}\n',
    ];
    const tasks = [];
    for (const [index, source] of sources.entries()) {
        const path = join(root, `${index}.book`);
        await writeFile(path, source);
        tasks.push(readTaskBook({ source, path, relativePath: `${index}.book`, order: index, timeZone: 'UTC' }));
    }
    const inventory = tasks.map(task => ({ ref: task.ref, title: task.title, readiness: task.title === 'Child work' ? 'waiting-dependency' : task.status === 'todo' ? 'ready' : task.status, reason: 'Scheduler explanation', priority: task.priority.value, agent: task.routing.agent, purpose: task.purpose, until: task.after ? new Date(task.after).toISOString() : undefined, doneCount: task.doneStamps.length, lastDone: task.doneStamps.at(-1), source: task.source.relativePath }));
    inventory.push({ ref: '{Engine update}', title: 'Engine update', readiness: 'ready', reason: 'Update available', priority: 0, doneCount: 0, source: '', kind: 'engine', purpose: 'system', core: true, executor: 'engine-updater' });
    const books = sources.map((source, index) => ({ name: tasks[index].title, normalized: tasks[index].key, kind: 'task', document: parseBook(source) }));
    books.push({ name: 'Discussion', normalized: 'discussion', kind: 'chat', document: parseBook('CHAT Discussion\nLINK {Child work}\n') });
    const snapshot = { tasks, inventory, books, active: [], results: [], agents: [{ name: 'Developer', key: 'developer' }], timeZone: 'UTC' };
    const agenda = { snapshot: () => ({ project: { name: 'Tasks fixture' }, agents: snapshot.agents }), taskReadSnapshot: async () => snapshot, chatList: async () => [], currentRevision: 0, waitForChange: async () => undefined };
    const api = new EngineApi({ agenda, projectRoot: root, stateDirectory: join(root, 'app'), engineId: () => undefined, hostname: () => 'engine.test', dashboardUrl: () => undefined, security: () => undefined, ui: () => ({}) });
    const actor = { memberId: 'owner', displayName: 'Owner', role: 'owner', permissions: [...ALL_PERMISSIONS], stepUpFresh: true };
    const request = async (path, options = {}, overrides = {}) => await api.handle(new Request(`https://engine.test/api/v1${path}`, options), { ...actor, ...overrides }, {});
    const call = async (path, overrides) => { const response = await request(path, {}, overrides); return { status: response.status, body: await response.json() }; };
    return { root, snapshot, call, request };
}

test('App Tasks: filters, stable pagination, permissions and strict input leave the source Books untouched', async t => {
    const { root, snapshot, call } = await fixture(t);
    const before = await Promise.all(snapshot.tasks.map(task => readFile(task.source.path, 'utf8')));
    assert.ok((await call('/engine')).body.capabilities.some(capability => capability.id === 'tasks' && capability.version === 1));
    const all = (await call('/tasks')).body.items;
    assert.equal(all.length, 7);
    assert.equal(all.find(task => task.kind === 'engine').sourcePath, null);
    const filtered = await call('/tasks?state=waiting-dependency,done&agentId=developer&q=CHILD');
    assert.equal(filtered.status, 200, JSON.stringify(filtered));
    assert.deepEqual(filtered.body.items.map(task => task.name), ['Child work']);
    const seen = [];
    let cursor = '';
    do {
        const response = await call(`/tasks?limit=1${cursor ? `&cursor=${cursor}` : ''}`);
        assert.equal(response.status, 200);
        seen.push(response.body.items[0].id);
        cursor = response.body.nextCursor;
    } while (cursor);
    assert.equal(new Set(seen).size, all.length);
    assert.equal((await call('/tasks?cursor=malformed')).body.code, 'invalid-cursor');
    assert.equal((await call('/tasks?unexpected=true')).status, 400);
    assert.equal((await call('/tasks', { permissions: [] })).status, 403);
    assert.equal((await call('/tasks/unknown')).status, 404);
    assert.equal((await call('/tasks/unknown/occurrences')).status, 404);
    assert.deepEqual(await Promise.all(snapshot.tasks.map(task => readFile(task.source.path, 'utf8'))), before);
});

test('App Tasks: parent, dependency, cycles, notes and directed links reflect the same Book graph', async t => {
    const { call } = await fixture(t);
    const child = await call(`/tasks/${opaqueIdOf('childwork')}`);
    assert.equal(child.status, 200, JSON.stringify(child));
    assert.equal(child.body.purpose, 'content');
    assert.deepEqual(child.body.notes, ['Kept note']);
    assert.equal(child.body.repeat.intervalSeconds, 3600);
    assert.equal(child.body.notBefore, '2099-01-01T10:00:00.000Z');
    assert.equal(child.body.dueAt, '2099-01-02T00:00:00.000Z');
    assert.deepEqual(child.body.dependsOn.map(dependency => dependency.state), ['met', 'missing']);
    assert.ok(child.body.links.some(link => link.direction === 'outgoing' && link.target.chatId === 'Discussion'));
    assert.ok(child.body.links.some(link => link.direction === 'incoming' && link.target.chatId === 'Discussion'));
    const parent = (await call(`/tasks/${child.body.parent.taskId}`)).body;
    assert.ok(parent.children.some(task => task.taskId === child.body.id));
    assert.deepEqual((await call(`/tasks?parentId=${parent.id}`)).body.items.map(task => task.id), [child.body.id]);
    const prerequisite = (await call(`/tasks/${child.body.dependsOn[0].taskId}`)).body;
    assert.ok(prerequisite.blocks.some(task => task.taskId === child.body.id));
    assert.equal((await call(`/tasks/${opaqueIdOf('cyclea')}`)).body.dependsOn[0].state, 'cycle');
});

test('App Tasks: retained failures, retries, completion stamps and an active reopening keep their evidence and IDs', async t => {
    const { snapshot, call } = await fixture(t);
    const definition = snapshot.tasks.find(task => task.title === 'Retried work');
    const result = { taskRef: definition.ref, taskName: definition.title, title: definition.title, kind: 'task', attempts: 1, engineVersion: 'fixture', startedAt: '2026-11-03T10:00:00Z', endedAt: '2026-11-03T10:10:00Z', outcome: 'failed', summary: 'Failed check', runId: 'failed-run' };
    snapshot.results.push(result, { ...result, runId: 'completed-run', startedAt: '2026-11-03T10:20:00Z', endedAt: '2026-11-03T11:00:00Z', outcome: 'completed', summary: 'Verified completion' });
    snapshot.results.push({ ...result, runId: 'completed-run', summary: 'Older checkpoint of the same run' });
    snapshot.results.unshift({ ...result, runId: 'active-run', outcome: 'awaiting-user', startedAt: '2026-11-04T10:00:00Z', endedAt: '2026-11-04T10:10:00Z' });
    snapshot.active.push({ taskKey: definition.key, taskTitle: definition.title, runId: 'active-run', startedAt: '2026-11-04T10:00:00Z', phase: 'executing' });
    const route = `/tasks/${opaqueIdOf(definition.key)}/occurrences`;
    const response = await call(route);
    assert.equal(response.status, 200, JSON.stringify(response));
    const items = response.body.items;
    assert.deepEqual(items.map(item => item.state), ['running', 'completed', 'failed', 'completed']);
    assert.equal(items[1].reason, 'retry');
    assert.equal(items[1].retryOf, items[2].id);
    assert.equal(items[0].cycle, 3);
    assert.deepEqual(items.map(item => item.sequence), [4, 3, 2, 1]);
    assert.deepEqual((await call(route)).body.items.map(item => item.id), items.map(item => item.id));
});

test('App Tasks: an event hints to refetch the changed task without carrying task content', async t => {
    const { snapshot, request } = await fixture(t);
    const abort = new AbortController();
    const response = await request('/events', { signal: abort.signal });
    assert.equal(response.status, 200);
    const reader = response.body.getReader();
    const pending = reader.read();
    await new Promise(resolve => setTimeout(resolve, 50));
    snapshot.inventory[0] = { ...snapshot.inventory[0], readiness: 'active', reason: 'Private task explanation' };
    const chunk = await pending;
    abort.abort();
    await reader.cancel();
    const text = new TextDecoder().decode(chunk.value);
    assert.match(text, /task.changed/);
    assert.match(text, /"state":"active"/);
    assert.ok(!text.includes('Private task explanation'));
});

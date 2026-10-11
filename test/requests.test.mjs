import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createRequest, answerRequest, listRequests } from '../dist/coder/requests.js';

test('immutable concurrent requests publish complete JSON and occurrence-scoped questions do not reuse old replies', async t => {
    const projectPath = await mkdtemp(join(tmpdir(), 'ptbk durable request '));
    t.after(() => rm(projectPath, { recursive: true, force: true }));
    const workspace = { projectPath, statePath: join(projectPath, '.ptbk') };
    const question = { kind: 'question', reason: 'Recurring acceptance decision', taskId: 'recurring', prompt: 'Continue this occurrence?', activityId: 'first-slot' };
    const copies = await Promise.all(Array.from({ length: 10 }, () => createRequest(workspace, question)));
    assert.equal(new Set(copies.map(item => item.id)).size, 1);
    const answers = await Promise.allSettled(Array.from({ length: 10 }, (_, index) => answerRequest(workspace, copies[0].id, `Decision ${index}`)));
    assert.equal(answers.filter(item => item.status === 'fulfilled').length, 1);
    const completed = await createRequest(workspace, question);
    assert.equal(completed.status, 'answered', 'Restarting the same activity reuses its durable reply');
    const next = await createRequest(workspace, { ...question, activityId: 'next-slot' });
    assert.notEqual(next.id, completed.id);
    assert.equal(next.status, 'pending', 'A later occurrence requires its own answer');
    assert.equal((await listRequests(workspace, true)).length, 1);
    for (const filename of await readdir(join(workspace.statePath, 'requests'))) {
        assert.ok(filename.endsWith('.json'), 'Atomic publication cleaned its temporary files');
        JSON.parse(await readFile(join(workspace.statePath, 'requests', filename), 'utf8'));
    }
});

import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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

test('request choices require unique readable values before creating runtime storage', async t => {
    const projectPath = await mkdtemp(join(tmpdir(), 'ptbk request choice validation '));
    t.after(() => rm(projectPath, { recursive: true, force: true }));
    const workspace = { projectPath, statePath: join(projectPath, '.ptbk') };
    /** Invalid declared answers must be rejected rather than normalized into selectable values. */
    const invalidChoices = [
        [''], [' \t\r\n'], ['\u0000\u001b[31m\u001b[0m'], ['same', 'same'],
        ['x'.repeat(1001)], Array.from({ length: 51 }, (_, index) => `Choice ${index}`),
        ['Valid', 42], null, 'Choose one',
    ];
    for (const choices of invalidChoices) {
        await assert.rejects(createRequest(workspace, { kind: 'question', reason: 'Pick an answer.', prompt: 'Which answer?', choices }), /unique readable strings/);
        assert.deepEqual(await readdir(projectPath), [], 'Invalid choices do not publish an unusable request');
    }
    const choices = [' Keep settings ', 'Continue\nwith next task'];
    const request = await createRequest(workspace, { kind: 'question', reason: 'Pick an answer.', prompt: 'Which answer?', choices });
    assert.deepEqual(request.choices, choices, 'Readable values retain their exact content');
    assert.deepEqual((await listRequests(workspace))[0].choices, choices);
    const open = await createRequest(workspace, { kind: 'question', reason: 'Describe the next step.', prompt: 'What next?', choices: [] });
    assert.deepEqual(open.choices, [], 'An empty list remains an open-ended question');
});

test('persisted unreadable or duplicate request choices are rejected and preserved for investigation', async t => {
    const projectPath = await mkdtemp(join(tmpdir(), 'ptbk persisted request choices '));
    t.after(() => rm(projectPath, { recursive: true, force: true }));
    const workspace = { projectPath, statePath: join(projectPath, '.ptbk') };
    const request = await createRequest(workspace, { kind: 'question', reason: 'Pick an answer.', prompt: 'Which answer?', choices: ['Keep', 'Continue'] });
    const path = join(workspace.statePath, 'requests', `${request.id}.json`);
    for (const choices of [[' '], ['\u001b[31m'], ['same', 'same'], ['x'.repeat(1001)], null]) {
        const invalid = JSON.stringify({ ...request, choices });
        await writeFile(path, invalid);
        await assert.rejects(listRequests(workspace), /Invalid request choices; preserved for investigation/);
        assert.equal(await readFile(path, 'utf8'), invalid);
    }
});

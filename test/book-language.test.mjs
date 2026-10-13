import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepareAgent, readLocalAgentModel } from '../dist/coder/agents.js';
import { assignTaskId, parseBook, recordTaskCompletion, serializeTaskBook, updateTaskControls } from '../dist/coder/sources.js';
import { evaluateEligibility } from '../dist/coder/schedule.js';

/** Provide an isolated Book directory without initialization or provider access. */
async function fixture(t) {
    const project = await mkdtemp(path.join(os.tmpdir(), 'ptbk-book-language-'));
    t.after(() => rm(project, { recursive: true, force: true }));
    await mkdir(path.join(project, 'agents'));
    return project;
}

test('UTF-8 BOM task Books remain identifiable and source updates preserve their original bytes', async t => {
    const project = await fixture(t);
    const file = path.join(project, 'work.book');
    for (const prefix of ['\ufeff', '\ufeff\r\n\r\n']) {
        const source = `${prefix}TASK Unicode 🦊\r\n\r\nKeep this description.\r\n`;
        await writeFile(file, source);
        let task = parseBook(source, file, 'UTC');
        assert.ok(task, 'A BOM must not hide a task from the queue.');
        assert.equal(task.title, 'Unicode 🦊');
        assert.deepEqual(task.diagnostics, []);
        task = await assignTaskId(task);
        task = await updateTaskControls(task, { harness: 'openai-codex' });
        task = await recordTaskCompletion(task, '2026-10-14T12:00:00Z');
        assert.equal(task.status, 'done');
        assert.ok((await readFile(file, 'utf8')).startsWith(source));
    }
});

test('task rule and note aliases retain their declared executable and commentary semantics', () => {
    const source = 'TASK Work\n\nDo the assignment.\nRULE First rule.\nRULES Second rule.\nContinue the second rule.\nNOTE First note.\nNOTES Second note.\nCOMMENT Third note.\nNONCE Fourth note.\nTODO Fifth note.\n';
    const task = parseBook(source, '/tmp/aliases.book', 'UTC');
    assert.deepEqual(task.diagnostics, []);
    assert.equal(task.payload, 'Do the assignment.');
    assert.deepEqual(task.rules, ['First rule.', 'Second rule.\nContinue the second rule.']);
    assert.deepEqual(task.metadata, ['NOTE First note.', 'NOTE Second note.', 'NOTE Third note.', 'NOTE Fourth note.', 'NOTE Fifth note.']);
    const restored = parseBook(serializeTaskBook(task), '/tmp/aliases.book', 'UTC');
    assert.deepEqual(restored.diagnostics, []);
    assert.equal(restored.payload, task.payload);
    assert.deepEqual(restored.rules, task.rules);
    assert.deepEqual(restored.metadata, task.metadata);
});

test('literal task aliases stay payload while unknown task controls still block execution', () => {
    const source = 'TASK Example\n\n```book\nRULES Literal rule.\nCOMMENT Literal note.\nTASK UNKNOWN literal\n```\nTASK ID example\n';
    const task = parseBook(source, '/tmp/example.book', 'UTC');
    assert.deepEqual(task.diagnostics, []);
    assert.match(task.payload, /RULES Literal rule/);
    assert.deepEqual(task.rules, []);
    assert.deepEqual(task.metadata, []);
    assert.deepEqual(parseBook(serializeTaskBook(task), '/tmp/example.book', 'UTC').payload, task.payload);
    const invalid = parseBook('TASK Invalid\nWork.\nTASK UNKNOWN setting\n', '/tmp/invalid.book', 'UTC');
    assert.ok(invalid.diagnostics.some(message => /Unsupported executable commitment/.test(message)));
});

test('first-line task controls cannot masquerade as titles through tabs or CRLF', () => {
    for (const control of ['TASK ID', 'TASK AGENT', 'TASK DONE', 'TASK THINKING LEVEL']) {
        for (const suffix of ['\r\n', '\tvalue\r\n', ' value\n']) {
            const task = parseBook(`${control}${suffix}Description.\n`, '/tmp/control.book', 'UTC');
            assert.ok(task.diagnostics.some(message => /first-line TASK title/.test(message)), control + suffix);
        }
    }
});

test('commentary aliases never introduce task placeholders or executable task restrictions', () => {
    for (const alias of ['NOTE', 'NOTES', 'COMMENT', 'NONCE', 'TODO']) {
        const task = parseBook(`TASK Ready\nDo the work.\n${alias} @@@ An unresolved note.\n`, '/tmp/note.book', 'UTC');
        assert.equal(evaluateEligibility(task, { now: Date.now(), timezone: 'UTC' }).kind, 'ready', alias);
    }
});

test('agent literal fences close only on a matching bare delimiter, including during offline model inspection', async t => {
    const project = await fixture(t);
    const file = path.join(project, 'agents', 'writer.book');
    const source = 'Writer\nFROM Void\nMODEL real-model\nWRITING SAMPLE\n````book\n```\n````still-literal\nMODEL fake-model\nTEAM @Missing\nCLOSED\n~~~~\n````\nRULE Keep the final rule.\n';
    await writeFile(file, source);
    const agent = await prepareAgent(file, project);
    assert.equal(agent.model, 'real-model');
    assert.equal(await readLocalAgentModel(file, project), 'real-model');
    assert.equal(agent.learning.open, true);
    assert.deepEqual(agent.team, []);
    assert.match(agent.instructions, /MODEL fake-model\nTEAM @Missing\nCLOSED/);
    assert.match(agent.instructions, /RULE .*Keep the final rule/);
    assert.equal(await readFile(file, 'utf8'), source);
});

test('unclosed agent literals give a source location instead of concealing learning controls', async t => {
    const project = await fixture(t);
    const file = path.join(project, 'agents', 'writer.book');
    await writeFile(file, 'Writer\nFROM Void\nWRITING SAMPLE\n```book\nCLOSED\n');
    await assert.rejects(prepareAgent(file, project), error => error.message.includes(`${file}:4:`) && /Unclosed literal fence/.test(error.message));
    await assert.rejects(readLocalAgentModel(file, project), /Unclosed literal fence/);
});

test('agent writing and example aliases resolve to the same commitments for instruction withdrawal', async t => {
    const project = await fixture(t);
    const file = path.join(project, 'agents', 'writer.book');
    await writeFile(file, 'Writer\nFROM Void\nWRITING RULE Use short sentences.\nEXAMPLE A concise answer.\nDELETE WRITING RULES Use short sentences.\nREMOVE SAMPLE A concise answer.\nRULE Keep evidence.\n');
    const agent = await prepareAgent(file, project);
    assert.doesNotMatch(agent.instructions, /Use short sentences|A concise answer/);
    assert.match(agent.instructions, /Keep evidence/);
});

test('instruction withdrawal accepts aliased references and offline model resolution agrees with execution', async t => {
    const project = await fixture(t);
    const file = path.join(project, 'agents', 'writer.book');
    await writeFile(file, 'Writer\nFROM Void\nMODEL base-model\nMODELS later-model\nCANCEL MODELS later-model\nRULES Withdraw this.\nDISCARD RULES Withdraw this.\nCOMMENT Commentary.\nDELETE NOTE Commentary.\nRULE Keep this.\n');
    const agent = await prepareAgent(file, project);
    assert.equal(agent.model, 'base-model');
    assert.equal(await readLocalAgentModel(file, project), 'base-model');
    assert.doesNotMatch(agent.instructions, /Withdraw this|Commentary/);
    assert.match(agent.instructions, /Keep this/);
    await writeFile(file, 'Writer\nFROM Void\nRULE Same rule.\nRULES Same rule.\nDELETE RULES Same rule.\n');
    await assert.rejects(prepareAgent(file, project), /DELETE target is ambiguous/);
    await assert.rejects(readLocalAgentModel(file, project), /DELETE target is ambiguous/);
    await writeFile(file, 'Writer\nFROM Void\nRULES First line.\nSecond line.\nDELETE RULES First line.\nSecond line.\nRULE Retain this.\n');
    assert.doesNotMatch((await prepareAgent(file, project)).instructions, /First line|Second line/);
    assert.equal(await readLocalAgentModel(file, project), undefined);
});

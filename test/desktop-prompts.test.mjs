import assert from 'node:assert/strict';
import { createConnection } from 'node:net';
import { test } from 'node:test';
import { createPromptServer } from '../apps/desktop/prompt-server.cjs';
import { promptPresentation } from '../dist/ui/prompt-transport.js';
import { CANCELLED, composeRich, inputLine, selectMany, selectOne, toggleList, wasInterrupted } from '../dist/ui/prompts.js';
import { createTerminalProfile } from '../dist/ui/terminal.js';
import { persistentServiceEnvironment } from '../dist/service/records.js';

/** Runs real common prompts over the private loopback presentation transport. */
async function presentation(t, respond) {
    let server;
    server = await createPromptServer((prompt) => { void Promise.resolve(respond(prompt)).then((answer) => server.answer(prompt.id, answer)); });
    t.after(() => server.close());
    return { server, terminal: { ...createTerminalProfile(), prompts: promptPresentation(server.env) } };
}
const frame = { title: 'ptbk init', step: 'Destination' };

test('graphical choices retain initializer-owned values and reject disabled/out-of-range answers', async (t) => {
    const value = { installation: 'global' };
    let call = 0;
    const { terminal } = await presentation(t, (prompt) => {
        assert.equal(prompt.choices[0].value, 0);
        assert.equal(prompt.choices[0].installation, undefined);
        return { action: 'answer', value: [1, 99, 0][call++] };
    });
    assert.equal(await selectOne(terminal, { frame, question: 'Installation', choices: [{ value, label: 'Global' }, { value: 'invalid', label: 'Disabled', disabled: true }] }), value);
    assert.equal(call, 3);
});

test('graphical default focus matches the first enabled terminal choice and removes terminal styling only from labels', async (t) => {
    const { terminal } = await presentation(t, (prompt) => {
        assert.equal(prompt.initial, 1);
        assert.equal(prompt.question, 'Choose');
        assert.equal(prompt.choices[1].label, 'Enabled');
        assert.deepEqual(prompt.frame.summary, ['Ready']);
        return { action: 'answer', value: prompt.initial };
    });
    assert.equal(await selectOne(terminal, { frame: { title: 'Init', summary: ['\x1b[32mReady\x1b[0m'] }, question: '\x1b[1mChoose\x1b[0m', choices: [{ value: 'off', label: 'Disabled', disabled: true }, { value: 'on', label: '\x1b[32mEnabled\x1b[0m' }] }), 'on');
});

test('a disabled preferred choice advances to the same following option as the terminal', async (t) => {
    const { terminal } = await presentation(t, (prompt) => {
        assert.equal(prompt.initial, 2);
        return { action: 'answer', value: prompt.initial };
    });
    assert.equal(await selectOne(terminal, { frame, question: 'Installation', defaultValue: 'disabled', choices: [{ value: 'first', label: 'First' }, { value: 'disabled', label: 'Unavailable', disabled: true }, { value: 'next', label: 'Next' }] }), 'next');
});

test('the original initializer reports its actual completed project without another user prompt', async (t) => {
    let completion;
    const server = await createPromptServer((prompt) => { completion = prompt.completion; });
    t.after(() => server.close());
    const actual = { root: '/tmp/the actual project', ready: true, running: true };
    const result = await promptPresentation(server.env)({ kind: 'complete', frame: { title: 'Init' }, question: 'Initialization result', completion: actual });
    assert.equal(result.action, 'answer');
    assert.deepEqual(completion, actual);
});

test('graphical Back and Cancel follow the original distinct wizard transitions', async (t) => {
    let action = 'back';
    const { terminal } = await presentation(t, () => ({ action }));
    assert.equal(await inputLine(terminal, { frame, question: 'Path' }), CANCELLED);
    assert.equal(wasInterrupted(), false);
    action = 'cancel';
    assert.equal(await inputLine(terminal, { frame, question: 'Path' }), CANCELLED);
    assert.equal(wasInterrupted(), true);
});

test('graphical text uses ordinary inputLine validation and retains full ordered attachments', async (t) => {
    let value = [{ type: 'text', text: 'bad' }];
    let call = 0;
    const { terminal } = await presentation(t, () => {
        call++;
        const answer = value;
        value = [{ type: 'text', text: 'valid' }];
        return { action: 'answer', value: answer };
    });
    assert.equal(await inputLine(terminal, { frame, question: 'Name', validate: (value) => value === 'valid' ? undefined : 'Choose valid.' }), 'valid');
    assert.equal(call, 2);
    const payload = [{ type: 'text', text: 'before\n'.repeat(2000) }, { type: 'attachment', kind: 'file', path: '/tmp/project brief.md', name: 'project brief.md' }, { type: 'text', text: 'after' }];
    value = payload;
    const result = await composeRich(terminal, { frame, question: 'Intent', attachments: true });
    assert.deepEqual(result.segments, payload);
});

test('multiple selections enforce shared minimum and toggle effects are reviewed before confirmation', async (t) => {
    let call = 0;
    const { terminal } = await presentation(t, (prompt) => {
        call++;
        return { action: 'answer', value: prompt.kind === 'many' ? (call === 1 ? [] : [0, 0]) : { trace: false } };
    });
    assert.deepEqual(await selectMany(terminal, { frame, question: 'Harnesses', choices: [{ value: 'codex', label: 'Codex' }], initial: [], minimum: 1 }), ['codex']);
    assert.equal(call, 2);
    assert.deepEqual(await toggleList(terminal, { frame, question: 'Traces', toggles: [{ key: 'trace', label: 'Trace', description: 'Keep traces' }], initial: { trace: true }, effect: (values) => [String(values.trace)] }), { trace: false });
    assert.equal(call, 4);
});

test('private presentation credentials are not persisted in engine startup environment', () => {
    const env = persistentServiceEnvironment({ PATH: process.env.PATH, PTBK_PROMPT_PORT: '1234', PTBK_PROMPT_TOKEN: 'a'.repeat(64) });
    assert.equal(env.PTBK_PROMPT_PORT, undefined);
    assert.equal(env.PTBK_PROMPT_TOKEN, undefined);
    assert.equal(promptPresentation({}), undefined);
});

test('an unrelated client cannot submit a prompt without its private token', async (t) => {
    let called = false;
    const { server } = await presentation(t, () => { called = true; return { action: 'cancel' }; });
    await new Promise((resolve, reject) => {
        const socket = createConnection({ host: '127.0.0.1', port: Number(server.env.PTBK_PROMPT_PORT) });
        socket.once('error', reject);
        socket.once('connect', () => socket.write(`${JSON.stringify({ token: 'wrong', prompt: { kind: 'text', question: 'Injected' } })}\n`));
        socket.once('close', resolve);
    });
    assert.equal(called, false);
});

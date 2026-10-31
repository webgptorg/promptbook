import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { runBookEditor } from '../dist/ui/book-editor.js';
import { runChatClient } from '../dist/ui/chat-client.js';
import { CANCELLED, composeRich, inputLine, selectMany, selectOne, toggleList } from '../dist/ui/prompts.js';
import { createTerminalProfile } from '../dist/ui/terminal.js';
import { walletLoginForm } from '../dist/ui/wallet-forms.js';

// The real prompts on a fake terminal: this process's stdin acts as a TTY and rendered frames are captured.
const terminal = { ...createTerminalProfile(), pointer: true };
const frame = { title: 'Check' };
const realWrite = process.stdout.write;
let written = '';

before(() => {
    process.stdin.isTTY = true;
    process.stdin.setRawMode = () => process.stdin;
    // The test runner's own reports are bytes; everything a prompt renders is text.
    process.stdout.write = function (chunk, ...rest) {
        if (typeof chunk !== 'string') return realWrite.call(process.stdout, chunk, ...rest);
        written += chunk;
        rest.find((argument) => typeof argument === 'function')?.();
        return true;
    };
});
after(() => {
    process.stdout.write = realWrite;
    process.stdin.pause();
});
beforeEach(() => {
    written = '';
});

/** Lets pending promises and timers move on. */
const settle = async () => {
    for (let turn = 0; turn < 8; turn++) await new Promise((resolve) => setImmediate(resolve));
};

/** Types raw input as the terminal would deliver it. */
const send = async (text) => {
    process.stdin.emit('data', text);
    await settle();
};

/** The lines of the latest inline frame, and the row its cursor stands on. */
const latest = () => {
    const raw = written.slice(written.lastIndexOf('\x1b[0J') + 4);
    const up = /\x1b\[(\d+)A\r(?:\x1b\[\d+C)?\x1b\[\?25h(?:\x1b\[6n)?$/.exec(raw);
    const lines = raw.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/\r/g, '').split('\n');
    return { lines, cursorRow: lines.length - 1 - (up ? Number(up[1]) : 0) };
};

/** Answers the prompt's position question as if the frame began on the first screen row. */
const answerPosition = async () => send(`\x1b[${latest().cursorRow + 1};1R`);

/** A press of the primary button at a text of the latest frame (the report also carries its release). */
const click = async (text, offset = 0) => {
    const { lines } = latest();
    const row = lines.findIndex((line) => line.includes(text));
    assert.ok(row >= 0, `"${text}" is on the frame:\n${lines.join('\n')}`);
    const column = lines[row].indexOf(text) + offset;
    await send(`\x1b[<0;${column + 1};${row + 1}M\x1b[<0;${column + 1};${row + 1}m`);
    await answerPosition();
};

/** Whether a text stands on the focused row of the latest frame. */
const focused = (text) => latest().lines.some((line) => line.includes(text) && /[❯>]/.test(line));

/** Resolves with a promise's outcome, or `pending` when it has not settled yet. */
const state = async (promise) => {
    await settle();
    return Promise.race([promise, Promise.resolve('pending')]);
};

test('a single-choice picker: a click focuses, a click on the focus confirms, the wheel stops at the ends', async () => {
    const choices = ['Alpha', 'Beta', 'Gamma', 'Closed'].map((label) => ({ value: label, label, disabled: label === 'Closed' }));
    const picked = selectOne(terminal, { frame, question: 'Pick', choices, defaultValue: 'Alpha' });
    await settle();
    assert.match(written, /\x1b\[\?1000h\x1b\[\?1006h/, 'the picker asks for pointer reports');
    assert.match(written, /\x1b\[6n/, 'and where it stands');
    await send('\x1b[<0;1;1M');
    assert.equal(await state(picked), 'pending', 'before the terminal has answered nothing can be hit');
    await answerPosition();
    assert.match(latest().lines.join('\n'), /click focus, again confirm/);

    await click('Gamma');
    assert.ok(focused('Gamma'));
    assert.equal(await state(picked), 'pending', 'one click never confirms');
    await click('Closed');
    assert.ok(focused('Gamma'), 'a disabled choice takes no focus');
    await click('Pick');
    assert.ok(focused('Gamma'), 'neither does the question');
    await send('\x1b[<65;1;1M\x1b[<65;1;1M');
    assert.ok(focused('Gamma'), 'the wheel skips nothing and stops at the end');
    await send('\x1b[<64;1;1M');
    assert.ok(focused('Beta'));
    await send('\x1b[<64;1;1M\x1b[<64;1;1M\x1b[<64;1;1M');
    assert.ok(focused('Alpha'), 'the wheel does not wrap');
    await answerPosition();
    await click('Alpha');
    assert.equal(await picked, 'Alpha', 'a click on the focused default is the choice');
    assert.match(written, /\x1b\[\?1006l\x1b\[\?1000l/, 'tracking ends with the prompt');
});

test('checkbox and toggle lists: a click toggles and only Enter confirms', async () => {
    const many = selectMany(terminal, { frame, question: 'Pick many', choices: ['One', 'Two', 'Three'].map((label) => ({ value: label, label })), initial: ['Two'] });
    await settle();
    await answerPosition();
    await click('Three');
    await click('Two');
    await click('One');
    await click('One');
    assert.equal(await state(many), 'pending');
    await send('\r');
    assert.deepEqual(await many, ['Three']);

    written = '';
    const toggles = toggleList(terminal, {
        frame,
        question: 'Switches',
        toggles: [
            { key: 'first', label: 'First switch', description: 'First explanation' },
            { key: 'second', label: 'Second switch', description: 'Second explanation' },
        ],
        initial: { first: false, second: false },
        effect: () => ['Effect'],
    });
    await settle();
    await answerPosition();
    await click('Second explanation');
    assert.equal(await state(toggles), 'pending');
    await send('\r');
    assert.deepEqual(await toggles, { first: false, second: true });
});

test('a composer places its cursor by pointer, and neither a click nor the wheel submits', async () => {
    const composed = composeRich(terminal, { frame, question: 'Write', initial: 'hello world\nsecond line', attachments: true });
    await settle();
    await answerPosition();
    await click('hello world', 6);
    await send('X');
    await answerPosition();
    await click('second line', 7);
    await send('Y');
    await answerPosition();
    await click('Write');
    await send('\x1b[<64;1;1M');
    assert.equal(await state(composed), 'pending');
    await send('\r');
    assert.equal((await composed).text, 'hello Xworld\nsecond Yline');
});

test('an optional line accepts an empty value and a required one does not', async () => {
    const optional = inputLine(terminal, { frame, question: 'Optional', optional: true });
    await settle();
    await send('\r');
    assert.equal(await optional, '');

    const required = inputLine(terminal, { frame, question: 'Required' });
    await settle();
    await send('\r');
    assert.equal(await state(required), 'pending');
    assert.match(latest().lines.join('\n'), /A value is required/);
    await send('\x1b');
    assert.equal(await required, CANCELLED);
});

test('the terminal form for a website login finishes, without additional fields or with them', async () => {
    const fill = async (form, rows) => {
        for (const [waitFor, input] of rows) {
            for (let turn = 0; turn < 200 && !written.includes(waitFor); turn++) await settle();
            assert.ok(written.includes(waitFor), `the form asks for ${waitFor}`);
            written = '';
            await send(input);
        }
        return await form;
    };
    const plain = walletLoginForm(terminal, { origin: 'https://example.com' });
    assert.deepEqual(await fill(plain, [['Website', '\r'], ['Username', 'me\r'], ['Password', 'secret\r'], ['Label', '\r'], ['Additional login field', '\r']]), { origin: 'https://example.com', username: 'me', password: 'secret' });

    written = '';
    const extended = walletLoginForm(terminal, { origin: 'https://example.com' });
    assert.deepEqual(await fill(extended, [['Website', '\r'], ['Username', 'me\r'], ['Password', 'secret\r'], ['Label', '\r'], ['Additional login field', 'PIN\r'], ['PIN', '1234\r'], ['Additional login field', '\r']]), {
        origin: 'https://example.com',
        username: 'me',
        password: 'secret',
        fields: [{ label: 'PIN', value: '1234' }],
    });
});

/** A screen that keeps the latest frame instead of drawing it. */
const fakeScreen = () => {
    const screen = { lines: [], cursor: undefined, enter() {}, leave() {}, invalidate() {}, draw: (lines, cursor) => Object.assign(screen, { lines, cursor }) };
    return screen;
};

/** A press at a text of a captured frame. */
const pressOn = async (screen, text) => {
    const plain = screen.lines.map((line) => line.replace(/\x1b\[[0-9;]*m/g, ''));
    const row = plain.findLastIndex((line) => line.includes(text) && !line.includes('offered:'));
    assert.ok(row >= 0, `"${text}" is on the frame:\n${plain.join('\n')}`);
    await send(`\x1b[<0;${plain[row].indexOf(text) + 1};${row + 1}M`);
};

test('offered chat answers are selectable however many there are, a draft is never lost, and a failed send stays visible', async () => {
    const choices = Array.from({ length: 12 }, (_, index) => `Option ${index + 1}`);
    const sent = [];
    let asked = 1;
    let failing = false;
    const detail = () => ({
        summary: { name: 'Question', status: 'waiting-for-user', members: ['@Chatter'], awaiting: { sender: '@Chatter', text: `Question ${asked}`, choices }, unread: 0, links: [] },
        messages: [{ sender: '@Chatter', at: '2026-10-31', text: `Question ${asked}`, choices }],
        tasks: [],
    });
    const source = {
        get: async () => detail(),
        read: async () => undefined,
        create: async () => ({ name: 'Question' }),
        send: async (_, text) => {
            if (failing) throw new Error('the disk is full');
            sent.push(text);
            asked++;
            return { commit: 'abc' };
        },
    };
    const screen = fakeScreen();
    const chat = runChatClient(terminal, source, { kind: 'existing', name: 'Question' }, { screen, embedded: true });
    await settle();
    const shown = () => screen.lines.join('\n');
    const pointed = () => screen.lines.find((line) => /[❯>] /.test(line.replace(/\x1b\[[0-9;]*m/g, '')) && line.includes('Option'))?.replace(/\x1b\[[0-9;]*m/g, '');
    assert.ok(screen.cursor, 'the composer shows its cursor');
    assert.equal(pointed(), undefined, 'at first the composer has focus');
    assert.match(shown(), /Option 6/);
    assert.doesNotMatch(shown().replace(/offered:.*/g, ''), /Option 7/, 'a long list is bounded');

    await send('\r');
    assert.deepEqual(sent, [], 'Enter with nothing focused sends nothing');
    await send('\x1b[B');
    assert.match(pointed(), /Option 1\b/);
    assert.equal(screen.cursor, undefined, 'a focused answer is the focus');
    await send('\x1b[A');
    await send('\x1b[A');
    assert.match(pointed(), /Option 11/, 'answers beyond the ninth can be reached');
    await send('\r');
    await settle();
    assert.deepEqual(sent, ['Option 11']);
    await settle();
    assert.equal(pointed(), undefined, 'a new question does not inherit the focus');

    await send('\x1b[B');
    await send('\x1b');
    assert.equal(pointed(), undefined, 'Esc returns to the composer and stays in the chat');
    await send('\x1b[B');
    await send('draft');
    assert.equal(pointed(), undefined, 'typing returns to the composer');
    await pressOn(screen, 'Option 3');
    assert.deepEqual(sent, ['Option 11'], 'with a draft a click sends nothing');
    assert.match(shown(), /Your message stays/);
    await pressOn(screen, 'draft');
    assert.ok(screen.cursor, 'a press in the field places the cursor');
    // The click left the cursor before the draft: delete it forwards.
    await send('\x1b[3~'.repeat(5));
    await pressOn(screen, 'Option 3');
    assert.match(pointed(), /Option 3/);
    assert.deepEqual(sent, ['Option 11'], 'one click only focuses');
    await pressOn(screen, 'Option 3');
    await settle();
    assert.deepEqual(sent, ['Option 11', 'Option 3']);
    await settle();
    await send('2');
    await settle();
    assert.deepEqual(sent.at(-1), 'Option 2', 'the number shortcut remains');
    await settle();

    failing = true;
    await send('\x1b[B');
    await send('\r');
    await settle();
    await settle();
    assert.ok(screen.lines.some((line) => /Not sent: the disk is full/.test(line) && !/Enter send/.test(line)), `a failed send has its own line:\n${shown()}`);
    await send('\x1b');
    await send('\x1b');
    await chat;
});

test('the Book editor: a click places the cursor without moving the text, and a failed save stays visible', async () => {
    const text = Array.from({ length: 60 }, (_, line) => `line ${line}`).join('\n');
    const source = { kind: 'agent', name: 'Writer', path: 'agents/writer.book', text, revision: 'abcdef0123', diagnostics: [], editable: true };
    const screen = fakeScreen();
    const books = {
        read: async () => source,
        save: async () => {
            throw new Error('the disk is full');
        },
    };
    const editor = runBookEditor(terminal, books, { path: source.path }, { screen, embedded: true });
    await settle();
    const before = [...screen.lines];
    const target = before.findIndex((line) => line.includes('line 45'));
    assert.ok(target >= 0);
    assert.notEqual(screen.cursor.row, target, 'the click below moves the cursor somewhere else');
    await pressOn(screen, 'line 45');
    assert.deepEqual(screen.cursor, { row: target, column: 2 });
    assert.deepEqual(screen.lines.slice(target - 3, target + 3), before.slice(target - 3, target + 3), 'the text stays under the pointer');
    await send('X');
    assert.ok(screen.lines[target].includes('Xline 45'), 'typing goes in there');

    await send('\x13');
    await settle();
    assert.ok(screen.lines.some((line) => /Not saved: the disk is full/.test(line) && !/Ctrl\+S/.test(line)), `a failed save has its own line:\n${screen.lines.join('\n')}`);
    await send('\x1b');
    await editor;
});

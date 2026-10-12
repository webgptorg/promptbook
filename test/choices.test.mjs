import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { promptChoice, promptChoices } from '../dist/coder/choices.js';

/** Synthetic terminals exercise the same input parser and renderer as the CLI. */
function streams() {
    const input = new EventEmitter();
    Object.assign(input, { isTTY: true, isRaw: false, setRawMode(value) { this.isRaw = value; }, resume() {}, pause() {} });
    const output = new EventEmitter();
    const screens = [];
    Object.assign(output, { isTTY: true, rows: 12, columns: 70, write(chunk) { screens.push(String(chunk)); return true; } });
    return { input, output, screens, latest: () => screens.at(-1) };
}

/** Yield to asynchronous catalog handlers without relying on elapsed terminal timing. */
const tick = () => new Promise(resolve => setImmediate(resolve));

test('single-choice default requires Enter and arrows skip unavailable options', async () => {
    const view = streams();
    let applied = false;
    const result = promptChoice('Destination', [
        { value: 'current', label: 'Current directory' },
        { value: 'blocked', label: 'Unavailable directory', disabled: true },
        { value: 'new', label: 'New subfolder' },
    ], { ...view, initial: 'current' }).then(value => { applied = true; return value; });
    assert.match(view.latest(), /> Current directory \(default\)/);
    view.input.emit('data', 'new');
    await tick();
    assert.equal(applied, false);
    view.input.emit('data', '\u001b');
    view.input.emit('data', '[B');
    assert.match(view.latest(), /> New subfolder/);
    view.input.emit('data', '\r');
    assert.equal(await result, 'new');
    assert.equal(view.input.isRaw, false);
    assert.equal(view.input.listenerCount('data'), 0);
    assert.equal(view.output.listenerCount('resize'), 0);
});

test('checkbox selection survives catalog actions and supports an explicit empty set', async () => {
    const view = streams();
    const featured = [{ value: 'a', label: 'Featured' }, { value: '@more', label: 'More', action: true }];
    const all = [{ value: 'a', label: 'Featured' }, { value: 'b', label: 'Other' }, { value: '@back', label: 'Featured catalog', action: true }];
    const result = promptChoices('Harnesses (none defers setup)', featured, {
        ...view, onAction: (value, selected) => {
            assert(selected.includes('a'));
            return value === '@more' ? all : featured;
        },
    });
    view.input.emit('data', ' \u001b[F\r');
    await tick();
    view.input.emit('data', '\u001b[H\u001b[B \u001b[F\r');
    await tick();
    assert.match(view.latest(), /\[x\] Featured/);
    assert.match(view.latest(), /2 selected/);
    view.input.emit('data', '\u001b[H\r');
    assert.deepEqual(await result, ['a', 'b']);
    const empty = promptChoices('Choose none or more', [{ value: 'a', label: 'Featured' }], view);
    view.input.emit('data', '\r');
    assert.deepEqual(await empty, []);
});

test('large catalogs scroll in bounded terminals and retain selection through logs and resize', async () => {
    const view = streams();
    view.output.rows = 6; view.output.columns = 32;
    const choices = Array.from({ length: 240 }, (_, index) => ({ value: String(index), label: `Provider ${index}`, description: `Complete details for provider ${index}` }));
    const result = promptChoices('Available harnesses', choices, view);
    view.input.emit('data', '\u001b[F ');
    assert.match(view.latest(), /> \[x\] Provider 239/);
    view.output.write('Background status\u001b[2J must remain separate');
    view.output.rows = 3; view.output.columns = 20; view.output.emit('resize');
    assert.match(view.latest(), /\[x\] Provider 239/);
    assert(view.latest().split('\r\n').length <= 3);
    view.output.rows = 8; view.output.columns = 35; view.output.emit('resize');
    view.input.emit('data', '\u000c');
    assert.match(view.latest(), /Complete details for provider 239/);
    view.input.emit('data', '\u000c\u001b[H\u001b[6~ ');
    view.input.emit('data', '\r');
    assert.deepEqual(await result, ['5', '239']);
});

test('bracketed paste never navigates, toggles or confirms even across chunks', async () => {
    const view = streams();
    let applied = false;
    const result = promptChoices('Pick', [{ value: 'a', label: 'First' }, { value: 'b', label: 'Second' }], view).then(value => { applied = true; return value; });
    view.input.emit('data', '\u001b[20');
    view.input.emit('data', '0~ \u001b[B\r\u0003\u001b[20');
    view.input.emit('data', '1~');
    await tick();
    assert.equal(applied, false);
    assert.match(view.latest(), /> \[ \] First/);
    view.input.emit('data', '\u001b[B \r');
    assert.deepEqual(await result, ['b']);
});

test('pointer focus and checkbox toggles have equivalent keyboard confirmation', async () => {
    const view = streams();
    const choices = [{ value: 'a', label: 'First' }, { value: 'b', label: 'Second' }];
    const single = promptChoice('Pick', choices, view);
    view.input.emit('data', '\u001b[<0;4;3M');
    assert.match(view.latest(), /> Second/);
    view.input.emit('data', '\r');
    assert.equal(await single, 'b');
    const multiple = promptChoices('Pick', choices, view);
    view.input.emit('data', '\u001b[<0;4;3M\u001b[<0;4;3m\r');
    assert.deepEqual(await multiple, ['b']);
});

test('wide Unicode labels fit terminal cells and retain complete heading/default details', async () => {
    const view = streams();
    view.output.columns = 17; view.output.rows = 6;
    const result = promptChoice('选择目录', [
        { value: 'current', label: '当前目录 👨‍👩‍👧‍👦 e\u0301 后续文字' },
        { value: 'new', label: '新目录' },
    ], { ...view, heading: 'Promptbook 1.2.3', initial: 'current' });
    const screen = view.latest();
    assert.match(screen, /> 当前目录 👨‍👩‍👧‍👦 e\u0301…/);
    assert.equal(screen.split('\r\n').length, 5);
    assert.match(screen.split('\r\n')[1], /👨‍👩‍👧‍👦/);
    view.output.columns = 40; view.output.rows = 12; view.output.emit('resize');
    view.input.emit('data', '\u000c');
    assert.match(view.latest(), /Promptbook 1\.2\.3/);
    assert.match(view.latest(), /Default option; Enter confirms it/);
    assert.match(view.latest(), /后续文字/);
    view.input.emit('data', '\u000c\r');
    assert.equal(await result, 'current');
});

test('cancellation restores surfaces and an unfinished catalog action cannot redraw after closing', async () => {
    const view = streams();
    const originalWrite = view.output.write;
    const controller = new AbortController();
    let release;
    const result = promptChoices('Pick', [{ value: '@more', label: 'More', action: true }], {
        ...view, signal: controller.signal, onAction: () => new Promise(resolve => { release = resolve; }),
    });
    view.input.emit('data', '\r');
    controller.abort();
    await assert.rejects(result, { name: 'AbortError' });
    assert.equal(view.input.isRaw, false);
    assert.equal(view.output.write, originalWrite);
    assert.match(view.latest(), /\u001b\[\?25h/);
    const count = view.screens.length;
    release([{ value: 'late', label: 'Late option' }]);
    await tick();
    assert.equal(view.screens.length, count);
    const escaped = promptChoice('Pick', [{ value: 'yes', label: 'Yes' }], view);
    view.input.emit('data', '\u001b');
    await assert.rejects(escaped, { name: 'AbortError' });
});

test('failed catalog navigation leaves current options and checkbox selections intact', async () => {
    const view = streams();
    const result = promptChoices('Pick', [{ value: 'a', label: 'First' }, { value: '@more', label: 'More', action: true }], {
        ...view, onAction: () => { throw new Error('Catalog unavailable'); },
    });
    view.input.emit('data', ' \u001b[F\r');
    await tick();
    assert.match(view.latest(), /Catalog unavailable/);
    assert.match(view.latest(), /\[x\] First/);
    view.input.emit('data', '\u001b[H\r');
    assert.deepEqual(await result, ['a']);
});

test('noninteractive and malformed choice prompts fail without opening a terminal', async () => {
    const view = streams();
    view.input.isTTY = false;
    await assert.rejects(promptChoice('Pick', [{ value: 'a', label: 'First' }], view), /interactive terminal/);
    await assert.rejects(promptChoice('Pick', [{ value: 'a', label: 'First' }, { value: 'a', label: 'Duplicate' }], view), /unique/);
    assert.deepEqual(view.screens, []);
});

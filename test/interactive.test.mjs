import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { TextComposer, promptText } from '../dist/coder/interactive.js';
import { createTerminal } from '../dist/coder/terminal.js';
import { installedEngineVersion } from '../dist/coder/version.js';
import { readFile } from 'node:fs/promises';

/** Editable terminal fixtures never capture or alter a user's real terminal. */
function streams() {
    const input = new EventEmitter();
    Object.assign(input, { isTTY: true, isRaw: false, setRawMode(value) { this.isRaw = value; }, resume() {}, pause() {} });
    const output = new EventEmitter();
    let printed = '';
    Object.assign(output, { isTTY: true, rows: 12, columns: 64, write(chunk) { printed += chunk; return true; } });
    return { input, output, text: () => printed, clear() { printed = ''; } };
}

test('composer safely edits pasted multiline drafts and Unicode with complete keyboard controls', () => {
    const composer = new TextComposer('first');
    composer.insert('\r\nsecond 😀');
    assert.equal(composer.state().text, 'first\nsecond 😀');
    assert.equal(composer.key({ name: 'return' }), undefined);
    composer.insert('last');
    composer.key({ name: 'home' });
    composer.insert('> ');
    composer.key({ name: 'up' }, 80);
    composer.key({ name: 'end' });
    composer.key({ name: 'backspace' });
    assert.equal(composer.state().text, 'first\nsecond \n> last');
    assert.equal(composer.key({ name: 's', ctrl: true }), 'submit');
    assert.equal(composer.key({ name: 'escape' }), 'cancel');
    composer.point(0, 2, 8);
    composer.insert('!');
    assert.match(composer.state().text, /^fi!rst/);
});

test('terminal paste never submits, output/resize preserve drafts, and validation preserves caret editing', async () => {
    const view = streams();
    let submitted = false;
    const value = promptText('Project intent', { ...view, validate: text => text.includes('fixed') ? undefined : 'Add fixed before submitting.' }).then(text => { submitted = true; return text; });
    view.input.emit('data', '\u001b');
    view.input.emit('data', '[200~hello\n');
    view.input.emit('data', 'PXS\u001b[20');
    view.input.emit('data', '1~');
    view.output.write('background check output');
    view.output.columns = 35;
    view.output.emit('resize');
    view.input.emit('data', '\u0013');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(submitted, false);
    assert.match(view.text(), /Add fixed/);
    view.input.emit('data', '\u001b[Dfixed\u0013');
    assert.equal(await value, 'hello\nPXfixedS');
    assert.equal(view.input.isRaw, false);
    assert.equal(view.output.listenerCount('resize'), 0);
    assert.match(view.text(), /\u001b\[\?2004l/);
});

test('runtime dashboard uses bounded stable regions and the invoked installation version across resize', async () => {
    const view = streams();
    const terminal = createTerminal(true, () => {}, '/fixture', view);
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    const version = await installedEngineVersion();
    assert.equal(version, manifest.version);
    terminal.setSnapshot({ engineVersion: version, project: '/fixture', mode: 'interactive', status: 'watching', tasks: [], requests: [], statistics: { completed: 2, failed: 1 } });
    assert.match(view.text(), new RegExp('Promptbook ' + version.replace(/[.]/g, '\\.')));
    assert.match(view.text(), /Task: idle/);
    view.clear();
    terminal.output('check output\n');
    assert.match(view.text(), /\u001b\[H\u001b\[2J/);
    assert.match(view.text(), /Activity/);
    view.output.rows = 5; view.output.columns = 32; view.clear();
    view.output.emit('resize');
    assert(view.text().split('\r\n').length <= 5);
    terminal.close();
    assert.equal(view.input.isRaw, false);
    assert.match(view.text(), /\u001b\[\?25h/);
});

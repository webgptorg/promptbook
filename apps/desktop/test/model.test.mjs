import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAGES, terminalArguments, terminalSize } from '../model.cjs';

test('embedded terminals invoke only the real CLI, with literal project paths and every named page', () => {
    const root = "C:\\Users\\Pavol\\ptbk\\project\\first & project's";
    for (const page of PAGES) {
        assert.deepEqual(terminalArguments('dashboard', root, page), ['dashboard', '--path', root, '--view', page]);
    }
    assert.deepEqual(terminalArguments('init', undefined), ['init', '--no-dashboard']);
    assert.deepEqual(terminalArguments('setup'), ['init', '--with-app']);
    assert.deepEqual(terminalArguments('global'), ['dashboard', '--global']);
    assert.deepEqual(terminalArguments('keep-awake-helper', root), ['keep-awake', '--install-helper', '--path', root]);
    assert.throws(() => terminalArguments('keep-awake-helper', undefined));
    assert.throws(() => terminalArguments('shell', root));
    assert.throws(() => terminalArguments('dashboard', root, '--force'));
    assert.throws(() => terminalArguments('dashboard', 'bad\0path'));
});

test('native terminal dimensions are bounded and robust to invalid input', () => {
    assert.deepEqual(terminalSize(110, 40), { cols: 110, rows: 40 });
    assert.deepEqual(terminalSize(Infinity, -900), { cols: 500, rows: 10 });
    assert.deepEqual(terminalSize('not a number', undefined), { cols: 80, rows: 24 });
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTIONS, PAGES, localDashboardUrl, terminalArguments, dashboardPage, terminalSize } from '../model.cjs';

test('dashboard attachments reject remote, credential-bearing and non-root addresses', () => {
    assert.equal(localDashboardUrl('http://127.0.0.1:3012/'), 'http://127.0.0.1:3012/');
    for (const value of ['https://127.0.0.1:3012/', 'http://localhost:3012/', 'http://127.0.0.1.evil.test:3012/', 'http://user:password@127.0.0.1:3012/', 'file:///etc/passwd', 'http://127.0.0.1:3012/api/state', 'http://127.0.0.1:3012/?token=secret']) assert.throws(() => localDashboardUrl(value));
});

test('embedded terminals invoke only the real CLI, with literal project paths and every named page', () => {
    const root = "C:\\Users\\Pavol\\ptbk\\project\\first & project's";
    for (const page of PAGES) {
        assert.deepEqual(terminalArguments('dashboard', root, page), ['dashboard', '--path', root, '--view', page]);
        assert.equal(dashboardPage(`http://127.0.0.1:3012/#/${page}`), page);
    }
    assert.deepEqual(terminalArguments('init', undefined), ['init', '--no-dashboard']);
    assert.deepEqual(terminalArguments('global'), ['dashboard', '--global']);
    assert.throws(() => terminalArguments('shell', root));
    assert.throws(() => terminalArguments('dashboard', root, '--force'));
    assert.throws(() => terminalArguments('dashboard', 'bad\0path'));
    assert.equal(ACTIONS.has('delete-project-files'), false);
});

test('native terminal dimensions are bounded and robust to invalid input', () => {
    assert.deepEqual(terminalSize(110, 40), { cols: 110, rows: 40 });
    assert.deepEqual(terminalSize(Infinity, -900), { cols: 500, rows: 10 });
    assert.deepEqual(terminalSize('not a number', undefined), { cols: 80, rows: 24 });
});
